# app/core/config.py
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Core app settings
    APP_NAME: str = "ToolSharer API"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./toolsharer.db"

    # JWT Auth
    JWT_SECRET_KEY: str = "dev-secret-change-in-production"  # Change in .env for production!
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    # Frontend URL (for redirects after auth)
    FRONTEND_URL: str = "http://localhost:5173"

    # Dev mode - allows dev bypass login
    DEV_AUTH_ENABLED: bool = True

    # AWS settings
    AWS_REGION: str = "eu-north-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # S3 settings
    S3_ENDPOINT_URL: Optional[str] = None  # For LocalStack: http://localstack:4566
    S3_PUBLIC_ENDPOINT_URL: Optional[str] = None  # For frontend access: http://localhost:4566
    S3_BUCKET_NAME: str = "toolsharer-icons"

    # SES settings
    SES_ENDPOINT_URL: Optional[str] = None  # For LocalStack: http://localstack:4566
    SES_SENDER_EMAIL: str = "noreply@toolsharer.local"

    # Cognito placeholders (to fill later)
    COGNITO_USER_POOL_ID: Optional[str] = None
    COGNITO_CLIENT_ID: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
