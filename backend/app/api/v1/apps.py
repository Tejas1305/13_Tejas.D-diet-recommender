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
        return PreferenceRes(
            diet_type="non_vegetarian",
            daily_cal_goal=2000.0,
            daily_prot_goal=50.0,
            allergies=allergy_list,
            height=None,
            weight=None,
            age=None,
            activity_level=None
        )
        
    return PreferenceRes(
        diet_type=pref.diet_type,
        daily_cal_goal=pref.daily_cal_goal,
        daily_prot_goal=pref.daily_prot_goal,
        allergies=allergy_list,
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
    pref.height = req.height
    pref.weight = req.weight
    pref.age = req.age
    pref.activity_level = req.activity_level
    
    # Overwrite allergies: drop existing rows and insert the new ones
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
        height=pref.height,
        weight=pref.weight,
        age=pref.age,
        activity_level=pref.activity_level
    )