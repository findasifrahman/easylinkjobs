from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=6, max_length=32)


class CandidateSignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=32)


class CompanySignupIn(BaseModel):
    company_name: str = Field(min_length=2, max_length=160)
    contact_name: str = Field(min_length=2, max_length=120)
    contact_designation: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=6, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    website: str | None = Field(default=None, max_length=240)
    company_type: Literal["CHINESE", "WFOE", "RO", "FOREIGN_STARTUP", "AGENCY", "OTHER"] = "OTHER"
    org_size: Literal["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"] = "SMALL"
    address_line_1: str = Field(min_length=4, max_length=255)
    city: str = Field(min_length=2, max_length=120)
    province: str | None = Field(default=None, max_length=120)
    country: str = Field(min_length=2, max_length=120)
    business_license_no: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=1000)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=16, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str
