import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import CustomButton from '../components/CustomButton'
import LeaderboardPopup from '../components/LeaderboardPopup'
import './GameScreen.css'

interface QuestionData {
  question: string
  options: string[]
  correctAnswer?: string
}

interface Scoreboard {
  [user: string]: number
}

interface MessageData {
  type: string
  data?: any
  message?: string
}

export default function GameScreen() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState<boolean>(false)
  const [sessionStarted, setSessionStarted] = useState<boolean>(false)
  const [quizReady, setQuizReady] = useState<boolean>(false)
  const [questionData, setQuestionData] = useState<QuestionData | null>(null)
  const [hasAnswered, setHasAnswered] = useState<boolean>(false)
  const [totalScore, setTotalScore] = useState<number>(0)
  const [scoreboard, setScoreboard] = useState<Scoreboard>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [username, setUsername] = useState<string>("")
  const [usernameSubmitted, setUsernameSubmitted] = useState<boolean>(false)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [userList, setUserList] = useState<string[]>([])
  const [joinError, setJoinError] = useState<string>("")
  // New state for the generated image (base64 string)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  // New state for controlling the display phase:
  // "answer": waiting for an answer (15 sec)
  // "leaderboard": show leaderboard for 5 sec
  // "explanation": show the explanation view (image + answer choices with red/green)
  const [displayPhase, setDisplayPhase] = useState<"answer" | "leaderboard" | "explanation">("answer")

  const TIME_LIMIT = 20   // total question time (15 sec answer + 5 sec reveal)
  const ANSWER_PHASE = 15 // time allowed to answer

  // This represents the remaining answer phase time (for the timer bar)
  const answerTimeLeft = Math.max(timeLeft - (TIME_LIMIT - ANSWER_PHASE), 0)

  useEffect(() => {
    if (!roomCode || !username) return
    const socket = new WebSocket(
      `${window.location.href.includes("localhost") ? "ws://localhost:8000" : "wss://conuhacks-9.up.railway.app"}/ws/${roomCode}`
    )
    socket.onopen = () => {
      setConnected(true)
      socket.send(JSON.stringify({ action: 'join', user: username }))
    }
    socket.onmessage = (event: MessageEvent) => {
      const msg: MessageData = JSON.parse(event.data)
      if (msg.type === 'join_success') {
        setUsernameSubmitted(true)
        setJoinError("")
      } else if (msg.type === 'quiz_ready') {
        setQuizReady(true)
      } else if (msg.type === 'error') {
        if (msg.message === "Username already taken") {
          setJoinError(msg.message)
        } else {
          console.error(msg.message)
        }
      } else if (msg.type === 'session_started') {
        setSessionStarted(true)
      } else if (msg.type === 'question') {
        // New question: reset phase and clear previous states
        setDisplayPhase("answer")
        setGeneratedImage(null)
        setQuestionData(msg.data)
        setTimeLeft(TIME_LIMIT)
        setHasAnswered(false)
        setSelectedAnswer(null)
        setCorrectAnswer(null)
      } else if (msg.type === 'result') {
        if (msg.data) {
          setTotalScore(msg.data.total)
          setHasAnswered(true)
        }
      } else if (msg.type === 'scoreboard') {
        if (msg.data) {
          setScoreboard(msg.data)
        }
      } else if (msg.type === 'game_over') {
        setGameOver(true)
      } else if (msg.type === 'question_result') {
        // When the answer phase is over, the server sends the correct answer.
        setCorrectAnswer(msg.data.correct_answer)
        // First, switch to showing the leaderboard...
        setDisplayPhase("leaderboard")
        // ...and after 5 seconds, switch to the explanation view.
        setTimeout(() => {
          setDisplayPhase("explanation")
        }, 5000)
      } else if (msg.type === 'user_list') {
        if (msg.data) {
          setUserList(msg.data)
        }
      } else if (msg.type === 'generated_image') {
        setGeneratedImage(msg.data.base64)
      }
    }
    socket.onclose = () => setConnected(false)
    setWs(socket)
    return () => socket.close()
  }, [roomCode, username])

  // Only run the answer-phase timer when in answer phase
  useEffect(() => {
    if (sessionStarted && questionData && !gameOver && displayPhase === "answer") {
      setTimeLeft(TIME_LIMIT)
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [sessionStarted, questionData, gameOver, displayPhase])

  const handleUsernameSubmit = () => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement
    if (input.value) {
      setUsername(input.value)
    }
  }

  const sendAnswer = (answer: string) => {
    if (ws && connected && !hasAnswered && timeLeft > (TIME_LIMIT - ANSWER_PHASE)) {
      setSelectedAnswer(answer)
      setHasAnswered(true)
      ws.send(JSON.stringify({ action: 'answer', user: username, answer }))
    }
  }

  const startSession = () => {
    if (ws && connected && !sessionStarted) {
      ws.send(JSON.stringify({ action: 'start', user: username }))
    }
  }

  const sortedScoreboard = Object.entries(scoreboard).sort(([, a], [, b]) => b - a)

  return (
    <div className="game-screen">
      <p className="app-game-title">QuizzR</p>
      {roomCode && <p className="room-code">Room Code: {roomCode}</p>}

      {!usernameSubmitted ? (
        <div className="trivia-container">
          <h2>Enter your username</h2>
          <input
            className="username-input"
            type="text"
            placeholder="Username"
            maxLength={20}
          />
          <CustomButton onClick={handleUsernameSubmit}>Submit</CustomButton>
          {joinError && <div className="error-message shake">{joinError}</div>}
        </div>
      ) : !sessionStarted ? (
        <div className="trivia-container">
          <h2>Waiting for session to start...</h2>
          {!quizReady && <p>Creating quiz...</p>}
          {userList.length > 0 && (
            <div className="user-list">
              <p>Users in Lobby</p>
              <ul>
                {userList.map((user) => (
                  <li key={user}>{user}</li>
                ))}
              </ul>
            </div>
          )}
          {quizReady && <CustomButton onClick={startSession}>Everybody's In</CustomButton>}
        </div>
      ) : gameOver ? (
        <div className="trivia-container">
          <h2>Game Over</h2>
          <div style={{ marginTop: '20px' }}>
            <h3>Final Scoreboard</h3>
            <ul>
              {sortedScoreboard.map(([uname, score]) => (
                <li key={uname}>
                  {uname}: {score}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: '20px' }}>
            <strong>Your User:</strong> {username} | <strong>Total Score:</strong> {totalScore}
          </div>
        </div>
      ) : (
        <div className="trivia-container">
          <header className="app-header">
            <p>Trivia Game</p>
          </header>

          {displayPhase === "answer" && (
            <>
              <div className="timer-bar">
                <div
                  className="time-progress"
                  style={{
                    width: `${(answerTimeLeft / ANSWER_PHASE) * 100}%`,
                  }}
                ></div>
              </div>
              {questionData && (
                <>
                  <div className="question-section">
                    <h2 className="question-text">{questionData.question}</h2>
                  </div>
                  <div className="answers-section">
                    {questionData.options.map((opt, index) => {
                      let cardClass = 'answer-card'
                      if (selectedAnswer === opt) {
                        cardClass += ' selected'
                      }
                      return (
                        <div
                          key={index}
                          className={cardClass}
                          onClick={() => {
                            if (!hasAnswered) sendAnswer(opt)
                          }}
                        >
                          {opt}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {displayPhase === "leaderboard" && (
            // During this phase, show the leaderboard popup
            <LeaderboardPopup scoreboard={scoreboard} />
          )}

          {displayPhase === "explanation" && (
            <>
              <div className="explanation-section">
                <div className="explanation-label">Explanation</div>
                {generatedImage && (
                  <div className="generated-image-container">
                    <img src={generatedImage} alt="Visualization" className="generated-image" />
                  </div>
                )}
              </div>
              {questionData && (
                <div className="answers-section">
                  {questionData.options.map((opt, index) => {
                    let cardClass = 'answer-card'
                    if (opt === correctAnswer) {
                      cardClass += ' correct'
                    } else if (selectedAnswer === opt) {
                      cardClass += ' wrong'
                    }
                    return (
                      <div key={index} className={cardClass}>
                        {opt}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: '20px' }}>
            <strong>Your Name:</strong> {username}
          </div>
        </div>
      )}
    </div>
  )
}
