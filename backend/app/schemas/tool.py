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


class ToolRead(ToolBase):
    id: int

    class Config:
        from_attributes = True
