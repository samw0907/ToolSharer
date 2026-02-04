# app/api/icons.py
"""
API endpoints for tool icons stored in S3.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.s3 import list_files, get_file_url, file_exists, ensure_bucket_exists

router = APIRouter(prefix="/icons", tags=["icons"])


class IconInfo(BaseModel):
    key: str
    url: str


class IconsResponse(BaseModel):
    icons: list[IconInfo]


class S3HealthResponse(BaseModel):
    status: str
    bucket_exists: bool
    icon_count: int
    endpoint: Optional[str] = None


@router.get("/health", response_model=S3HealthResponse)
async def check_s3_health():
    """
    Check S3 connectivity and bucket status.
    Useful for debugging LocalStack setup.
    """
    from app.core.config import get_settings
    settings = get_settings()

    bucket_ok = ensure_bucket_exists()
    icons = list_files("icons/") if bucket_ok else []

    return S3HealthResponse(
        status="ok" if bucket_ok else "error",
        bucket_exists=bucket_ok,
        icon_count=len(icons),
        endpoint=settings.S3_ENDPOINT_URL,
    )


@router.get("", response_model=IconsResponse)
async def list_icons():
    """
    List all available tool icons from S3.
    Returns icon keys and their S3 URLs.
    """
    icon_keys = list_files("icons/")

    icons = []
    for s3_key in icon_keys:
        # Extract icon name from path (e.g., "icons/drill.svg" -> "drill")
        if s3_key.startswith("icons/") and s3_key.endswith(".svg"):
            key = s3_key[6:-4]  # Remove "icons/" prefix and ".svg" suffix
            icons.append(IconInfo(
                key=key,
                url=get_file_url(s3_key),
            ))

    return IconsResponse(icons=icons)


@router.get("/{icon_key}", response_model=IconInfo)
async def get_icon(icon_key: str):
    """
    Get URL for a specific icon by key.
    Returns 404 if icon doesn't exist.
    """
    s3_key = f"icons/{icon_key}.svg"

    if not file_exists(s3_key):
        raise HTTPException(status_code=404, detail=f"Icon '{icon_key}' not found")

    return IconInfo(
        key=icon_key,
        url=get_file_url(s3_key),
    )
