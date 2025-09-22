# app/main.py
from fastapi import FastAPI
from datetime import datetime, timezone

app = FastAPI()

@app.get("/healthz")
def health():
    return {
        "ok": True,
        "service": "toolsharer-local",
        "time": datetime.now(timezone.utc).isoformat()
    }
