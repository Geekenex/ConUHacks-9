import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import HomeScreen from './screens/HomeScreen'
import CreateRoomScreen from './screens/CreateRoomScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/create" element={<CreateRoomScreen />} />
          <Route path="/game/:roomCode" element={<GameScreen />} />
        </Routes>
      </div>
    </Router>
  )
}