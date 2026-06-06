from pydantic import BaseModel
from typing import Optional

class ProfileBase(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class ProfileCreate(ProfileBase):
    id: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    bio: Optional[str] = None

class Profile(ProfileBase):
    id: str

    class Config:
        from_attributes = True
        populate_by_name = True
