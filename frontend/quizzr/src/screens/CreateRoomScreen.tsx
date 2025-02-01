import { useState } from 'react'
import CustomButton from '../components/CustomButton'
import CustomInput from '../components/CustomInput'
import './CreateRoomScreen.css'

export default function CreateRoomScreen() {
  const [numPlayers, setNumPlayers] = useState(2)

  const handleCreateRoom = () => {
    console.log('Creating room with up to', numPlayers, 'players')
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const file = e.target.files[0]
    console.log('CSV uploaded:', file)
  }

  return (
    <div className="section">
      <h2>Create a room</h2>
      <label>Number of players: {numPlayers}</label>
      <input
        type="range"
        min="2"
        max="10"
        value={numPlayers}
        onChange={(e) => setNumPlayers(Number(e.target.value))}
      />
      <div style={{ margin: '1rem 0' }}>
        <CustomInput type="file" accept=".csv" onChange={handleCSVUpload} />
      </div>
      <CustomButton onClick={handleCreateRoom}>Create Room</CustomButton>
    </div>
  )
}
