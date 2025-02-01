import React, { useState } from 'react';

interface QuestionData {
  question: string;
  options: string[];
}

interface Scoreboard {
  [user: string]: number;
}

interface MessageData {
  type: string;
  data?: any;
  message?: string;
}

const Example: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [sessionCode, setSessionCode] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [currentQuestionScore, setCurrentQuestionScore] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [scoreboard, setScoreboard] = useState<Scoreboard>({});
  const [user] = useState<string>("user" + Math.floor(Math.random() * 1000));

  const connectWebSocket = () => {
    const socket = new WebSocket(`ws://localhost:8000/ws/${sessionCode}`);
    socket.onopen = () => setConnected(true);
    socket.onmessage = (event: MessageEvent) => {
      const msg: MessageData = JSON.parse(event.data);
      if (msg.type === "session_started") {
        setSessionStarted(true);
      } else if (msg.type === "question") {
        setQuestionData(msg.data);
        setHasAnswered(false);
        setCurrentQuestionScore(null);
      } else if (msg.type === "result") {
        if (msg.data) {
          setCurrentQuestionScore(msg.data.result);
          setTotalScore(msg.data.total);
          setHasAnswered(true);
        }
      } else if (msg.type === "scoreboard") {
        if (msg.data) {
          setScoreboard(msg.data);
        }
      } else if (msg.type === "error") {
        console.error(msg.message);
      }
    };
    socket.onclose = () => setConnected(false);
    setWs(socket);
  };

  const sendAnswer = (answer: string) => {
    if (ws && connected && !hasAnswered) {
      ws.send(JSON.stringify({ action: "answer", user, answer }));
    }
  };

  const startSession = () => {
    if (ws && connected && !sessionStarted) {
      ws.send(JSON.stringify({ action: "start", user }));
    }
  };

  const sortedScoreboard = Object.entries(scoreboard).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ padding: "20px" }}>
      {!connected ? (
        <div>
          <h2>Join a Quiz Session</h2>
          <input
            type="text"
            placeholder="Enter session code"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
          />
          <button onClick={connectWebSocket}>Join</button>
        </div>
      ) : (
        <div>
          {!sessionStarted ? (
            <div>
              <h2>Waiting for session to start...</h2>
              <button onClick={startSession}>Everybody's In</button>
            </div>
          ) : (
            <div>
              <h2>Quiz Session</h2>
              <div>
                <strong>Your User:</strong> {user} | <strong>Your Total Score:</strong> {totalScore}
              </div>
              {currentQuestionScore !== null && (
                <div>
                  <strong>Current Question Score:</strong> {currentQuestionScore}
                </div>
              )}
              <div style={{ marginTop: "20px" }}>
                {questionData ? (
                  <div>
                    <h3>{questionData.question}</h3>
                    {questionData.options.map((opt: string) => (
                      <button
                        key={opt}
                        onClick={() => sendAnswer(opt)}
                        disabled={hasAnswered}
                        style={{ margin: "5px" }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>Waiting for question...</div>
                )}
              </div>
              <div style={{ marginTop: "20px" }}>
                <h3>Scoreboard</h3>
                <ul>
                  {sortedScoreboard.map(([username, score]) => (
                    <li key={username}>
                      {username}: {score}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Example;
