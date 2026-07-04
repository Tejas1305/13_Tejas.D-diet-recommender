from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.schemas import SignupReq, SignupRes, LoginReq, TokenRes
from app.auth import hash_password, create_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=SignupRes, status_code=201)
def signup(signup_req: SignupReq, db: Session = Depends(get_db)):
    """Create new user with email and passowrd, rejects if the email is already registered."""
    
    existing_user = db.query(User).filter(User.email == signup_req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(email=signup_req.email, hashed_password=hash_password(signup_req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenRes)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login user with email and passoword, and return JWT token on success."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user.id)
    return TokenRes(access_token=token)

@router.post("/logout")
def logout():
    """Logout is done by client side discarding the token"""
    return {"detail": "Logout successful."}
