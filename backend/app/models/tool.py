# app/models/tool.py
from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import Base


class Tool(Base):
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Location (geocoded)
    address = Column(String, nullable=True)  # What owner typed (replaces old 'location')
    lat = Column(Float, nullable=True)  # Geocoded latitude
    lng = Column(Float, nullable=True)  # Geocoded longitude

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_available = Column(Boolean, nullable=False, default=True)

    owner = relationship("User", back_populates="tools")

    # A tool can have many borrow requests
    borrow_requests = relationship("BorrowRequest", back_populates="tool")
