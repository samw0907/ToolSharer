#!/usr/bin/env python3
"""
Upload curated tool icons to S3.

Usage:
    python scripts/upload_icons_to_s3.py

This script uploads all SVG icons from the frontend assets to S3.
It's designed to run locally or in a Docker container with S3 access.
"""
import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.s3 import ensure_bucket_exists, upload_file, list_files, get_file_url
from app.core.config import get_settings

# Icon keys matching frontend/src/assets/tool-icons/
ICON_KEYS = [
    "drill",
    "hammer",
    "saw",
    "wrench",
    "screwdriver",
    "pliers",
    "tape_measure",
    "level",
    "ladder",
    "shovel",
    "rake",
    "lawnmower",
    "wheelbarrow",
    "paint_roller",
    "sander",
    "axe",
]


def get_frontend_icons_dir() -> Path:
    """Get the path to frontend tool icons directory."""
    # When running in Docker, frontend is mounted at /frontend
    docker_icons_dir = Path("/frontend/src/assets/tool-icons")
    if docker_icons_dir.exists():
        return docker_icons_dir

    # Fallback for local development: relative to backend directory
    backend_dir = Path(__file__).parent.parent
    project_root = backend_dir.parent
    icons_dir = project_root / "frontend" / "src" / "assets" / "tool-icons"
    return icons_dir


def upload_icons():
    """Upload all curated icons to S3."""
    settings = get_settings()
    print(f"S3 Bucket: {settings.S3_BUCKET_NAME}")
    print(f"S3 Endpoint: {settings.S3_ENDPOINT_URL or 'AWS (default)'}")
    print()

    # Ensure bucket exists
    print("Ensuring S3 bucket exists...")
    if not ensure_bucket_exists():
        print("ERROR: Failed to ensure bucket exists")
        return False

    icons_dir = get_frontend_icons_dir()
    print(f"Icons directory: {icons_dir}")

    if not icons_dir.exists():
        print(f"ERROR: Icons directory not found: {icons_dir}")
        return False

    uploaded = 0
    failed = 0

    for icon_key in ICON_KEYS:
        svg_path = icons_dir / f"{icon_key}.svg"

        if not svg_path.exists():
            print(f"  SKIP: {icon_key}.svg not found")
            failed += 1
            continue

        # Read the SVG file
        with open(svg_path, "rb") as f:
            content = f.read()

        # Upload to S3 with path: icons/{key}.svg
        s3_key = f"icons/{icon_key}.svg"

        if upload_file(content, s3_key, content_type="image/svg+xml"):
            url = get_file_url(s3_key)
            print(f"  OK: {icon_key}.svg -> {url}")
            uploaded += 1
        else:
            print(f"  FAIL: {icon_key}.svg")
            failed += 1

    print()
    print(f"Upload complete: {uploaded} succeeded, {failed} failed")

    # List all icons in S3
    print()
    print("Icons in S3:")
    icons = list_files("icons/")
    for icon in icons:
        print(f"  - {icon}")

    return failed == 0


if __name__ == "__main__":
    success = upload_icons()
    sys.exit(0 if success else 1)
