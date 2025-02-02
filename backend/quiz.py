import json
import random
import string
import requests
import time
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
from kaggle.api.kaggle_api_extended import KaggleApi
from bs4 import BeautifulSoup
from contextlib import asynccontextmanager
from generateQA import generateQA

# In-memory session storage:
# sessions[session_code] = {
#   "questions": List[question],
#   "current_question": question or None,
#   "current_question_timestamp": float,
#   "responses": { user: total_score },
#   "current_question_answers": { user: question_score },
#   "started": boolean
# }
sessions: Dict[str, Dict[str, Any]] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_code: str, websocket: WebSocket):
        await websocket.accept()
        if session_code not in self.active_connections:
            self.active_connections[session_code] = []
        self.active_connections[session_code].append(websocket)

    def disconnect(self, session_code: str, websocket: WebSocket):
        if session_code in self.active_connections:
            self.active_connections[session_code].remove(websocket)
            if not self.active_connections[session_code]:
                del self.active_connections[session_code]

    async def broadcast(self, session_code: str, message: str):
        if session_code in self.active_connections:
            for connection in self.active_connections[session_code]:
                await connection.send_text(message)

manager = ConnectionManager()

def generate_session_code(length: int = 6) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# Add this new function to handle per-session scheduling:
async def run_session(session_code: str):
    session = sessions[session_code]
    # Shuffle questions so each is asked exactly once
    session["remaining_questions"] = random.sample(session["questions"], len(session["questions"]))
    while session["remaining_questions"]:
        # Get and remove the next question
        question = session["remaining_questions"].pop(0)
        session["current_question_answers"] = {}
        session["current_question"] = question
        session["current_question_timestamp"] = time.time()
        options = question["fake_answers"] + [question["correct_answer"]]
        random.shuffle(options)
        payload = json.dumps({
            "type": "question",
            "data": {
                "question": question["question"],
                "options": options
            }
        })
        await manager.broadcast(session_code, payload)
        await asyncio.sleep(15)
        await manager.broadcast(session_code, json.dumps({
            "type": "question_result",
            "data": {
                "correct_answer": question["correct_answer"],
                "scores": session["current_question_answers"]
            }
        }))
        await asyncio.sleep(5)
    # All questions have been asked; notify clients that the game is over.
    payload = json.dumps({
        "type": "game_over",
        "data": {}
    })
    await manager.broadcast(session_code, payload)

async def question_scheduler():
    while True:
        await asyncio.sleep(20)
        for session_code, session in sessions.items():
            if session.get("started") and session.get("questions") and session_code in manager.active_connections:
                # Clear current answers and send a new question
                session["current_question_answers"] = {}
                question = random.choice(session["questions"])
                session["current_question"] = question
                session["current_question_timestamp"] = time.time()
                options = question["fake_answers"] + [question["correct_answer"]]
                random.shuffle(options)
                payload = json.dumps({
                    "type": "question",
                    "data": {
                        "question": question["question"],
                        "options": options

                    }
                })
                await manager.broadcast(session_code, payload)


app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"],  allow_methods=["*"], allow_headers=["*"])

@app.get("/datasets")
async def search_datasets(query: str = ""):
    api = KaggleApi()
    api.authenticate()
    if query:
        datasets = api.dataset_list(search=query, page=1, max_size=10_000_000, file_type='csv')
    else:
        datasets = api.dataset_list(sort_by='votes', page=1, max_size=10_000_000, file_type='csv')
    results = []
    for ds in datasets:
        dataset_url = f"https://www.kaggle.com/datasets/{ds.ref}"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(dataset_url, headers=headers)
        thumbnail = ""
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            meta = soup.find("meta", property="og:image")
            if meta:
                thumbnail = meta.get("content", "")
        try:
            files = api.dataset_list_files(ds.ref).files
            csv_files = [f for f in files if f.name.lower().endswith('.csv')]
            download_urls = [
                f"https://www.kaggle.com/datasets/{ds.ref}/download/{csv_file.name}"
                for csv_file in csv_files
            ]
        except Exception:
            download_urls = []
        if len(download_urls) != 1:
            continue
        results.append({
            "title": ds.title,
            "thumbnail": thumbnail,
            "download_url": download_urls[0]
        })
        if len(results) == 9:
            break
    return results

@app.post("/start_session")
async def start_session(request: Request):
    data = await request.json()
    dataset_url = data.get("dataset_url")
    questions_num = data.get("questions_num")
    print(questions_num)
    if not dataset_url or not isinstance(dataset_url, str):
        raise HTTPException(status_code=400, detail="dataset_url must be a non-empty string")
    # Extract dataset reference from dataset_url (e.g., "https://www.kaggle.com/datasets/shivamb/netflix-shows" -> "shivamb/netflix-shows")
    parts = dataset_url.rstrip("/").split("/")
    if "datasets" in parts:
        idx = parts.index("datasets")
        ds_ref = "/".join(parts[idx+1: idx+3])
    else:
        raise HTTPException(status_code=400, detail="Invalid dataset_url format")
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
        import tempfile, glob, os
        api = KaggleApi()
        api.authenticate()
        with tempfile.TemporaryDirectory() as tmpdirname:
            api.dataset_download_files(ds_ref, path=tmpdirname, unzip=True)
            csv_files = glob.glob(os.path.join(tmpdirname, "*.csv"))
            if not csv_files:
                raise Exception("No CSV file found in dataset")
            csv_file = csv_files[0]
            try:
                with open(csv_file, "r", encoding="utf-8-sig") as f:
                    csv_content = f.read()
            except UnicodeDecodeError:
                with open(csv_file, "r", encoding="latin-1") as f:
                    csv_content = f.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download dataset via Kaggle API: {str(e)}")
    questions = generateQA(csv_content, questions_num)
    session_code = generate_session_code()
    sessions[session_code] = {
        "questions": questions,
        "current_question": None,
        "current_question_timestamp": None,
        "responses": {},
        "current_question_answers": {},
        "started": False,
        "users": []
    }
    return {"session_code": session_code}

# In the websocket endpoint, update the "join" action as follows:
@app.websocket("/ws/{session_code}")
async def websocket_endpoint(websocket: WebSocket, session_code: str):
    if session_code not in sessions:
        await websocket.close(code=1008)
        return
    await manager.connect(session_code, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            session = sessions.get(session_code)
            if action == "join":
                user = data.get("user")
                if user:
                    if "users" not in session:
                        session["users"] = []
                    if user not in session["users"]:
                        session["users"].append(user)

                    user_list_payload = json.dumps({
                        "type": "user_list",
                        "data": session["users"]
                    })
                    await manager.broadcast(session_code, user_list_payload)
            elif action == "start":
                if not session.get("started"):
                    session["started"] = True
                    await manager.broadcast(session_code, json.dumps({
                        "type": "session_started",
                        "data": {}
                    }))
                    asyncio.create_task(run_session(session_code))
            elif action == "answer":
                user = data.get("user")
                answer = data.get("answer")
                if session and session["current_question"] and session["current_question_timestamp"]:
                    if user in session["current_question_answers"]:
                        await websocket.send_json({"type": "error", "message": "Already answered"})
                        continue
                    correct = session["current_question"]["correct_answer"]
                    t = time.time() - session["current_question_timestamp"]
                    if answer == correct:
                        if t >= 15:
                            question_score = 50
                        else:
                            question_score = 100 - (50 / 15) * t
                        question_score = int(round(question_score))
                    else:
                        question_score = 0
                    session["current_question_answers"][user] = question_score
                    session["responses"][user] = session["responses"].get(user, 0) + question_score
                    total = session["responses"][user]
                    await websocket.send_json({
                        "type": "result",
                        "data": {
                            "result": question_score,
                            "total": total
                        }
                    })
                    scoreboard_payload = json.dumps({
                        "type": "scoreboard",
                        "data": dict(sorted(session["responses"].items(), key=lambda item: item[1], reverse=True))
                    })
                    await manager.broadcast(session_code, scoreboard_payload)
    except WebSocketDisconnect:
        manager.disconnect(session_code, websocket)

