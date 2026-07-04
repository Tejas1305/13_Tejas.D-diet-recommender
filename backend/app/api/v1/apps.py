from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import UserPref, UserAllergy
from app.schemas import PreferenceReq, PreferenceRes
from app.auth import verify_token

router = APIRouter(prefix="/pref", tags=["preferences"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    """Dependency to extract and verify the JWT token from the request header."""
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


@router.get("", response_model=PreferenceRes)
def get_preferences(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Fetch user preferences and allergies."""
    pref = db.query(UserPref).filter(UserPref.user_id == user_id).first()
    allergies = db.query(UserAllergy).filter(UserAllergy.user_id == user_id).all()
    
    allergy_list = [a.allergy for a in allergies]
    
    if not pref:
        # No row yet for this user - fall back to PreferenceReq's own defaults
        # instead of repeating them here.
        return PreferenceRes(**PreferenceReq(allergies=allergy_list).model_dump())

    return PreferenceRes(
        diet_type=pref.diet_type,
        daily_cal_goal=pref.daily_cal_goal,
        daily_prot_goal=pref.daily_prot_goal,
        allergies=allergy_list,
        gender=pref.gender,
        height=pref.height,
        weight=pref.weight,
        age=pref.age,
        activity_level=pref.activity_level
    )


@router.put("", response_model=PreferenceRes)
def update_preferences(req: PreferenceReq, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Create or update user preferences and allergies."""
    pref = db.query(UserPref).filter(UserPref.user_id == user_id).first()
    
    if not pref:
        pref = UserPref(user_id=user_id)
        db.add(pref)
        
    pref.diet_type = req.diet_type
    pref.daily_cal_goal = req.daily_cal_goal
    pref.daily_prot_goal = req.daily_prot_goal
    pref.gender = req.gender
    pref.height = req.height
    pref.weight = req.weight
    pref.age = req.age
    pref.activity_level = req.activity_level
    
    # Overwrite allergies
    db.query(UserAllergy).filter(UserAllergy.user_id == user_id).delete()
    for allergy_name in req.allergies:
        db.add(UserAllergy(user_id=user_id, allergy=allergy_name.lower().strip()))
        
    db.commit()
    db.refresh(pref)
    
    return PreferenceRes(
        diet_type=pref.diet_type,
        daily_cal_goal=pref.daily_cal_goal,
        daily_prot_goal=pref.daily_prot_goal,
        allergies=req.allergies,
        gender=pref.gender,
        height=pref.height,
        weight=pref.weight,
        age=pref.age,
        activity_level=pref.activity_level
    )