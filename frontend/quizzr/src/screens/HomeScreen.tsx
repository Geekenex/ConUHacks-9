import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomButton from '../components/CustomButton'
import CustomInput from '../components/CustomInput'
import './HomeScreen.css'

export default function HomeScreen() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');

  const [error, setError] = useState(false);
  const [errorId, setErrorId] = useState(0);

  const testRoomExists = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${window.location.href.includes("localhost")?"ws://localhost:8000":"wss://conuhacks-9.up.railway.app"}/ws/${roomCode}`)

      ws.onopen = () => {
        ws.close()
        resolve()
      }

      ws.onclose = (event) => {
        if (event.code === 1008 || event.code === 403) {
          reject(new Error('Room not found'))
        } else {
          resolve()
        }
      }

      ws.onerror = () => {
        reject(new Error('Could not connect'))
      }
    })
  }

  const handleJoinRoom = async () => {
    try {
      await testRoomExists()
      setError(false)
      navigate(`/game/${roomCode}`)
    } catch (err) {
      setError(true)
      setErrorId(Date.now())
    }
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
        {error && (
          <div
            key={errorId}
            className="error-message shake"
          >
            Room not found
          </div>
        )}
      </div>
      <div className="section">
        <h2>Create a room</h2>
        <CustomButton onClick={() => navigate('/create')}>Create
        </CustomButton>
      </div>
    </div>
  )
}
