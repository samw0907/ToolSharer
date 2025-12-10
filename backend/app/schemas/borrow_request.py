# app/schemas/borrow_request.py
from datetime import datetime

from pydantic import BaseModel

from app.models.borrow_request import RequestStatus


class BorrowRequestBase(BaseModel):
    tool_id: int
    borrower_id: int
    message: str | None = None


class BorrowRequestCreate(BorrowRequestBase):
    pass


class BorrowRequestRead(BorrowRequestBase):
    id: int
    status: RequestStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
