# app/schemas/tool.py
from pydantic import BaseModel


class ToolBase(BaseModel):
    name: str
    description: str | None = None
    address: str | None = None  # Renamed from location
    owner_id: int
    is_available: bool = True


class ToolCreate(ToolBase):
    lat: float | None = None
    lng: float | None = None


class ToolUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None  # Renamed from location
    lat: float | None = None
    lng: float | None = None


class ToolRead(ToolBase):
    id: int
    # Geocoded coordinates
    lat: float | None = None
    lng: float | None = None

    has_pending_request: bool = False
    is_borrowing: bool = False

    is_borrowed: bool = False
    borrowed_by_user_id: int | None = None
    borrowed_by_email: str | None = None

    # Owner details
    owner_email: str | None = None
    owner_name: str | None = None

    # Pending requests count (for Browse Tools)
    pending_request_count: int = 0

    # User's own pending request message (if any)
    my_pending_request_message: str | None = None

    class Config:
        from_attributes = True
