from functools import lru_cache
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List
import io
import csv

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import ObjectId
from slowapi.errors import RateLimitExceeded

from .models import *
from .auth import *
from .database import get_database, init_indexes, seed_dummy_movies
from .utils import *
from .rate_limiter import get_limiter

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

frontend_port = os.getenv('FRONTEND_PORT', '5173')
backend_port = os.getenv('BACKEND_PORT', '8000')

app = FastAPI(title='Movie Ticket Booking API')
limiter = get_limiter()
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Rate limit exceeded. Please try again later."}
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[f'http://localhost:{frontend_port}', 'http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event("startup")
async def startup_event():
    init_indexes()
    inserted = seed_dummy_movies()
    if inserted:
        print(f"Seeded {inserted} dummy movies.")


# Health Check
@app.get('/api/health')
def health_check() -> dict:
    backend_status = 'connected'
    database_status = 'disconnected'
    database_name = None

    try:
        db = get_database()
        db.command('ping')
        database_name = db.name
        database_status = 'connected'
    except (PyMongoError, RuntimeError):
        database_status = 'disconnected'

    return {
        'frontend': 'active',
        'backend': backend_status,
        'database': database_status,
        'databaseName': database_name,
        'backendPort': backend_port,
    }


# ============= AUTHENTICATION ROUTES =============

@app.post('/api/auth/register', response_model=Token)
@limiter.limit("5/minute")
async def register(request: Request, user: UserCreate):
    """KAN-378: User Registration"""
    db = get_database()

    # Check if user exists
    if db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user_data = user.model_dump()
    user_data['password'] = get_password_hash(user_data['password'])
    user_data['role'] = UserRole.USER
    user_data['is_active'] = True
    user_data['created_at'] = datetime.utcnow()

    result = db.users.insert_one(user_data)
    user_data['id'] = str(result.inserted_id)
    user_data.pop('_id', None)
    user_data.pop('password')

    # Create access token
    token = create_access_token({"sub": user_data['id'], "email": user.email, "role": user_data['role']})

    return Token(access_token=token, user=UserResponse(**user_data))


@app.post('/api/auth/login', response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    """KAN-378: User Login"""
    db = get_database()

    user = db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get('is_active', True):
        raise HTTPException(status_code=400, detail="User account is deactivated")

    user['id'] = str(user['_id'])
    user.pop('_id')
    user.pop('password')

    # KAN-379: JWT Authentication
    token = create_access_token({"sub": user['id'], "email": user['email'], "role": user['role'], "is_active": user['is_active']})

    return Token(access_token=token, user=UserResponse(**user))


@app.post('/api/auth/password-reset')
async def request_password_reset(reset: PasswordReset):
    """KAN-400: Password Reset Functionality"""
    db = get_database()
    user = db.users.find_one({"email": reset.email})

    if user:
        token = create_password_reset_token(reset.email)
        # Send email with reset link (stub)
        send_email_notification(
            reset.email,
            "Password Reset Request",
            f"Click here to reset your password: http://localhost:{frontend_port}/reset-password?token={token}"
        )

    return {"message": "If the email exists, a reset link has been sent"}


@app.post('/api/auth/password-reset/confirm')
async def confirm_password_reset(reset: PasswordResetConfirm):
    """KAN-400: Password Reset Confirmation"""
    email = verify_password_reset_token(reset.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    db = get_database()
    db.users.update_one(
        {"email": email},
        {"$set": {"password": get_password_hash(reset.new_password)}}
    )

    return {"message": "Password reset successful"}


@app.get('/api/auth/me', response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    """Get current user information"""
    db = get_database()
    user = db.users.find_one({"_id": ObjectId(current_user['sub'])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user['id'] = str(user['_id'])
    user.pop('_id')
    user.pop('password')
    return UserResponse(**user)


@app.put('/api/auth/me', response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update current user profile (KAN-415: theme, KAN-416: language)"""
    db = get_database()
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}

    if update_data:
        db.users.update_one(
            {"_id": ObjectId(current_user['sub'])},
            {"$set": update_data}
        )

    user = db.users.find_one({"_id": ObjectId(current_user['sub'])})
    user['id'] = str(user['_id'])
    user.pop('_id')
    user.pop('password')
    return UserResponse(**user)


# ============= MOVIE ROUTES =============

@app.get('/api/movies', response_model=List[MovieResponse])
async def list_movies(
    search: Optional[str] = None,
    genre: Optional[str] = None,
    language: Optional[str] = None,
    featured: Optional[bool] = None,
    trending: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50
):
    """KAN-380: Movie Listings, KAN-381: Search & Filter, KAN-402: Featured/Trending"""
    db = get_database()
    query = {}

    if search:
        query['title'] = {'$regex': search, '$options': 'i'}
    if genre:
        query['genre'] = genre
    if language:
        query['language'] = language
    if featured is not None:
        query['is_featured'] = featured
    if trending is not None:
        query['is_trending'] = trending

    movies = list(db.movies.find(query).skip(skip).limit(limit))

    result = []
    for movie in movies:
        movie['id'] = str(movie['_id'])
        movie.pop('_id')

        # Calculate average rating
        reviews = list(db.reviews.find({"movie_id": movie['id']}))
        if reviews:
            movie['average_rating'] = sum(r['rating'] for r in reviews) / len(reviews)
            movie['total_reviews'] = len(reviews)
        else:
            movie['average_rating'] = 0.0
            movie['total_reviews'] = 0

        result.append(MovieResponse(**movie))

    return result


@app.get('/api/movies/{movie_id}', response_model=MovieResponse)
async def get_movie(movie_id: str):
    """KAN-382: Movie Detail Page"""
    db = get_database()
    movie = db.movies.find_one({"_id": ObjectId(movie_id)})

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    movie['id'] = str(movie['_id'])
    movie.pop('_id')

    # Calculate average rating
    reviews = list(db.reviews.find({"movie_id": movie_id}))
    if reviews:
        movie['average_rating'] = sum(r['rating'] for r in reviews) / len(reviews)
        movie['total_reviews'] = len(reviews)
    else:
        movie['average_rating'] = 0.0
        movie['total_reviews'] = 0

    return MovieResponse(**movie)


@app.post('/api/movies', response_model=MovieResponse)
async def create_movie(
    movie: MovieCreate,
    current_user: dict = Depends(require_admin)
):
    """KAN-393: Movie CRUD (Admin)"""
    db = get_database()

    movie_data = movie.model_dump()
    movie_data['created_at'] = datetime.utcnow()
    movie_data['average_rating'] = 0.0
    movie_data['total_reviews'] = 0

    result = db.movies.insert_one(movie_data)
    movie_data['id'] = str(result.inserted_id)
    movie_data.pop('_id', None)

    # KAN-418: Audit logging
    db.audit_logs.insert_one({
        "user_id": current_user['sub'],
        "action": "create_movie",
        "entity_type": "movie",
        "entity_id": movie_data['id'],
        "details": {"title": movie.title},
        "timestamp": datetime.utcnow()
    })

    return MovieResponse(**movie_data)


@app.put('/api/movies/{movie_id}', response_model=MovieResponse)
async def update_movie(
    movie_id: str,
    movie_update: MovieUpdate,
    current_user: dict = Depends(require_admin)
):
    """KAN-393: Movie CRUD (Admin)"""
    db = get_database()

    update_data = {k: v for k, v in movie_update.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = db.movies.update_one(
        {"_id": ObjectId(movie_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Movie not found")

    # KAN-418: Audit logging
    db.audit_logs.insert_one({
        "user_id": current_user['sub'],
        "action": "update_movie",
        "entity_type": "movie",
        "entity_id": movie_id,
        "details": update_data,
        "timestamp": datetime.utcnow()
    })

    return await get_movie(movie_id)


@app.delete('/api/movies/{movie_id}')
async def delete_movie(movie_id: str, current_user: dict = Depends(require_admin)):
    """KAN-393: Movie CRUD (Admin)"""
    db = get_database()

    result = db.movies.delete_one({"_id": ObjectId(movie_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Movie not found")

    # KAN-418: Audit logging
    db.audit_logs.insert_one({
        "user_id": current_user['sub'],
        "action": "delete_movie",
        "entity_type": "movie",
        "entity_id": movie_id,
        "details": {},
        "timestamp": datetime.utcnow()
    })

    return {"message": "Movie deleted successfully"}


# ============= REVIEW ROUTES =============

@app.post('/api/movies/{movie_id}/reviews', response_model=ReviewResponse)
async def create_review(
    movie_id: str,
    review: ReviewCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """KAN-401: User Movie Ratings and Reviews"""
    db = get_database()

    # Check if movie exists
    if not db.movies.find_one({"_id": ObjectId(movie_id)}):
        raise HTTPException(status_code=404, detail="Movie not found")

    # Check if user already reviewed
    if db.reviews.find_one({"movie_id": movie_id, "user_id": current_user['sub']}):
        raise HTTPException(status_code=400, detail="You have already reviewed this movie")

    review_data = review.model_dump()
    review_data['user_id'] = current_user['sub']
    review_data['created_at'] = datetime.utcnow()

    # Get user name
    user = db.users.find_one({"_id": ObjectId(current_user['sub'])})
    review_data['user_name'] = user.get('full_name', 'Anonymous')

    result = db.reviews.insert_one(review_data)
    review_data['id'] = str(result.inserted_id)
    review_data.pop('_id', None)

    return ReviewResponse(**review_data)


@app.get('/api/movies/{movie_id}/reviews', response_model=List[ReviewResponse])
async def get_movie_reviews(movie_id: str, skip: int = 0, limit: int = 50):
    """Get reviews for a movie"""
    db = get_database()
    reviews = list(db.reviews.find({"movie_id": movie_id}).skip(skip).limit(limit).sort("created_at", -1))

    result = []
    for review in reviews:
        review['id'] = str(review['_id'])
        review.pop('_id')
        result.append(ReviewResponse(**review))

    return result


# ============= THEATER & SCREEN ROUTES =============

@app.post('/api/theaters', response_model=TheaterResponse)
async def create_theater(
    theater: TheaterCreate,
    current_user: dict = Depends(require_admin)
):
    """KAN-383: Theater Management"""
    db = get_database()

    theater_data = theater.model_dump()
    theater_data['created_at'] = datetime.utcnow()
    theater_data['screens'] = []

    result = db.theaters.insert_one(theater_data)
    theater_data['id'] = str(result.inserted_id)
    theater_data.pop('_id', None)

    # KAN-418: Audit logging
    db.audit_logs.insert_one({
        "user_id": current_user['sub'],
        "action": "create_theater",
        "entity_type": "theater",
        "entity_id": theater_data['id'],
        "details": {"name": theater.name},
        "timestamp": datetime.utcnow()
    })

    return TheaterResponse(**theater_data)


@app.get('/api/theaters', response_model=List[TheaterResponse])
async def list_theaters(city: Optional[str] = None):
    """List all theaters"""
    db = get_database()
    query = {}
    if city:
        query['city'] = city

    theaters = list(db.theaters.find(query))

    result = []
    for theater in theaters:
        theater['id'] = str(theater['_id'])
        theater.pop('_id')

        # Get screens for this theater
        screens = list(db.screens.find({"theater_id": theater['id']}))
        theater['screens'] = []
        for screen in screens:
            screen['id'] = str(screen['_id'])
            screen.pop('_id')
            theater['screens'].append(ScreenResponse(**screen))

        result.append(TheaterResponse(**theater))

    return result


@app.post('/api/screens', response_model=ScreenResponse)
async def create_screen(
    screen: ScreenCreate,
    current_user: dict = Depends(require_admin)
):
    """KAN-383: Screen Management, KAN-409: Visual Seat Layout Editor"""
    db = get_database()

    # Verify theater exists
    if not db.theaters.find_one({"_id": ObjectId(screen.theater_id)}):
        raise HTTPException(status_code=404, detail="Theater not found")

    screen_data = screen.model_dump()
    screen_data['created_at'] = datetime.utcnow()

    result = db.screens.insert_one(screen_data)
    screen_data['id'] = str(result.inserted_id)
    screen_data.pop('_id', None)

    # KAN-418: Audit logging
    db.audit_logs.insert_one({
        "user_id": current_user['sub'],
        "action": "create_screen",
        "entity_type": "screen",
        "entity_id": screen_data['id'],
        "details": {"name": screen.name, "theater_id": screen.theater_id},
        "timestamp": datetime.utcnow()
    })

    return ScreenResponse(**screen_data)


# ============= SHOW ROUTES =============

@app.post('/api/shows', response_model=ShowResponse)
async def create_show(
    show: ShowCreate,
    current_user: dict = Depends(require_admin)
):
    """KAN-385: Show Scheduling, KAN-394: Show CRUD (Admin)"""
    db = get_database()

    # Verify movie and screen exist
    if not db.movies.find_one({"_id": ObjectId(show.movie_id)}):
        raise HTTPException(status_code=404, detail="Movie not found")

    screen = db.screens.find_one({"_id": ObjectId(show.screen_id)})
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    # Check for scheduling conflicts
    conflict = db.shows.find_one({
        "screen_id": show.screen_id,
        "show_date": show.show_date,
        "show_time": show.show_time
    })

    if conflict:
        raise HTTPException(status_code=400, detail="Show time conflict detected")

    show_data = show.model_dump()
    show_data['available_seats'] = screen['capacity']
    show_data['created_at'] = datetime.utcnow()

    result = db.shows.insert_one(show_data)
    show_data['id'] = str(result.inserted_id)
    show_data.pop('_id', None)

    # KAN-418: Audit logging
    db.audit_logs.insert_one({
        "user_id": current_user['sub'],
        "action": "create_show",
        "entity_type": "show",
        "entity_id": show_data['id'],
        "details": show_data,
        "timestamp": datetime.utcnow()
    })

    return ShowResponse(**show_data)


@app.get('/api/shows', response_model=List[ShowResponse])
async def list_shows(
    movie_id: Optional[str] = None,
    date: Optional[str] = None,
    theater_id: Optional[str] = None
):
    """KAN-386: Multiple Show Timings"""
    db = get_database()
    query = {}

    if movie_id:
        query['movie_id'] = movie_id
    if date:
        query['show_date'] = date
    if theater_id:
        # Find all screens for this theater
        screens = list(db.screens.find({"theater_id": theater_id}))
        screen_ids = [str(s['_id']) for s in screens]
        query['screen_id'] = {'$in': screen_ids}

    shows = list(db.shows.find(query).sort("show_time", 1))

    result = []
    for show in shows:
        show['id'] = str(show['_id'])
        show.pop('_id')
        result.append(ShowResponse(**show))

    return result


@app.get('/api/shows/{show_id}/seats')
async def get_show_seats(show_id: str):
    """KAN-384: Seat Map & Visual Selection, KAN-403: Tiered Seat Pricing"""
    db = get_database()

    show = db.shows.find_one({"_id": ObjectId(show_id)})
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    screen = db.screens.find_one({"_id": ObjectId(show['screen_id'])})
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    # Get booked seats
    bookings = list(db.bookings.find({"show_id": show_id, "status": {"$ne": BookingStatus.CANCELLED}}))
    booked_seats = []
    for booking in bookings:
        for seat in booking['seats']:
            booked_seats.append(f"{seat['row']}{seat['number']}")

    # Mark seat status
    seat_map = []
    for seat in screen['seat_layout']:
        seat_info = seat.copy()
        seat_key = f"{seat['row']}{seat['number']}"
        seat_info['status'] = SeatStatus.BOOKED if seat_key in booked_seats else SeatStatus.AVAILABLE
        seat_map.append(seat_info)

    return {"seats": seat_map, "show_id": show_id}


# ============= BOOKING ROUTES =============

@app.post('/api/bookings', response_model=BookingResponse)
@limiter.limit("10/minute")
async def create_booking(
    request: Request,
    booking: BookingCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """KAN-387: Booking Flow, KAN-388: Booking Summary"""
    db = get_database()

    # Verify show exists
    show = db.shows.find_one({"_id": ObjectId(booking.show_id)})
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    # Get movie and screen details
    movie = db.movies.find_one({"_id": ObjectId(show['movie_id'])})
    screen = db.screens.find_one({"_id": ObjectId(show['screen_id'])})
    theater = db.theaters.find_one({"_id": ObjectId(screen['theater_id'])})

    # Check seat availability
    existing_bookings = list(db.bookings.find({
        "show_id": booking.show_id,
        "status": {"$ne": BookingStatus.CANCELLED}
    }))

    booked_seats = set()
    for existing in existing_bookings:
        for seat in existing['seats']:
            booked_seats.add(f"{seat['row']}{seat['number']}")

    for seat in booking.seats:
        seat_key = f"{seat.row}{seat.number}"
        if seat_key in booked_seats:
            raise HTTPException(status_code=400, detail=f"Seat {seat_key} is already booked")

    # Calculate total
    total_amount = sum(seat.price for seat in booking.seats)
    discount_amount = 0.0

    # KAN-406: Apply promo code
    if booking.promo_code:
        promo = db.promo_codes.find_one({"code": booking.promo_code, "is_active": True})
        if promo:
            if promo['current_uses'] >= promo['max_uses']:
                raise HTTPException(status_code=400, detail="Promo code usage limit reached")
            if datetime.utcnow() > promo['valid_until']:
                raise HTTPException(status_code=400, detail="Promo code has expired")
            if total_amount < promo.get('min_amount', 0):
                raise HTTPException(status_code=400, detail=f"Minimum amount ${promo['min_amount']} required")

            discount_amount = calculate_discount(total_amount, promo)

            # Update promo code usage
            db.promo_codes.update_one(
                {"_id": promo['_id']},
                {"$inc": {"current_uses": 1}}
            )

    final_amount = total_amount - discount_amount

    # Create booking
    booking_data = {
        "id": generate_booking_id(),
        "user_id": current_user['sub'],
        "show_id": booking.show_id,
        "movie_title": movie['title'],
        "theater_name": theater['name'],
        "screen_name": screen['name'],
        "show_date": show['show_date'],
        "show_time": show['show_time'],
        "seats": [seat.model_dump() for seat in booking.seats],
        "total_amount": total_amount,
        "discount_amount": discount_amount,
        "final_amount": final_amount,
        "status": BookingStatus.PENDING,
        "qr_code": None,
        "created_at": datetime.utcnow()
    }

    result = db.bookings.insert_one(booking_data)
    booking_data.pop('_id')

    # Update available seats
    db.shows.update_one(
        {"_id": ObjectId(booking.show_id)},
        {"$inc": {"available_seats": -len(booking.seats)}}
    )

    return BookingResponse(**booking_data)


@app.post('/api/bookings/{booking_id}/confirm', response_model=BookingResponse)
async def confirm_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """KAN-389: Booking Confirmation & QR Code"""
    db = get_database()

    booking = db.bookings.find_one({"id": booking_id, "user_id": current_user['sub']})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking['status'] != BookingStatus.PENDING:
        raise HTTPException(status_code=400, detail="Booking already processed")

    # Generate QR code
    qr_data = f"BOOKING:{booking_id}"
    qr_code = generate_qr_code(qr_data)

    # Update booking
    db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": BookingStatus.CONFIRMED, "qr_code": qr_code}}
    )

    booking['status'] = BookingStatus.CONFIRMED
    booking['qr_code'] = qr_code

    # KAN-395: Send confirmation email
    user = db.users.find_one({"_id": ObjectId(current_user['sub'])})
    email_content = format_booking_email(booking)
    send_email_notification(user['email'], "Booking Confirmation", email_content)

    # KAN-412: Create in-app notification
    db.notifications.insert_one({
        "user_id": current_user['sub'],
        "type": NotificationType.BOOKING,
        "title": "Booking Confirmed",
        "message": f"Your booking for {booking['movie_title']} is confirmed",
        "related_id": booking_id,
        "is_read": False,
        "created_at": datetime.utcnow()
    })

    # KAN-413: Send SMS (stub)
    if user.get('phone'):
        send_sms_notification(user['phone'], f"Booking confirmed: {booking_id}")

    # KAN-414: Send push notification (stub)
    send_push_notification(current_user['sub'], "Booking Confirmed", f"Your booking for {booking['movie_title']} is confirmed")

    booking.pop('_id', None)
    return BookingResponse(**booking)


@app.get('/api/bookings', response_model=List[BookingResponse])
async def list_bookings(
    current_user: dict = Depends(get_current_active_user),
    status: Optional[BookingStatus] = None
):
    """KAN-390: Booking History"""
    db = get_database()

    query = {"user_id": current_user['sub']}
    if status:
        query['status'] = status

    bookings = list(db.bookings.find(query).sort("created_at", -1))

    result = []
    for booking in bookings:
        booking.pop('_id')
        result.append(BookingResponse(**booking))

    return result


@app.post('/api/bookings/{booking_id}/cancel')
async def cancel_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """KAN-404: Booking Cancellation with Refund Policy"""
    db = get_database()

    booking = db.bookings.find_one({"id": booking_id, "user_id": current_user['sub']})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking['status'] == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking already cancelled")

    # Check cancellation window (e.g., 2 hours before show)
    show = db.shows.find_one({"_id": ObjectId(booking['show_id'])})
    show_datetime = datetime.strptime(f"{show['show_date']} {show['show_time']}", "%Y-%m-%d %H:%M")
    if datetime.utcnow() > show_datetime - timedelta(hours=2):
        raise HTTPException(status_code=400, detail="Cancellation window closed")

    # Update booking status
    db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": BookingStatus.CANCELLED}}
    )

    # Release seats
    db.shows.update_one(
        {"_id": ObjectId(booking['show_id'])},
        {"$inc": {"available_seats": len(booking['seats'])}}
    )

    # KAN-408: Process refund
    payment = db.payments.find_one({"booking_id": booking_id, "status": PaymentStatus.SUCCESS})
    if payment:
        db.payments.update_one(
            {"_id": payment['_id']},
            {"$set": {"status": PaymentStatus.REFUNDED}}
        )

    # Send cancellation notification
    user = db.users.find_one({"_id": ObjectId(current_user['sub'])})
    send_email_notification(user['email'], "Booking Cancelled", f"Your booking {booking_id} has been cancelled and refunded")

    # KAN-412: Create in-app notification
    db.notifications.insert_one({
        "user_id": current_user['sub'],
        "type": NotificationType.CANCELLATION,
        "title": "Booking Cancelled",
        "message": f"Your booking for {booking['movie_title']} has been cancelled",
        "related_id": booking_id,
        "is_read": False,
        "created_at": datetime.utcnow()
    })

    return {"message": "Booking cancelled and refund initiated"}


@app.get('/api/bookings/{booking_id}/receipt')
async def download_receipt(
    booking_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """KAN-407: PDF Receipts Generation"""
    db = get_database()

    booking = db.bookings.find_one({"id": booking_id, "user_id": current_user['sub']})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.pop('_id')
    pdf_bytes = generate_receipt_pdf(booking)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=receipt_{booking_id}.pdf"}
    )


# ============= PAYMENT ROUTES =============

@app.post('/api/payments/simulate', response_model=PaymentResponse)
@limiter.limit("10/minute")
async def simulate_payment(
    request: Request,
    payment: PaymentSimulation,
    current_user: dict = Depends(get_current_active_user)
):
    """KAN-391: Payment Simulation"""
    db = get_database()

    booking = db.bookings.find_one({"id": payment.booking_id, "user_id": current_user['sub']})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Simulate payment
    payment_status = PaymentStatus.FAILED if payment.simulate_failure else PaymentStatus.SUCCESS

    payment_data = {
        "booking_id": payment.booking_id,
        "amount": booking['final_amount'],
        "status": payment_status,
        "payment_method": payment.payment_method,
        "transaction_id": f"TXN{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "created_at": datetime.utcnow()
    }

    result = db.payments.insert_one(payment_data)
    payment_data['id'] = str(result.inserted_id)
    payment_data.pop('_id')

    return PaymentResponse(**payment_data)


# KAN-405: Real Payment Gateway Integration (stub endpoints)
@app.post('/api/payments/stripe')
async def create_stripe_payment(
    booking_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Stripe payment integration endpoint"""
    # TODO: Integrate with Stripe API
    return {"message": "Stripe integration pending", "booking_id": booking_id}


@app.post('/api/payments/razorpay')
async def create_razorpay_payment(
    booking_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Razorpay payment integration endpoint"""
    # TODO: Integrate with Razorpay API
    return {"message": "Razorpay integration pending", "booking_id": booking_id}


# ============= NOTIFICATION ROUTES =============

@app.get('/api/notifications', response_model=List[NotificationResponse])
async def get_notifications(
    current_user: dict = Depends(get_current_active_user),
    unread_only: bool = False,
    limit: int = 50
):
    """KAN-412: In-App Notification Center"""
    db = get_database()

    query = {"user_id": current_user['sub']}
    if unread_only:
        query['is_read'] = False

    notifications = list(db.notifications.find(query).sort("created_at", -1).limit(limit))

    result = []
    for notif in notifications:
        notif['id'] = str(notif['_id'])
        notif.pop('_id')
        result.append(NotificationResponse(**notif))

    return result


@app.post('/api/notifications/{notification_id}/read')
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Mark notification as read"""
    db = get_database()

    result = db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user['sub']},
        {"$set": {"is_read": True}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Notification marked as read"}


# ============= PROMO CODE ROUTES =============

@app.post('/api/promo-codes', response_model=PromoCodeResponse)
async def create_promo_code(
    promo: PromoCodeCreate,
    current_user: dict = Depends(require_admin)
):
    """Create promo code (Admin)"""
    db = get_database()

    # Check if code exists
    if db.promo_codes.find_one({"code": promo.code}):
        raise HTTPException(status_code=400, detail="Promo code already exists")

    promo_data = promo.model_dump()
    promo_data['current_uses'] = 0
    promo_data['is_active'] = True
    promo_data['created_at'] = datetime.utcnow()

    result = db.promo_codes.insert_one(promo_data)
    promo_data['id'] = str(result.inserted_id)
    promo_data.pop('_id')

    return PromoCodeResponse(**promo_data)


@app.post('/api/promo-codes/validate')
async def validate_promo_code(validation: PromoCodeValidation):
    """KAN-406: Validate promo code"""
    db = get_database()

    promo = db.promo_codes.find_one({"code": validation.code, "is_active": True})
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")

    if promo['current_uses'] >= promo['max_uses']:
        raise HTTPException(status_code=400, detail="Promo code usage limit reached")

    if datetime.utcnow() > promo['valid_until']:
        raise HTTPException(status_code=400, detail="Promo code has expired")

    if validation.amount < promo.get('min_amount', 0):
        raise HTTPException(status_code=400, detail=f"Minimum amount ${promo['min_amount']} required")

    discount = calculate_discount(validation.amount, promo)

    return {
        "valid": True,
        "discount_amount": discount,
        "final_amount": validation.amount - discount
    }


# ============= ADMIN ROUTES =============

@app.get('/api/admin/dashboard', response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(require_admin)):
    """KAN-392: Admin Dashboard"""
    db = get_database()

    # Calculate stats
    total_revenue = 0
    successful_payments = list(db.payments.find({"status": PaymentStatus.SUCCESS}))
    for payment in successful_payments:
        total_revenue += payment['amount']

    total_bookings = db.bookings.count_documents({})
    total_users = db.users.count_documents({"role": UserRole.USER})

    # Calculate occupancy rate
    total_shows = db.shows.count_documents({})
    if total_shows > 0:
        total_capacity = 0
        total_booked = 0
        for show in db.shows.find():
            screen = db.screens.find_one({"_id": ObjectId(show['screen_id'])})
            if screen:
                total_capacity += screen['capacity']
                total_booked += (screen['capacity'] - show.get('available_seats', screen['capacity']))
        occupancy_rate = (total_booked / total_capacity * 100) if total_capacity > 0 else 0
    else:
        occupancy_rate = 0

    # Top performing movies
    pipeline = [
        {"$match": {"status": BookingStatus.CONFIRMED}},
        {"$group": {"_id": "$movie_title", "bookings": {"$sum": 1}, "revenue": {"$sum": "$final_amount"}}},
        {"$sort": {"revenue": -1}},
        {"$limit": 5}
    ]
    top_movies = list(db.bookings.aggregate(pipeline))

    # Recent bookings
    recent_bookings_data = list(db.bookings.find().sort("created_at", -1).limit(10))
    recent_bookings = []
    for booking in recent_bookings_data:
        booking.pop('_id')
        recent_bookings.append(BookingResponse(**booking))

    return DashboardStats(
        total_revenue=total_revenue,
        total_bookings=total_bookings,
        total_users=total_users,
        occupancy_rate=occupancy_rate,
        top_movies=top_movies,
        recent_bookings=recent_bookings
    )


@app.get('/api/admin/users', response_model=List[UserResponse])
async def list_all_users(
    current_user: dict = Depends(require_admin),
    skip: int = 0,
    limit: int = 50
):
    """KAN-411: Admin User Account Management"""
    db = get_database()

    users = list(db.users.find().skip(skip).limit(limit))

    result = []
    for user in users:
        user['id'] = str(user['_id'])
        user.pop('_id')
        user.pop('password')
        result.append(UserResponse(**user))

    return result


@app.post('/api/admin/users/{user_id}/deactivate')
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """KAN-411: Deactivate user account"""
    db = get_database()

    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # KAN-418: Audit logging
    db.audit_logs.insert_one({
        "user_id": current_user['sub'],
        "action": "deactivate_user",
        "entity_type": "user",
        "entity_id": user_id,
        "details": {},
        "timestamp": datetime.utcnow()
    })

    return {"message": "User deactivated"}


@app.post('/api/admin/users/{user_id}/activate')
async def activate_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """KAN-411: Activate user account"""
    db = get_database()

    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": True}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # KAN-418: Audit logging
    db.audit_logs.insert_one({
        "user_id": current_user['sub'],
        "action": "activate_user",
        "entity_type": "user",
        "entity_id": user_id,
        "details": {},
        "timestamp": datetime.utcnow()
    })

    return {"message": "User activated"}


@app.delete('/api/admin/users/{user_id}')
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """KAN-411: Delete user account"""
    db = get_database()

    result = db.users.delete_one({"_id": ObjectId(user_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # KAN-418: Audit logging
    db.audit_logs.insert_one({
        "user_id": current_user['sub'],
        "action": "delete_user",
        "entity_type": "user",
        "entity_id": user_id,
        "details": {},
        "timestamp": datetime.utcnow()
    })

    return {"message": "User deleted"}


@app.get('/api/admin/reports/bookings')
async def export_booking_report(
    current_user: dict = Depends(require_admin),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    format: str = "csv"
):
    """KAN-410: Booking Reports Export (CSV/PDF)"""
    db = get_database()

    query = {}
    if start_date:
        query['created_at'] = {'$gte': datetime.strptime(start_date, "%Y-%m-%d")}
    if end_date:
        query.setdefault('created_at', {})['$lte'] = datetime.strptime(end_date, "%Y-%m-%d")

    bookings = list(db.bookings.find(query))

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=['Booking ID', 'User ID', 'Movie', 'Theater', 'Date', 'Time', 'Seats', 'Amount', 'Status'])
        writer.writeheader()

        for booking in bookings:
            seats_str = ','.join([f"{s['row']}{s['number']}" for s in booking['seats']])
            writer.writerow({
                'Booking ID': booking['id'],
                'User ID': booking['user_id'],
                'Movie': booking['movie_title'],
                'Theater': booking['theater_name'],
                'Date': booking['show_date'],
                'Time': booking['show_time'],
                'Seats': seats_str,
                'Amount': booking['final_amount'],
                'Status': booking['status']
            })

        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=booking_report.csv"}
        )

    return {"message": "PDF export not yet implemented"}


@app.get('/api/admin/audit-logs', response_model=List[AuditLogResponse])
async def get_audit_logs(
    current_user: dict = Depends(require_admin),
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """KAN-418: Audit Logging for Admin Actions"""
    db = get_database()

    query = {}
    if entity_type:
        query['entity_type'] = entity_type

    logs = list(db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit))

    result = []
    for log in logs:
        log['id'] = str(log['_id'])
        log.pop('_id')
        result.append(AuditLogResponse(**log))

    return result
