# app/api/routes.py
from fastapi import APIRouter

from app.api import auth, users, tools, borrow_requests

router = APIRouter()

# System / health
@router.get("/ping", tags=["system"])
async def ping():
    return {"message": "pong"}


# Auth
router.include_router(auth.router)

# Users
router.include_router(users.router)

# Tools
router.include_router(tools.router)

# Borrow Requests
router.include_router(borrow_requests.router)
