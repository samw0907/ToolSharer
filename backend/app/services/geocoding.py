# app/services/geocoding.py
"""
Geocoding service using OpenStreetMap Nominatim API.
Free to use with usage policy: https://operations.osmfoundation.org/policies/nominatim/
"""
import math
from typing import Optional
import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "ToolSharer/1.0 (portfolio project)"


class GeocodingResult:
    def __init__(self, lat: float, lng: float, formatted_address: str):
        self.lat = lat
        self.lng = lng
        self.formatted_address = formatted_address


async def geocode_address(address: str) -> Optional[GeocodingResult]:
    """
    Convert an address string to lat/lng coordinates using Nominatim.
    Returns None if geocoding fails.
    """
    if not address or not address.strip():
        return None

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                NOMINATIM_URL,
                params={
                    "q": address,
                    "format": "json",
                    "limit": 1,
                },
                headers={"User-Agent": USER_AGENT},
                timeout=10.0,
            )
            response.raise_for_status()
            results = response.json()

            if not results:
                return None

            result = results[0]
            return GeocodingResult(
                lat=float(result["lat"]),
                lng=float(result["lon"]),
                formatted_address=result.get("display_name", address),
            )
        except (httpx.HTTPError, KeyError, ValueError, IndexError):
            return None


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth (in km).
    Uses the Haversine formula.
    """
    R = 6371  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c
