from pydantic import BaseModel, EmailStr, Field

class SignupReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    
class SignupRes(BaseModel):
    id: int
    email: EmailStr
    
class LoginReq(BaseModel):
    email: EmailStr
    password: str

class TokenRes(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class PreferenceReq(BaseModel):
    diet_type: str | None = "non_vegetarian"
    daily_cal_goal: float | None = 2000.0
    daily_prot_goal: float | None = 50.0
    allergies: list[str] = []
    gender: str | None = None
    height: float | None = None
    weight: float | None = None
    age: int | None = None
    activity_level: str | None = None

class PreferenceRes(BaseModel):
    diet_type: str | None
    daily_cal_goal: float | None
    daily_prot_goal: float | None
    allergies: list[str]
    gender: str | None
    height: float | None
    weight: float | None
    age: int | None
    activity_level: str | None
    
class MealOption(BaseModel):
    slot: str
    recipe_id: int
    title: str
    calories: float
    protein: float
    explanation: str

class DayPlanRes(BaseModel):
    meals: dict[str, list[MealOption]]
    cold_start: bool
    
class RatingReq(BaseModel):
    recipe_id: int
    rating: int
    
class RecipeDetailsRes(BaseModel):
    recipe_id: int
    title: str
    ingredients: list[str]
    directions: list[str]
    calories: float
    protein: float
    
class ShoppingItemReq(BaseModel):
    ingredient_name: str

class ShoppingItemRes(BaseModel):
    id: int
    ingredient_name: str
    is_bought: bool

    class Config:
        from_attributes = True