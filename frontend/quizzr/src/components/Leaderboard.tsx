import React from 'react'
import './Leaderboard.css'

interface LeaderboardProps {
  scoreboard: { [user: string]: number }
}

export default function Leaderboard({ scoreboard }: LeaderboardProps) {
  const sortedScoreboard = Object.entries(scoreboard).sort((a, b) => b[1] - a[1])
  return (
    <div className="leaderboard-container">
      <h3>Leaderboard</h3>
      <ul>
        {sortedScoreboard.map(([user, score]) => (
          <li key={user}>
            {user}: {score}
          </li>
        ))}
      </ul>
    </div>
  )
}
