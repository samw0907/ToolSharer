# app/api/users.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserRead])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users


@router.post("/", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email, full_name=payload.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
