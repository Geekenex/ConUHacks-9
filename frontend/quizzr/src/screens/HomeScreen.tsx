import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomButton from '../components/CustomButton'
import CustomInput from '../components/CustomInput'
import './HomeScreen.css'

export default function HomeScreen() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')

  const handleJoinRoom = () => {
    console.log('Joining room:', roomCode)
    navigate(`/game/${roomCode}`)
  }

  return (
    <div>
      <div className="section">
        <h2>Join a room</h2>
        <CustomInput
          placeholder="Enter room code..."
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
        <CustomButton onClick={handleJoinRoom}>Join</CustomButton>
      </div>

      <div className="section">
        <h2>Create a room</h2>
        <CustomButton onClick={() => navigate('/create')}>
          Create
        </CustomButton>
      </div>
    </div>
  )
}
