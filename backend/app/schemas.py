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
    