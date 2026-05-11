from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class SeatStatus(str, Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    LOCKED = "locked"


class SeatCategory(str, Enum):
    VIP = "vip"
    PREMIUM = "premium"
    REGULAR = "regular"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class NotificationType(str, Enum):
    BOOKING = "booking"
    CANCELLATION = "cancellation"
    PROMOTION = "promotion"
    REMINDER = "reminder"


# User Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    language: str = "en"
    theme: str = "light"


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: str
    role: UserRole
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Movie Models
class MovieBase(BaseModel):
    title: str
    synopsis: str
    genre: List[str]
    language: str
    duration: int
    release_date: str
    cast: List[str]
    director: str
    trailer_url: Optional[str] = None
    poster_url: Optional[str] = None
    rating: Optional[float] = 0.0
    is_featured: bool = False
    is_trending: bool = False


class MovieCreate(MovieBase):
    pass


class MovieUpdate(BaseModel):
    title: Optional[str] = None
    synopsis: Optional[str] = None
    genre: Optional[List[str]] = None
    language: Optional[str] = None
    duration: Optional[int] = None
    release_date: Optional[str] = None
    cast: Optional[List[str]] = None
    director: Optional[str] = None
    trailer_url: Optional[str] = None
    poster_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_trending: Optional[bool] = None


class MovieResponse(MovieBase):
    id: str
    created_at: datetime
    average_rating: float = 0.0
    total_reviews: int = 0
    model_config = ConfigDict(from_attributes=True)


# Theater & Screen Models
class SeatLayout(BaseModel):
    row: str
    number: int
    category: SeatCategory
    price: float


class ScreenBase(BaseModel):
    name: str
    capacity: int
    seat_layout: List[SeatLayout]


class ScreenCreate(ScreenBase):
    theater_id: str


class ScreenResponse(ScreenBase):
    id: str
    theater_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TheaterBase(BaseModel):
    name: str
    location: str
    city: str


class TheaterCreate(TheaterBase):
    pass


class TheaterResponse(TheaterBase):
    id: str
    screens: List[ScreenResponse] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Show Models
class ShowBase(BaseModel):
    movie_id: str
    screen_id: str
    show_date: str
    show_time: str


class ShowCreate(ShowBase):
    pass


class ShowResponse(ShowBase):
    id: str
    available_seats: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Booking Models
class SeatSelection(BaseModel):
    row: str
    number: int
    category: SeatCategory
    price: float


class BookingBase(BaseModel):
    show_id: str
    seats: List[SeatSelection]
    promo_code: Optional[str] = None


class BookingCreate(BookingBase):
    pass


class BookingResponse(BaseModel):
    id: str
    user_id: str
    show_id: str
    movie_title: str
    theater_name: str
    screen_name: str
    show_date: str
    show_time: str
    seats: List[SeatSelection]
    total_amount: float
    discount_amount: float
    final_amount: float
    status: BookingStatus
    qr_code: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Payment Models
class PaymentSimulation(BaseModel):
    booking_id: str
    payment_method: str
    simulate_failure: bool = False


class PaymentResponse(BaseModel):
    id: str
    booking_id: str
    amount: float
    status: PaymentStatus
    payment_method: str
    transaction_id: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Review Models
class ReviewCreate(BaseModel):
    movie_id: str
    rating: float = Field(ge=1.0, le=5.0)
    comment: Optional[str] = None


class ReviewResponse(ReviewCreate):
    id: str
    user_id: str
    user_name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Promo Code Models
class PromoCodeCreate(BaseModel):
    code: str
    discount_percent: float
    max_uses: int
    valid_until: datetime
    min_amount: float = 0.0


class PromoCodeResponse(PromoCodeCreate):
    id: str
    current_uses: int = 0
    is_active: bool = True
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PromoCodeValidation(BaseModel):
    code: str
    amount: float


# Notification Models
class NotificationCreate(BaseModel):
    user_id: str
    type: NotificationType
    title: str
    message: str
    related_id: Optional[str] = None


class NotificationResponse(NotificationCreate):
    id: str
    is_read: bool = False
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Admin Dashboard Models
class DashboardStats(BaseModel):
    total_revenue: float
    total_bookings: int
    total_users: int
    occupancy_rate: float
    top_movies: List[Dict[str, Any]]
    recent_bookings: List[BookingResponse]


# Audit Log Models
class AuditLogCreate(BaseModel):
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    details: Optional[Dict[str, Any]] = None


class AuditLogResponse(AuditLogCreate):
    id: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)


# Report Models
class BookingReportFilter(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    movie_id: Optional[str] = None
    theater_id: Optional[str] = None
    format: str = "csv"  # csv or pdf
