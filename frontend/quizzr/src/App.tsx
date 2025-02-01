import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import HomeScreen from './screens/HomeScreen'
import CreateRoomScreen from './screens/CreateRoomScreen'

export default function App() {
  return (
    <Router>
      <div className="app">
        <h1 className="app-title">Quizzr</h1>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/create" element={<CreateRoomScreen />} />
        </Routes>
      </div>
    </Router>
  )
}