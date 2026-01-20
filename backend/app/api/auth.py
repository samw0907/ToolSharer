# app/api/auth.py
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.auth import create_access_token, get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import DevLoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


# =============================================================================
# Google OAuth Endpoints
# =============================================================================

@router.get("/google/login")
def google_login():
    """Redirect to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth not configured. Use /auth/dev/login for development.",
        )

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback, exchange code for tokens, create/update user."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth not configured",
        )

    # Exchange authorization code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            },
        )

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code",
            )

        tokens = token_response.json()
        id_token = tokens.get("id_token")

        # Get user info from Google
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google",
            )

        google_user = userinfo_response.json()

    # Extract user info
    google_sub = google_user.get("sub")
    email = google_user.get("email")
    full_name = google_user.get("name")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google",
        )

    # Find or create user
    user = db.query(User).filter(User.google_sub == google_sub).first()

    if not user:
        # Check if user exists by email (might have been created via dev login)
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link Google account to existing user
            user.google_sub = google_sub
            if full_name and not user.full_name:
                user.full_name = full_name
        else:
            # Create new user
            user = User(email=email, full_name=full_name, google_sub=google_sub)
            db.add(user)

    db.commit()
    db.refresh(user)

    # Create JWT token
    access_token = create_access_token(user.id)

    # Redirect to frontend with token
    redirect_url = f"{settings.FRONTEND_URL}?token={access_token}"
    return RedirectResponse(url=redirect_url)


# =============================================================================
# Dev Bypass Login (only available when DEV_AUTH_ENABLED=True)
# =============================================================================

@router.post("/dev/login", response_model=TokenResponse)
def dev_login(request: DevLoginRequest, db: Session = Depends(get_db)):
    """
    Development-only login endpoint.
    Creates or finds a user by email and returns a JWT token.
    Only available when DEV_AUTH_ENABLED=True in settings.
    """
    if not settings.DEV_AUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is disabled in this environment",
        )

    # Find or create user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        user = User(email=request.email, full_name=request.full_name)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif request.full_name and not user.full_name:
        # Update full_name if provided and not set
        user.full_name = request.full_name
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id)
    return TokenResponse(access_token=access_token)


# =============================================================================
# Current User Endpoint
# =============================================================================

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user."""
    return current_user


@router.post("/logout")
def logout():
    """
    Logout endpoint. Since we use stateless JWTs, this is just a no-op.
    The frontend should discard the token.
    """
    return {"message": "Logged out successfully"}
