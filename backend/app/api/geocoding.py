# app/api/geocoding.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_optional_current_user
from app.db.session import get_db
from app.models.tool import Tool
from app.models.user import User
from app.schemas.geocoding import GeocodeRequest, GeocodeResponse, ToolWithDistance
from app.services.geocoding import geocode_address, haversine_distance

router = APIRouter(prefix="/geo", tags=["geocoding"])


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode(
    request: GeocodeRequest,
):
    """
    Convert an address string to lat/lng coordinates.
    Uses OpenStreetMap Nominatim API.
    """
    result = await geocode_address(request.address)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not geocode the provided address",
        )

    return GeocodeResponse(
        lat=result.lat,
        lng=result.lng,
        formatted_address=result.formatted_address,
    )


@router.get("/tools/near", response_model=List[ToolWithDistance])
def get_nearby_tools(
    lat: float = Query(..., description="Latitude of search center"),
    lng: float = Query(..., description="Longitude of search center"),
    radius_km: float = Query(10.0, description="Search radius in kilometers"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Get tools within a specified radius of a location.
    Returns tools sorted by distance, closest first.
    """
    # Get all tools with coordinates
    tools = (
        db.query(Tool)
        .options(joinedload(Tool.owner))
        .filter(Tool.lat.isnot(None), Tool.lng.isnot(None))
        .all()
    )

    # Calculate distances and filter by radius
    results = []
    for tool in tools:
        distance = haversine_distance(lat, lng, tool.lat, tool.lng)
        if distance <= radius_km:
            results.append(
                ToolWithDistance(
                    id=tool.id,
                    name=tool.name,
                    description=tool.description,
                    address=tool.address,
                    lat=tool.lat,
                    lng=tool.lng,
                    owner_id=tool.owner_id,
                    owner_email=tool.owner.email if tool.owner else None,
                    owner_name=tool.owner.full_name if tool.owner else None,
                    is_available=tool.is_available,
                    distance_km=round(distance, 2),
                )
            )

    # Sort by distance
    results.sort(key=lambda x: x.distance_km)
    return results
