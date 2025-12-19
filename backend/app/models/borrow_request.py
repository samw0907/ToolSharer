# app/models/borrow_request.py
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.models.base import Base
import enum


class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DECLINED = "DECLINED"
    CANCELLED = "CANCELLED"
    RETURNED = "RETURNED"


class BorrowRequest(Base):
    __tablename__ = "borrow_requests"

    id = Column(Integer, primary_key=True, index=True)

    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
    borrower_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    message = Column(Text, nullable=True)

    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)

    status = Column(
        Enum(RequestStatus, name="request_status"),
        nullable=False,
        default=RequestStatus.PENDING,
    )

    created_at = Column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    tool = relationship("Tool", back_populates="borrow_requests")
    borrower = relationship("User", back_populates="borrow_requests")
