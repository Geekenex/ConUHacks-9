import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import CustomButton from '../components/CustomButton'
import './GameScreen.css'

interface QuestionData {
  question: string
  options: string[]
  timeLimit: number
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
  const [currentQuestionScore, setCurrentQuestionScore] = useState<number | null>(null)
  const [totalScore, setTotalScore] = useState<number>(0)
  const [scoreboard, setScoreboard] = useState<Scoreboard>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [user] = useState<string>('user' + Math.floor(Math.random() * 1000))

  const TIME_LIMIT = 18;
  
  useEffect(() => {
    if (!roomCode) return
    const socket = new WebSocket(`ws://localhost:8000/ws/${roomCode}`)
    socket.onopen = () => {
      setConnected(true)
      // Join the room using the provided room code and user
      socket.send(JSON.stringify({ action: 'join', user }))
    }
    socket.onmessage = (event: MessageEvent) => {
      const msg: MessageData = JSON.parse(event.data)
      if (msg.type === 'session_started') {
        setSessionStarted(true)
      } else if (msg.type === 'question') {
        setQuestionData(msg.data)
        setTimeLeft(TIME_LIMIT)
        setHasAnswered(false)
        setCurrentQuestionScore(null)
      } else if (msg.type === 'result') {
        if (msg.data) {
          setCurrentQuestionScore(msg.data.result)
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
  }, [roomCode, user])

  useEffect(() => {
    if (sessionStarted && questionData) {
      setTimeLeft(TIME_LIMIT);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [sessionStarted, questionData]);
  
  

  const sendAnswer = (answer: string) => {
    if (ws && connected && !hasAnswered) {
      ws.send(JSON.stringify({ action: 'answer', user, answer }))
    }
  }

  const startSession = () => {
    if (ws && connected && !sessionStarted) {
      ws.send(JSON.stringify({ action: 'start', user }))
    }
  }

  const sortedScoreboard = Object.entries(scoreboard).sort((a, b) => b[1] - a[1])

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
              width: `${(timeLeft / (questionData?.timeLimit || TIME_LIMIT)) * 100}%`,
            }}
          ></div>
        </div>

          <div className="question-section">
            <h2 className="question-text">
              {questionData ? questionData.question : 'Waiting for question...'}
            </h2>
          </div>
          <div className="answers-section">
            {questionData &&
              questionData.options.map((opt, index) => (
                <div
                  key={index}
                  className={`answer-card ${hasAnswered ? '' : ''}`}
                  onClick={() => sendAnswer(opt)}
                >
                  {opt}
                </div>
              ))}
          </div>
          <div style={{ marginTop: '20px' }}>
            <h3>Scoreboard</h3>
            <ul>
              {sortedScoreboard.map(([username, score]) => (
                <li key={username}>
                  {username}: {score}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: '20px' }}>
            <strong>Your User:</strong> {user} | <strong>Total Score:</strong>{' '}
            {totalScore}
          </div>
          {currentQuestionScore !== null && (
            <div style={{ marginTop: '10px' }}>
              <strong>Current Question Score:</strong> {currentQuestionScore}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
