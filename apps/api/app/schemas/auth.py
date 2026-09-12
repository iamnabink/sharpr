from pydantic import EmailStr, Field

from app.schemas.base import CamelModel


class RegisterIn(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    name: str = ""


class LoginIn(CamelModel):
    email: EmailStr
    password: str


class UserOut(CamelModel):
    id: str
    email: str
    name: str
    role: str
    created_at: int


class TokenOut(CamelModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
