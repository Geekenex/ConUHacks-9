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
    <div className="home-screen">
      <div className="decorative-container">
        <div className="decorative-shape shape-x" style={{ top: '10%', left: '15%' }}></div>
        <div className="decorative-shape shape-x" style={{ bottom: '25%', right: '30%' }}></div>
        <svg
          className="decorative-shape shape-triangle"
          style={{ top: '30%', right: '10%' }}
          viewBox="0 0 40 40"
        >
          <polygon points="20,5 35,35 5,35" fill="none" stroke="#3c3c3c" strokeWidth="2" />
        </svg>
        <svg
          className="decorative-shape shape-triangle"
          style={{ bottom: '40%', left: '20%' }}
          viewBox="0 0 40 40"
        >
          <polygon points="20,5 35,35 5,35" fill="none" stroke="#3c3c3c" strokeWidth="2" />
        </svg>
        <div className="decorative-shape shape-square" style={{ bottom: '20%', left: '5%' }}></div>
        <div className="decorative-shape shape-square" style={{ top: '50%', right: '25%' }}></div>
        <div className="decorative-shape shape-circle" style={{ bottom: '15%', right: '20%' }}></div>
        <div className="decorative-shape shape-circle" style={{ top: '20%', left: '50%' }}></div>
      </div>

      <p className="app-title">QuizzR</p>
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
        <CustomButton onClick={() => navigate('/create')}>Create
        </CustomButton>
      </div>
    </div>
  )
}
