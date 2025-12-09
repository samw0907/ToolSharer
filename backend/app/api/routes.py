# app/api/routes.py
from fastapi import APIRouter

router = APIRouter()


@router.get("/ping", tags=["system"])
async def ping():
    return {"message": "pong"}
