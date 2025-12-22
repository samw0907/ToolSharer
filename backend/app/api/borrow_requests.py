# app/api/borrow_requests.py
from typing import List
from datetime import date 

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.borrow_request import BorrowRequest, RequestStatus
from app.models.tool import Tool
from app.models.user import User
from app.schemas.borrow_request import BorrowRequestCreate, BorrowRequestRead

router = APIRouter(prefix="/borrow_requests", tags=["borrow_requests"])

def _annotate_overdue_fields(req: BorrowRequest) -> None:
    today = date.today()

    is_overdue = (
        req.status == RequestStatus.APPROVED
        and req.due_date is not None
        and req.due_date < today
    )

    days_overdue = 0
    days_until_due = 0

    if req.due_date is not None:
        if is_overdue:
            days_overdue = (today - req.due_date).days
            days_until_due = 0
        else:
            delta = (req.due_date - today).days
            days_until_due = delta if delta > 0 else 0

    setattr(req, "is_overdue", bool(is_overdue))
    setattr(req, "days_overdue", int(days_overdue))
    setattr(req, "days_until_due", int(days_until_due))

@router.get("/", response_model=List[BorrowRequestRead])
def list_requests(db: Session = Depends(get_db)):
    requests = (
        db.query(BorrowRequest)
        .options(joinedload(BorrowRequest.tool), joinedload(BorrowRequest.borrower))
        .all()
    )

    for r in requests:
        _annotate_overdue_fields(r)

    return requests


@router.get("/owner/{owner_id}", response_model=List[BorrowRequestRead])
def list_requests_for_owner(owner_id: int, db: Session = Depends(get_db)):
    requests = (
        db.query(BorrowRequest)
        .join(Tool, BorrowRequest.tool_id == Tool.id)
        .filter(Tool.owner_id == owner_id)
        .options(joinedload(BorrowRequest.tool), joinedload(BorrowRequest.borrower))
        .order_by(BorrowRequest.created_at.desc())
        .all()
    )

    for r in requests:
        _annotate_overdue_fields(r)

    return requests

@router.get("/borrower/{borrower_id}", response_model=List[BorrowRequestRead])
def list_requests_for_borrower(borrower_id: int, db: Session = Depends(get_db)):
    requests = (
        db.query(BorrowRequest)
        .filter(BorrowRequest.borrower_id == borrower_id)
        .options(joinedload(BorrowRequest.tool), joinedload(BorrowRequest.borrower))
        .order_by(BorrowRequest.created_at.desc())
        .all()
    )

    for r in requests:
        _annotate_overdue_fields(r)

    return requests
    
@router.post("/", response_model=BorrowRequestRead, status_code=201)
def create_request(payload: BorrowRequestCreate, db: Session = Depends(get_db)):
    tool = db.query(Tool).filter(Tool.id == payload.tool_id).first()
    if not tool:
        raise HTTPException(status_code=400, detail="Tool not found")

    if not tool.is_available:
        raise HTTPException(status_code=400, detail="Tool is not available")

    borrower = db.query(User).filter(User.id == payload.borrower_id).first()
    if not borrower:
        raise HTTPException(status_code=400, detail="Borrower not found")

    if tool.owner_id == payload.borrower_id:
        raise HTTPException(
            status_code=400, detail="Owner cannot request their own tool"
        )

    existing_pending = (
        db.query(BorrowRequest)
        .filter(
            BorrowRequest.tool_id == payload.tool_id,
            BorrowRequest.borrower_id == payload.borrower_id,
            BorrowRequest.status == RequestStatus.PENDING,
        )
        .first()
    )
    if existing_pending:
        raise HTTPException(
            status_code=400, detail="A pending request already exists for this tool"
        )

    req = BorrowRequest(
        tool_id=payload.tool_id,
        borrower_id=payload.borrower_id,
        message=payload.message,
        status=RequestStatus.PENDING,
        start_date=payload.start_date,
        due_date=payload.due_date,
    )

    db.add(req)
    db.commit()
    db.refresh(req)

    _annotate_overdue_fields(req)

    return req


def _get_request_or_404(request_id: int, db: Session) -> BorrowRequest:
    borrow_request = (db.query(BorrowRequest).filter(BorrowRequest.id == request_id).first())
    if not borrow_request:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    return borrow_request


@router.patch("/{request_id}/approve", response_model=BorrowRequestRead)
def approve_request(request_id: int, db: Session = Depends(get_db)):
    borrow_request = _get_request_or_404(request_id, db)

    if borrow_request.status != RequestStatus.PENDING:
        raise HTTPException(
            status_code=400, detail="Only pending requests can be updated"
        )

    tool = db.query(Tool).filter(Tool.id == borrow_request.tool_id).first()
    if not tool:
        raise HTTPException(status_code=400, detail="Tool not found")

    if not tool.is_available:
        raise HTTPException(status_code=400, detail="Tool is not available")

    borrow_request.status = RequestStatus.APPROVED

    tool.is_available = False

    (
        db.query(BorrowRequest)
        .filter(
            BorrowRequest.tool_id == borrow_request.tool_id,
            BorrowRequest.id != borrow_request.id,
            BorrowRequest.status == RequestStatus.PENDING,
        )
        .update({BorrowRequest.status: RequestStatus.DECLINED})
    )

    db.commit()
    db.refresh(borrow_request)

    _annotate_overdue_fields(borrow_request)

    return borrow_request

@router.patch("/{request_id}/decline", response_model=BorrowRequestRead)
def decline_request(request_id: int, db: Session = Depends(get_db)):
    borrow_request = _get_request_or_404(request_id, db)

    if borrow_request.status != RequestStatus.PENDING:
        raise HTTPException(
            status_code=400, detail="Only pending requests can be updated"
        )

    borrow_request.status = RequestStatus.DECLINED
    db.commit()
    db.refresh(borrow_request)

    _annotate_overdue_fields(borrow_request)

    return borrow_request


@router.patch("/{request_id}/cancel", response_model=BorrowRequestRead)
def cancel_request(request_id: int, db: Session = Depends(get_db)):

    borrow_request = _get_request_or_404(request_id, db)

    if borrow_request.status != RequestStatus.PENDING:
        raise HTTPException(
            status_code=400, detail="Only pending requests can be updated"
        )

    borrow_request.status = RequestStatus.CANCELLED
    db.commit()
    db.refresh(borrow_request)

    _annotate_overdue_fields(borrow_request)

    return borrow_request

@router.patch("/{request_id}/return", response_model=BorrowRequestRead)
def return_tool(request_id: int, db: Session = Depends(get_db)):
    borrow_request = _get_request_or_404(request_id, db)

    if borrow_request.status != RequestStatus.APPROVED:
        raise HTTPException(
            status_code=400, detail="Only approved requests can be returned"
        )

    tool = db.query(Tool).filter(Tool.id == borrow_request.tool_id).first()
    if not tool:
        raise HTTPException(status_code=400, detail="Tool not found")

    tool.is_available = True

    borrow_request.status = RequestStatus.RETURNED

    db.commit()
    db.refresh(borrow_request)

    _annotate_overdue_fields(borrow_request)

    return borrow_request
