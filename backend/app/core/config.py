# app/core/config.py
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Core app settings
    APP_NAME: str = "ToolSharer API"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+psycopg://user:password@localhost:5432/toolsharer"

    # AWS / Cognito placeholders (to fill later)
    AWS_REGION: str = "eu-north-1"
    COGNITO_USER_POOL_ID: Optional[str] = None
    COGNITO_CLIENT_ID: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
