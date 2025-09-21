from fastapi import FastAPI
app = FastAPI(title="toolsharer-backend")
@app.get("/healthz")
def health() -> dict:
    return {"status": "ok"}
