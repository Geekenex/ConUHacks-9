// GameScreen.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomButton from '../components/CustomButton'
import './GameScreen.css'

type Player = {
  id: number
  name: string
  isHost: boolean
}

type Room = {
  roomCode: string
  players: Player[]
  csvFileName: string
}

type Question = {
  question: string
  answers: string[]
  timeLimit: number
}

const dummyRoom: Room = {
  roomCode: 'ABC123',
  csvFileName: 'players.csv',
  players: [
    { id: 1, name: 'Alice', isHost: true },
    { id: 2, name: 'Bob', isHost: false },
    { id: 3, name: 'Charlie', isHost: false },
  ],
}

const dummyQuestion: Question = {
  question: "What is the capital of France?",
  answers: ["Paris", "London", "Berlin", "Madrid"],
  timeLimit: 15,
}

export default function GameScreen() {
  const [roomData, setRoomData] = useState<Room>(dummyRoom)
  const [gameStarted, setGameStarted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [questionData, setQuestionData] = useState<Question>(dummyQuestion)
  const [timeLeft, setTimeLeft] = useState(dummyQuestion.timeLimit)
  const navigate = useNavigate()

  useEffect(() => {
    // TODO: fetch room data from backend
    setRoomData(dummyRoom)
  }, [])

  useEffect(() => {
    if (gameStarted) {
      // TODO: open WebSocket connection to receive trivia questions
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [gameStarted])

  const handleLeaveRoom = () => {
    console.log('Deleting room:', roomData.roomCode)
    // TODO: send delete room request to backend
    navigate('/')
  }

  const handleStartGame = () => {
    console.log('Starting game in room:', roomData.roomCode)
    // TODO: open WebSocket connection to server here
    setGameStarted(true)
    setTimeLeft(dummyQuestion.timeLimit) // reset timer for new question
  }

  const handleAnswerClick = (index: number) => {
    setSelectedAnswer(index)
    console.log("Selected answer:", questionData.answers[index])
    // TODO: send selected answer to server via WebSocket
  }

  return (
    <>
      <p className="app-game-title">QuizzR</p>
      <div className="game-screen">
        {gameStarted ? (
          <div className="trivia-container">
            <header className="app-header">
              <p>Trivia Game</p>
            </header>
            <div className="timer-bar">
              <div
                className="time-progress"
                style={{ width: `${(timeLeft / questionData.timeLimit) * 100}%` }}
              ></div>
            </div>
            <div className="question-section">
              <h2 className="question-text">{questionData.question}</h2>
            </div>
            <div className="answers-section">
              {questionData.answers.map((answer, index) => (
                <div
                  key={index}
                  className={`answer-card ${selectedAnswer === index ? 'selected' : ''}`}
                  onClick={() => handleAnswerClick(index)}
                >
                  {answer}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="header">
              <h2>Room {roomData.roomCode}</h2>
              <p className="csv-file">CSV File: {roomData.csvFileName}</p>
            </div>
            <div className="content">
              <div className="controls">
                {roomData.players.find((player) => player.isHost) && (
                  <CustomButton onClick={handleStartGame}>Start Game</CustomButton>
                )}
                <CustomButton onClick={handleLeaveRoom}>Delete Room</CustomButton>
              </div>
              <div className="player-box">
                <ul className="player-list">
                  {roomData.players.map((player) => (
                    <li key={player.id}>
                      {player.name} {player.isHost ? '(Host)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
