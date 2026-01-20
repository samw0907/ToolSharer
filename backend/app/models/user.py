# app/models/user.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    google_sub = Column(String, unique=True, index=True, nullable=True)  # Google OAuth subject ID

    # A user can own many tools
    tools = relationship("Tool", back_populates="owner")

    # A user can make many borrow requests
    borrow_requests = relationship("BorrowRequest", back_populates="borrower")