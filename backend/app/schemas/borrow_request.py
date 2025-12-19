# app/schemas/borrow_request.py
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import model_validator

from app.models.borrow_request import RequestStatus

class BorrowRequestToolRead(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class BorrowRequestUserRead(BaseModel):
    id: int
    email: str
    full_name: str | None = None

    class Config:
        from_attributes = True


class BorrowRequestBase(BaseModel):
    tool_id: int
    borrower_id: int
    message: str | None = None


class BorrowRequestCreate(BorrowRequestBase):
    start_date: date
    due_date: date

    @model_validator(mode="after")
    def validate_dates(self):
        if self.due_date < self.start_date:
            raise ValueError("due_date cannot be before start_date")
        return self


class BorrowRequestRead(BorrowRequestBase):
    id: int
    tool_id: int
    borrower_id: int
    message: Optional[str] = None
    status: RequestStatus

    start_date: Optional[date] = None
    due_date: Optional[date] = None

    created_at: datetime
    updated_at: datetime

    tool: Optional[BorrowRequestToolRead] = None
    borrower: Optional[BorrowRequestUserRead] = None

    class Config:
        from_attributes = True
