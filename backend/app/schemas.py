from pydantic import BaseModel, EmailStr

class SignupReq(BaseModel):
    email: EmailStr
    password: str
    
class SignupRes(BaseModel):
    id: int
    email: EmailStr
    
class LoginReq(BaseModel):
    email: EmailStr
    password: str

class TokenRes(BaseModel):
    access_token: str
    token_type: str = "bearer"
    