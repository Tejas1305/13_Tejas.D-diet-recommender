from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import UserPref, UserAllergy, UserRating
from app.schemas import PreferenceReq, PreferenceRes, DayPlanRes, RatingReq, RecipeDetailsRes
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
    
@router.get("/recommendations", response_model=DayPlanRes)
def get_daily_recc( request: Request, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    
    """Get daily meal recommendations based on user preferences."""
    
    pref = db.query(UserPref).filter(UserPref.user_id == user_id).first()
    allergies = db.query(UserAllergy).filter(UserAllergy.user_id == user_id).all()
    
    allergy_list = [a.allergy for a in allergies]
    
   
    # If the user hasn't set preferences yet, use defaults
    pref_dict = {
    "diet_type": pref.diet_type if pref else "non_vegetarian",
    "daily_cal_goal": pref.daily_cal_goal if pref else 2000.0,
    "daily_prot_goal": pref.daily_prot_goal if pref else 50.0,
    "allergies": allergy_list
    }
    
    user_ratings = db.query(UserRating).filter(UserRating.user_id == user_id).all()
    ratings_list = [(r.recipe_id, r.rating) for r in user_ratings]
    
    # Generate the meal plan
    engine = request.app.state.recommender
    plan = engine.recommend_day(prefs = pref_dict, ratings = ratings_list, num_options = 3)
    
    return plan.as_dict()

@router.get("/recipes/{recipe_id}", response_model=RecipeDetailsRes)
def get_recipe(recipe_id: int, request: Request, user_id: int = Depends(get_current_user_id)):
    """Fetch full ingredient and instruction details for a specific recipe."""
    engine = request.app.state.recommender
    
    details = engine.get_recipe_details(recipe_id)
    if not details:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    return details

@router.post("/rate")
def rate_recipe(req: RatingReq, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Save or update a user's rating for a specific recipe."""
    
    # Check if the user has already rated this recipe
    existing_rating = db.query(UserRating).filter(
        UserRating.user_id == user_id, 
        UserRating.recipe_id == req.recipe_id
    ).first()
    
    if existing_rating:
        existing_rating.rating = req.rating
    else:
        new_rating = UserRating(
            user_id=user_id, 
            recipe_id=req.recipe_id, 
            rating=req.rating
        )
        db.add(new_rating)
        
    db.commit()
    return {"status": "success", "message": "Rating saved"}
