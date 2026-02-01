# app/api/tools.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.borrow_request import BorrowRequest, RequestStatus
from app.models.tool import Tool
from app.models.user import User
from app.schemas.tool import ToolCreate, ToolRead, ToolUpdate

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/", response_model=List[ToolRead])
def list_tools(
    db: Session = Depends(get_db),
    current_user_id: int | None = Query(default=None),
):
    tools = db.query(Tool).options(joinedload(Tool.owner)).all()

    # Get pending request counts per tool
    pending_counts = (
        db.query(BorrowRequest.tool_id, func.count(BorrowRequest.id))
        .filter(BorrowRequest.status == RequestStatus.PENDING)
        .group_by(BorrowRequest.tool_id)
        .all()
    )
    pending_count_map = {row[0]: row[1] for row in pending_counts}

    # Populate owner details and pending counts for all tools
    for t in tools:
        if t.owner:
            setattr(t, "owner_email", t.owner.email)
            setattr(t, "owner_name", t.owner.full_name)
        setattr(t, "pending_request_count", pending_count_map.get(t.id, 0))

    if current_user_id is None:
        return tools

    # Get user's pending requests with messages
    pending_requests = (
        db.query(BorrowRequest.tool_id, BorrowRequest.message)
        .filter(
            BorrowRequest.borrower_id == current_user_id,
            BorrowRequest.status == RequestStatus.PENDING,
        )
        .all()
    )
    pending_map = {row[0]: row[1] for row in pending_requests}

    approved_tool_ids = (
        db.query(BorrowRequest.tool_id)
        .filter(
            BorrowRequest.borrower_id == current_user_id,
            BorrowRequest.status == RequestStatus.APPROVED,
        )
        .all()
    )
    approved_set = {row[0] for row in approved_tool_ids}

    for t in tools:
        setattr(t, "has_pending_request", t.id in pending_map)
        setattr(t, "is_borrowing", t.id in approved_set)
        setattr(t, "my_pending_request_message", pending_map.get(t.id))

    return tools

@router.get("/owner/{owner_id}", response_model=List[ToolRead])
def list_tools_for_owner(owner_id: int, db: Session = Depends(get_db)):
    tools = db.query(Tool).filter(Tool.owner_id == owner_id).all()

    tool_ids = [t.id for t in tools]
    approved_rows = []
    if tool_ids:
        approved_rows = (
            db.query(BorrowRequest.tool_id, User.id, User.email)
            .join(User, User.id == BorrowRequest.borrower_id)
            .filter(
                BorrowRequest.tool_id.in_(tool_ids),
                BorrowRequest.status == RequestStatus.APPROVED,
            )
            .all()
        )

    approved_map = {row[0]: {"user_id": row[1], "email": row[2]} for row in approved_rows}

    for t in tools:
        info = approved_map.get(t.id)
        setattr(t, "is_borrowed", info is not None)
        setattr(t, "borrowed_by_user_id", info["user_id"] if info else None)
        setattr(t, "borrowed_by_email", info["email"] if info else None)

    return tools

@router.post("/", response_model=ToolRead, status_code=201)
def create_tool(
    payload: ToolCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tool = Tool(
        name=payload.name,
        description=payload.description,
        address=payload.address,
        lat=payload.lat,
        lng=payload.lng,
        icon_key=payload.icon_key,
        owner_id=current_user.id,
        is_available=payload.is_available,
    )

    db.add(tool)
    db.commit()
    db.refresh(tool)
    return tool

@router.put("/{tool_id}", response_model=ToolRead)
def update_tool(tool_id: int, payload: ToolUpdate, db: Session = Depends(get_db)):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    # Update only provided fields
    if payload.name is not None:
        tool.name = payload.name
    if payload.description is not None:
        tool.description = payload.description
    if payload.address is not None:
        tool.address = payload.address
    if payload.lat is not None:
        tool.lat = payload.lat
    if payload.lng is not None:
        tool.lng = payload.lng
    if payload.icon_key is not None:
        tool.icon_key = payload.icon_key

    db.commit()
    db.refresh(tool)
    return tool

@router.patch("/{tool_id}/availability", response_model=ToolRead)
def toggle_tool_availability(tool_id: int, db: Session = Depends(get_db)):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    approved_exists = (
        db.query(func.count(BorrowRequest.id))
        .filter(
            BorrowRequest.tool_id == tool_id,
            BorrowRequest.status == RequestStatus.APPROVED,
        )
        .scalar()
    )
    if approved_exists and approved_exists > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot change availability while this tool is currently borrowed. Use Owner Requests -> Return.",
        )

    tool.is_available = not tool.is_available
    db.commit()
    db.refresh(tool)
    return tool

@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tool(tool_id: int, db: Session = Depends(get_db)):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    request_count = (
        db.query(func.count(BorrowRequest.id))
        .filter(BorrowRequest.tool_id == tool_id)
        .scalar()
    )
    if request_count and request_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete tool with existing borrow requests",
        )

    db.delete(tool)
    db.commit()
    return
    