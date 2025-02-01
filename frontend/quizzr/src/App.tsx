import { useState } from 'react'
import './App.css'
import CustomButton from './components/CustomButton'
import CustomInput from './components/CustomInput'

export default function App() {
  const [roomCode, setRoomCode] = useState('')

  const handleJoinRoom = () => {
    console.log('Joining room:', roomCode)
  }

  const handleCreateRoom = () => {
    console.log('Creating room...')
  }

  //TODO: hookup to backend
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const file = e.target.files[0]
    console.log('CSV uploaded:', file)
  }

  return (
    <div className="app">
      <h1 className="app-title">Quizzr</h1>

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
        <CustomButton onClick={handleCreateRoom}>Create</CustomButton>
      </div>
      
    </div>
  )
}
