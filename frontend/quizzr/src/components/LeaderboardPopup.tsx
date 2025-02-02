import './LeaderboardPopup.css'

interface LeaderboardPopupProps {
  scoreboard: { [user: string]: number }
}

export default function LeaderboardPopup({ scoreboard }: LeaderboardPopupProps) {
  const sorted = Object.entries(scoreboard).sort(([, a], [, b]) => b - a)

  return (
    <div className="leaderboard-popup-overlay">
      <div className="leaderboard-popup-content">
        <div className="confetti"></div>
        <div className="trophy">🏆</div>
        <h2>Leaderboard</h2>
        <ul>
          {sorted.map(([user, score]) => (
            <li key={user}>
              <strong>{user}</strong>: {score}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
