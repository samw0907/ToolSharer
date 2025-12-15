# app/api/tools.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
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

@router.get("/owner/{owner_id}", response_model=List[ToolRead])
def list_tools_for_owner(owner_id: int, db: Session = Depends(get_db)):
    tools = db.query(Tool).filter(Tool.owner_id == owner_id).all()
    return tools

@router.post("/", response_model=ToolRead, status_code=201)
def create_tool(payload: ToolCreate, db: Session = Depends(get_db)):
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

@router.patch("/{tool_id}/availability", response_model=ToolRead)
def toggle_tool_availability(tool_id: int, db: Session = Depends(get_db)):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    tool.is_available = not tool.is_available
    db.commit()
    db.refresh(tool)
    return tool

@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tool(tool_id: int, db: Session = Depends(get_db)):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    db.delete(tool)
    db.commit()
    return