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

const dummyRoom: Room = {
  roomCode: 'ABC123',
  csvFileName: 'players.csv',
  players: [
    { id: 1, name: 'Alice', isHost: true },
    { id: 2, name: 'Bob', isHost: false },
    { id: 3, name: 'Charlie', isHost: false },
  ],
}

export default function GameScreen() {
  const [roomData, setRoomData] = useState<Room>(dummyRoom)
  const navigate = useNavigate()

  useEffect(() => {
    // TODO: fetch room data from backend
    setRoomData(dummyRoom)
  }, [])

  const handleLeaveRoom = () => {
    console.log('Deleting room:', roomData.roomCode)
    // TODO: send delete room request to backend
    navigate('/')
  }

  const handleStartGame = () => {
    console.log('Starting game in room:', roomData.roomCode)
    // TODO: handle game start logic
  }

  return (
    <div className="game-screen">
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
    </div>
  )
}
