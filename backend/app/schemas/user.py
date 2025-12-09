# app/schemas/user.py
from pydantic import BaseModel


class UserBase(BaseModel):
    email: str
    full_name: str | None = None


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True  # allows Pydantic v2 to read from ORM objects
