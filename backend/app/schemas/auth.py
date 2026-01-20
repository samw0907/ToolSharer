# app/schemas/auth.py
from pydantic import BaseModel, EmailStr
from typing import Optional


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class DevLoginRequest(BaseModel):
    """Request body for dev bypass login - only available when DEV_AUTH_ENABLED=True"""
    email: EmailStr
    full_name: Optional[str] = None
