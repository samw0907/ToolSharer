# app/api/tools.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.tool import Tool
from app.models.user import User
from app.schemas.tool import ToolCreate, ToolRead

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/", response_model=List[ToolRead])
def list_tools(db: Session = Depends(get_db)):
    tools = db.query(Tool).all()
    return tools


@router.post("/", response_model=ToolRead, status_code=201)
def create_tool(payload: ToolCreate, db: Session = Depends(get_db)):
    # Ensure owner exists
    owner = db.query(User).filter(User.id == payload.owner_id).first()
    if not owner:
        raise HTTPException(status_code=400, detail="Owner not found")

    tool = Tool(
        name=payload.name,
        description=payload.description,
        location=payload.location,
        owner_id=payload.owner_id,
        is_available=payload.is_available,
    )

    db.add(tool)
    db.commit()
    db.refresh(tool)
    return tool
