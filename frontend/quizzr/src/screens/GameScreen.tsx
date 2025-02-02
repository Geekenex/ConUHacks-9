import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState<boolean>(false)
  const [sessionStarted, setSessionStarted] = useState<boolean>(false)
  const [quizReady, setQuizReady] = useState<boolean>(false)
  const [questionData, setQuestionData] = useState<QuestionData | null>(null)
  const [hasAnswered, setHasAnswered] = useState<boolean>(false)
  const [scoreboard, setScoreboard] = useState<Scoreboard>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [username, setUsername] = useState<string>("")
  const [usernameSubmitted, setUsernameSubmitted] = useState<boolean>(false)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [userList, setUserList] = useState<string[]>([])
  const [joinError, setJoinError] = useState<string>("")
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  // The UI phases:
  // "answer" -> "explanation" -> "leaderboard"
  const [displayPhase, setDisplayPhase] =
    useState<"answer" | "explanation" | "leaderboard">("answer")

  // For the full-screen image modal
  const [imageModalOpen, setImageModalOpen] = useState(false)

  // Music reference
  const audioRef = useRef<HTMLAudioElement>(null)

  // Times
  const TIME_LIMIT = 20
  const ANSWER_PHASE = 15
  const answerTimeLeft = Math.max(timeLeft - (TIME_LIMIT - ANSWER_PHASE), 0)

  // Connect to the WebSocket
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
        if (
          msg.message === "Username already taken" ||
          msg.message === "Don't use naughty words 😾😾, pick a better name"
        ) {
          setJoinError(msg.message)
        } else {
          console.error(msg.message)
        }
      } else if (msg.type === 'session_started') {
        setSessionStarted(true)
      } else if (msg.type === 'question') {
        // New question: reset state
        setDisplayPhase("answer")
        setGeneratedImage(null)
        setQuestionData(msg.data)
        setTimeLeft(TIME_LIMIT)
        setHasAnswered(false)
        setSelectedAnswer(null)
        setCorrectAnswer(null)
        setImageModalOpen(false)
      } else if (msg.type === 'result') {
        if (msg.data) {
          setHasAnswered(true)
        }
      } else if (msg.type === 'scoreboard') {
        if (msg.data) {
          setScoreboard(msg.data)
        }
      } else if (msg.type === 'game_over') {
        setGameOver(true)
        setImageModalOpen(false)
      } else if (msg.type === 'question_result') {
        // Show Explanation first, then Leaderboard
        setCorrectAnswer(msg.data.correct_answer)
        setDisplayPhase("explanation")
        // After 5 seconds, switch to the leaderboard
        setTimeout(() => {
          setDisplayPhase("leaderboard")
        }, 15000)
      } else if (msg.type === 'user_list') {
        if (msg.data) {
          setUserList(msg.data)
        }
      } else if (msg.type === 'generated_image') {
        if (msg.data && msg.data.base64) {
          setGeneratedImage(msg.data.base64)
        } else {
          console.error('Invalid generated_image message data:', msg.data)
          setGeneratedImage(null)
        }
      }
    }
    socket.onclose = () => setConnected(false)
    setWs(socket)
    return () => socket.close()
  }, [roomCode, username])

  // Only run the timer during "answer" phase
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

  // If we leave "explanation" phase, close the modal
  useEffect(() => {
    if (displayPhase !== "explanation") {
      setImageModalOpen(false)
    }
  }, [displayPhase])

  // Music logic
  useEffect(() => {
    if (audioRef.current) {
      if (sessionStarted && !gameOver) {
        audioRef.current.play().catch(err => console.log(err))
      } else {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [sessionStarted, gameOver])

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
      {/* Background Music */}
      <audio ref={audioRef} src="/music.mp3" loop />

      <p className="app-game-title">QuizzR</p>
      {roomCode && <p className="room-code">Room Code: {roomCode}</p>}

      {/* No Username Yet */}
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
        // Lobby Screen
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
        // Game Over Screen
        <div className="trivia-container">
          <h2>Game Over</h2>
          <div className="scoreboard-container">
            <h3>Final Scoreboard</h3>
            <div className="podium-container">
              {sortedScoreboard.slice(0, 3).map(([uname, score], index) => (
                <div key={uname} className={`podium podium-${index + 1}`}>
                  <p className="podium-rank">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </p>
                  <p className="podium-user">
                    {uname} {uname === username ? "(YOU)" : ""}
                  </p>
                  <p className="podium-score">{score} pts</p>
                </div>
              ))}
            </div>
            <ul>
              {sortedScoreboard.slice(3).map(([uname, score]) => (
                <li key={uname}>
                  {uname} {uname === username ? "(YOU)" : ""}: {score}
                </li>
              ))}
            </ul>
          </div>
          <CustomButton style={{ fontSize: '1.5rem', marginTop: '1rem' }} onClick={() => navigate('/')}>
            Exit
          </CustomButton>
        </div>
      ) : (
        // Game in progress
        <div className="trivia-container">
          <header className="app-header">
            <p>Trivia Game</p>
          </header>

          {/* ANSWER PHASE */}
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

          {/* EXPLANATION PHASE */}
          {displayPhase === "explanation" && (
            <>
              <div className="explanation-section">
                <div className="explanation-label">Explanation</div>
                {generatedImage && (
                  <div className="generated-image-container">
                    {/* Clickable image to open modal */}
                    <img
                      src={generatedImage}
                      alt="Visualization"
                      className="generated-image"
                      onError={() => setGeneratedImage(null)}
                      onClick={() => setImageModalOpen(true)}
                      style={{ cursor: 'pointer' }}
                    />
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

          {/* LEADERBOARD PHASE */}
          {displayPhase === "leaderboard" && (
            <LeaderboardPopup scoreboard={scoreboard} />
          )}

          <div className="user-info">
            <strong>Your Name:</strong> {username}
          </div>
        </div>
      )}

      {/* FULL-SCREEN IMAGE MODAL */}
      {imageModalOpen && generatedImage && (
        <div className="image-modal" onClick={() => setImageModalOpen(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setImageModalOpen(false)}>
              ✕
            </button>
            <img src={generatedImage} alt="Full-size Explanation" />
          </div>
        </div>
      )}
    </div>
  )
}
