# app/main.py
from fastapi import FastAPI

from app.api.routes import router as api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Backend API for the ToolSharer platform.",
)


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "app_name": settings.APP_NAME}


# Mount versioned API routes under /api
app.include_router(api_router, prefix="/api")
