# app/schemas/geocoding.py
from pydantic import BaseModel
from typing import Optional


class GeocodeRequest(BaseModel):
    address: str


class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    formatted_address: str


class ToolWithDistance(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    owner_id: int
    owner_email: Optional[str] = None
    owner_name: Optional[str] = None
    is_available: bool
    distance_km: float

    class Config:
        from_attributes = True
