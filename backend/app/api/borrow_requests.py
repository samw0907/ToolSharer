# app/api/borrow_requests.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.borrow_request import BorrowRequest, RequestStatus
from app.models.tool import Tool
from app.models.user import User
from app.schemas.borrow_request import BorrowRequestCreate, BorrowRequestRead

router = APIRouter(prefix="/borrow_requests", tags=["borrow_requests"])


@router.get("/", response_model=List[BorrowRequestRead])
def list_requests(db: Session = Depends(get_db)):
    requests = db.query(BorrowRequest).all()
    return requests


@router.post("/", response_model=BorrowRequestRead, status_code=201)
def create_request(payload: BorrowRequestCreate, db: Session = Depends(get_db)):
    # Ensure tool exists
    tool = db.query(Tool).filter(Tool.id == payload.tool_id).first()
    if not tool:
        raise HTTPException(status_code=400, detail="Tool not found")

    # Ensure borrower exists
    borrower = db.query(User).filter(User.id == payload.borrower_id).first()
    if not borrower:
        raise HTTPException(status_code=400, detail="Borrower not found")

    # In future we can add rules (owner can't be borrower, etc.)
    if tool.owner_id == payload.borrower_id:
        raise HTTPException(
            status_code=400, detail="Owner cannot request their own tool"
        )

    req = BorrowRequest(
        tool_id=payload.tool_id,
        borrower_id=payload.borrower_id,
        message=payload.message,
        status=RequestStatus.PENDING,
    )

    db.add(req)
    db.commit()
    db.refresh(req)
    return req
