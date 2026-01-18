# app/schemas/tool.py
from pydantic import BaseModel


class ToolBase(BaseModel):
    name: str
    description: str | None = None
    location: str | None = None
    owner_id: int
    is_available: bool = True


class ToolCreate(ToolBase):
    pass


class ToolUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    location: str | None = None


class ToolRead(ToolBase):
    id: int
    has_pending_request: bool = False
    is_borrowing: bool = False

    is_borrowed: bool = False
    borrowed_by_user_id: int | None = None
    borrowed_by_email: str | None = None

    # Owner details
    owner_email: str | None = None
    owner_name: str | None = None

    class Config:
        from_attributes = True
