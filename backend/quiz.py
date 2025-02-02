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
from better_profanity import profanity
import generateVisuals

def generate_base64_png(csv_content: str, question: str, answer: str) -> str:
    # Placeholder implementation:
    # This function should process the CSV content, question, and answer
    # then return a base64-encoded PNG string.
    return "data:image/png;base64,"+ generateVisuals.generate_base64_png(csv_content, question, answer)



# In-memory session storage:
# sessions[session_code] = {
#   "questions": List[question],
#   "current_question": question or None,
#   "current_question_timestamp": float,
#   "responses": { user: total_score },
#   "current_question_answers": { user: question_score },
#   "csv_content": str,      # <-- added to store CSV data for use with generate_base64_png
#   "started": boolean,
#   "users": List[str]
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

        # Start generating the image in the background immediately.
        csv_content = session.get("csv_content", "")
        image_task = asyncio.create_task(
            asyncio.to_thread(generate_base64_png, csv_content, question["question"], question["correct_answer"])
        )

        # Wait for 15 seconds for players to answer.
        await asyncio.sleep(15)

        # At the 15-second mark, check if the image is ready.
        # At the 15-second mark, check if the image is ready.
        if image_task.done():
            # If the image is ready, attempt to retrieve it.
            try:
                base64_png = image_task.result()
            except Exception as e:
                print(f"Image generation error: {e}")
                base64_png = None
            # Broadcast only if we got a valid image.
            if base64_png:
                image_payload = json.dumps({
                    "type": "generated_image",
                    "data": {"base64": base64_png}
                })
                await manager.broadcast(session_code, image_payload)
        else:
            # If not ready, add a callback so that when it finishes, 
            # we try to retrieve it without crashing.
            def on_image_done(task: asyncio.Task):
                try:
                    base64_png = task.result()
                    if base64_png:
                        image_payload = json.dumps({
                            "type": "generated_image",
                            "data": {"base64": base64_png}
                        })
                        # Schedule broadcasting the image (no await needed here).
                        asyncio.create_task(manager.broadcast(session_code, image_payload))
                except Exception as e:
                    print(f"Image generation error in callback: {e}")
            image_task.add_done_callback(on_image_done)
        

        # Now broadcast the question result.
        await manager.broadcast(session_code, json.dumps({
            "type": "question_result",
            "data": {
                "correct_answer": question["correct_answer"],
                "scores": session["current_question_answers"]
            }
        }))
        await asyncio.sleep(20)
    # All questions have been asked; notify clients that the game is over.
    payload = json.dumps({
        "type": "game_over",
        "data": {}
    })
    await manager.broadcast(session_code, payload)

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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
    if not dataset_url or not isinstance(dataset_url, str):
        raise HTTPException(status_code=400, detail="dataset_url must be a non-empty string")
    parts = dataset_url.rstrip("/").split("/")
    if "datasets" in parts:
        idx = parts.index("datasets")
        ds_ref = "/".join(parts[idx+1: idx+3])
    else:
        raise HTTPException(status_code=400, detail="Invalid dataset_url format")
    # Create session immediately
    session_code = generate_session_code()
    sessions[session_code] = {
        "questions": None,
        "quiz_ready": False,
        "current_question": None,
        "current_question_timestamp": None,
        "responses": {},
        "current_question_answers": {},
        "started": False,
        "users": []
    }
    # Offload blocking quiz generation to a thread
    asyncio.create_task(generate_quiz_background(session_code, ds_ref, questions_num))
    return {"session_code": session_code}

async def generate_quiz_background(session_code: str, ds_ref: str, questions_num: int):
    try:
        def blocking_task():
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
            # Generate questions (this call is assumed to be CPU-bound)
            questions = generateQA(csv_content, questions_num)
            return csv_content, questions

        csv_content, questions = await asyncio.to_thread(blocking_task)
        sessions[session_code]["questions"] = questions
        sessions[session_code]["csv_content"] = csv_content  # Store CSV for later use in generate_base64_png
        sessions[session_code]["quiz_ready"] = True
        await manager.broadcast(session_code, json.dumps({"type": "quiz_ready"}))
    except Exception as e:
        print(e)

@app.websocket("/ws/{session_code}")
async def websocket_endpoint(websocket: WebSocket, session_code: str):
    profanity.load_censor_words()
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
                    if user in session["users"]:
                        await websocket.send_json({"type": "error", "message": "Username already taken"})
                    elif not user or profanity.contains_profanity(user):
                        await websocket.send_json({
                            "type": "error",
                            "message": "Don't use naughty words 😾😾, pick a better name"
                        })
                    else:
                        session["users"].append(user)
                        await websocket.send_json({"type": "join_success"})
                        if session.get("quiz_ready"):
                            await websocket.send_json({"type": "quiz_ready"})
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
