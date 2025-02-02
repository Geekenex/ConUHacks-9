import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import CustomButton from '../components/CustomButton'
import Leaderboard from '../components/Leaderboard'
import './GameScreen.css'

interface QuestionData {
  question: string
  options: string[]
  correctAnswer: string
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
  const [questionData, setQuestionData] = useState<QuestionData | null>(null)
  const [hasAnswered, setHasAnswered] = useState<boolean>(false)
  const [totalScore, setTotalScore] = useState<number>(0)
  const [scoreboard, setScoreboard] = useState<Scoreboard>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [username, setUsername] = useState<string>("")
  const [usernameSubmitted, setUsernameSubmitted] = useState<boolean>(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [questionResult, setQuestionResult] = useState<number | null>(null)


  const TIME_LIMIT = 20
  const ANSWER_PHASE = 15

  const revealPhase = timeLeft <= (TIME_LIMIT - ANSWER_PHASE);

  const answerTimeLeft = Math.max(timeLeft - (TIME_LIMIT - ANSWER_PHASE), 0);


  useEffect(() => {
    if (!roomCode || !username) return
    const socket = new WebSocket(`ws://localhost:8000/ws/${roomCode}`)
    socket.onopen = () => {
      setConnected(true)
      socket.send(JSON.stringify({ action: 'join', user: username }))
    }
    socket.onmessage = (event: MessageEvent) => {
      const msg: MessageData = JSON.parse(event.data)
      if (msg.type === 'session_started') {
        setSessionStarted(true)
      } else if (msg.type === 'question') {
        setQuestionData(msg.data)
        setTimeLeft(TIME_LIMIT)
        setHasAnswered(false)
        setSelectedAnswer(null)
        setQuestionResult(null)
      } else if (msg.type === 'result') {
        if (msg.data) {
          setQuestionResult(msg.data.result)
          setTotalScore(msg.data.total)
          setHasAnswered(true)
        }
      } else if (msg.type === 'scoreboard') {
        if (msg.data) {
          setScoreboard(msg.data)
        }
      } else if (msg.type === 'error') {
        console.error(msg.message)
      }
    }
    
    
    socket.onclose = () => setConnected(false)
    setWs(socket)
    return () => socket.close()
  }, [roomCode, username])

  useEffect(() => {
    if (sessionStarted && questionData) {
      setTimeLeft(TIME_LIMIT)
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [sessionStarted, questionData])

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

  if (!usernameSubmitted) {
    return (
      <div className="game-screen">
        <p className="app-game-title">QuizzR</p>
        <div className="trivia-container">
          <h2>Enter your username</h2>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
          />
          <CustomButton onClick={() => {
            if (username.trim() !== "") {
              setUsernameSubmitted(true)
            }
          }}>
            Submit
          </CustomButton>
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen">
      <p className="app-game-title">QuizzR</p>
      {!sessionStarted ? (
        <div className="trivia-container">
          <h2>Waiting for session to start...</h2>
          <CustomButton onClick={startSession}>Everybody's In</CustomButton>
        </div>
      ) : (
        <div className="trivia-container">
          <header className="app-header">
            <p>Trivia Game</p>
          </header>
          <div className="timer-bar">
            <div
              className="time-progress"
              style={{
                width: `${(answerTimeLeft / ANSWER_PHASE) * 100}%`
              }}
            ></div>
          </div>
          {questionData && (
            <>
              <div className="question-section">
                <h2 className="question-text">{questionData.question}</h2>
              </div>
              <div className="answers-section">
                {questionData &&
                  questionData.options.map((opt, index) => {
                    let cardClass = "answer-card"
                    if (selectedAnswer === opt) {
                      if (hasAnswered && revealPhase) {
                        cardClass += (questionResult !== null && questionResult > 0) ? " correct" : " wrong"
                      } else {
                        cardClass += " selected"
                      }
                    }
                    return (
                      <div
                        key={index}
                        className={cardClass}
                        onClick={() => {
                          if (!hasAnswered && !revealPhase) {
                            sendAnswer(opt)
                          }
                        }}
                      >
                        {opt}
                      </div>
                    )
                  })}
              </div>



              {timeLeft <= (TIME_LIMIT - ANSWER_PHASE) && (
                <Leaderboard scoreboard={scoreboard} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
