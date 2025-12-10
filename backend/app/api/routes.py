# app/api/routes.py
from fastapi import APIRouter

from app.api import users, tools

router = APIRouter()

# System / health
@router.get("/ping", tags=["system"])
async def ping():
    return {"message": "pong"}


# Users
router.include_router(users.router)

# Tools
router.include_router(tools.router)
