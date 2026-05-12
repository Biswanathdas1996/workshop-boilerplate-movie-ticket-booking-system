from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class SeatStatus(str, Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    SELECTED = "selected"


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


# User Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.USER


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: str
    created_at: datetime
    is_active: bool = True


class UserInDB(User):
    hashed_password: str


# Movie Models
class MovieBase(BaseModel):
    title: str
    description: str
    genre: list[str]
    duration_minutes: int
    release_date: datetime
    rating: float = Field(ge=0, le=10)
    poster_url: str
    trailer_youtube_id: Optional[str] = None
    language: str
    director: str
    cast: list[str]


class MovieCreate(MovieBase):
    pass


class Movie(MovieBase):
    id: str
    created_at: datetime
    is_active: bool = True


# Theater Models
class TheaterBase(BaseModel):
    name: str
    location: str
    city: str
    address: str


class TheaterCreate(TheaterBase):
    pass


class Theater(TheaterBase):
    id: str
    created_at: datetime


# Screen Models
class ScreenBase(BaseModel):
    theater_id: str
    name: str
    total_seats: int
    seat_layout: dict  # {"rows": 10, "columns": 15, "aisles": []}


class ScreenCreate(ScreenBase):
    pass


class Screen(ScreenBase):
    id: str
    created_at: datetime


# Show Models
class ShowBase(BaseModel):
    movie_id: str
    screen_id: str
    theater_id: str
    start_time: datetime
    end_time: datetime
    price: float = Field(gt=0)


class ShowCreate(ShowBase):
    pass


class Show(ShowBase):
    id: str
    created_at: datetime
    available_seats: int


# Seat Models
class SeatBase(BaseModel):
    show_id: str
    row: str
    number: int
    status: SeatStatus = SeatStatus.AVAILABLE


class Seat(SeatBase):
    id: str


# Booking Models
class BookingBase(BaseModel):
    user_id: str
    show_id: str
    seats: list[dict]  # [{"row": "A", "number": 1}, ...]
    total_amount: float


class BookingCreate(BookingBase):
    pass


class Booking(BookingBase):
    id: str
    booking_number: str
    status: BookingStatus
    created_at: datetime
    qr_code: Optional[str] = None


class BookingDetail(Booking):
    movie: Optional[dict] = None
    theater: Optional[dict] = None
    show: Optional[dict] = None


# Payment Models
class PaymentBase(BaseModel):
    booking_id: str
    amount: float
    payment_method: str  # "card", "upi", "wallet"


class PaymentCreate(PaymentBase):
    card_number: Optional[str] = None
    card_holder: Optional[str] = None


class Payment(PaymentBase):
    id: str
    status: PaymentStatus
    transaction_id: str
    created_at: datetime


# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None


# Search and Filter Models
class MovieSearchParams(BaseModel):
    query: Optional[str] = None
    genre: Optional[str] = None
    language: Optional[str] = None
    min_rating: Optional[float] = None


class ShowSearchParams(BaseModel):
    movie_id: Optional[str] = None
    theater_id: Optional[str] = None
    city: Optional[str] = None
    date: Optional[datetime] = None
