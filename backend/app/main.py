from functools import lru_cache
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List
import random
import secrets

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Body, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import PyMongoError
from pydantic import BaseModel, Field
from passlib.context import CryptContext

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

frontend_port = os.getenv('FRONTEND_PORT', '5173')
backend_port = os.getenv('BACKEND_PORT', '8000')

app = FastAPI(title='Movie Ticket Booking API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[f'http://localhost:{frontend_port}'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ===== MODELS =====

class UserRegister(BaseModel):
    mobile_number: str = Field(..., min_length=10, max_length=15)

class OTPVerify(BaseModel):
    mobile_number: str
    otp: str

class MovieFilter(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    language: Optional[str] = None
    min_rating: Optional[float] = None
    release_date_from: Optional[str] = None
    release_date_to: Optional[str] = None

class FoodItem(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None

class CartItem(BaseModel):
    food_item_id: str
    quantity: int

class FoodOrder(BaseModel):
    items: List[CartItem]
    booking_id: Optional[str] = None

class TheatreView(BaseModel):
    theatre_id: str
    image_360_url: str
    metadata: dict


# ===== DATABASE =====

@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    mongodb_uri = os.getenv('MONGODB_URI')
    if not mongodb_uri:
        raise RuntimeError('MONGODB_URI is not configured.')
    return MongoClient(mongodb_uri, serverSelectionTimeoutMS=3000)


def get_database():
    client = get_mongo_client()
    return client.get_default_database()


# ===== AUTH DEPENDENCIES =====

def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """Simple token verification - returns user data from session token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')

    token = authorization.split(' ')[1]
    db = get_database()
    session = db.sessions.find_one({'token': token})

    if not session or session.get('expires_at', datetime.min) < datetime.utcnow():
        raise HTTPException(status_code=401, detail='Invalid or expired token')

    user = db.users.find_one({'_id': session['user_id']})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')

    return {
        'user_id': str(user['_id']),
        'mobile_number': user['mobile_number']
    }


# ===== HEALTH CHECK =====

@app.get('/api/health')
def health_check() -> dict[str, object]:
    backend_status = 'connected'
    database_status = 'disconnected'
    database_name = None

    try:
        client = get_mongo_client()
        client.admin.command('ping')
        default_database = client.get_default_database()
        database_name = default_database.name if default_database is not None else None
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


# ===== USER REGISTRATION & LOGIN (KAN-481) =====

@app.post('/api/auth/register')
def register_user(user_data: UserRegister):
    """Register a new user and send OTP"""
    db = get_database()

    # Check if user already exists
    existing_user = db.users.find_one({'mobile_number': user_data.mobile_number})

    # Generate 6-digit OTP
    otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    otp_hash = pwd_context.hash(otp)

    # Store OTP with expiration (5 minutes)
    otp_data = {
        'mobile_number': user_data.mobile_number,
        'otp_hash': otp_hash,
        'created_at': datetime.utcnow(),
        'expires_at': datetime.utcnow() + timedelta(minutes=5),
        'verified': False
    }

    if existing_user:
        # Update existing OTP
        db.otp_store.update_one(
            {'mobile_number': user_data.mobile_number},
            {'$set': otp_data},
            upsert=True
        )
    else:
        # Create new user and OTP
        db.users.insert_one({
            'mobile_number': user_data.mobile_number,
            'created_at': datetime.utcnow(),
            'is_active': True
        })
        db.otp_store.insert_one(otp_data)

    # In production, send OTP via SMS service
    # For demo purposes, we return it in response (REMOVE IN PRODUCTION!)
    return {
        'success': True,
        'message': f'OTP sent to {user_data.mobile_number}',
        'otp_demo': otp  # DEMO ONLY - remove in production
    }


@app.post('/api/auth/login')
def login_user(verify_data: OTPVerify):
    """Verify OTP and create session"""
    db = get_database()

    # Get OTP record
    otp_record = db.otp_store.find_one({
        'mobile_number': verify_data.mobile_number
    })

    if not otp_record:
        raise HTTPException(status_code=400, detail='No OTP found for this number')

    # Check expiration
    if otp_record['expires_at'] < datetime.utcnow():
        raise HTTPException(status_code=400, detail='OTP has expired')

    # Verify OTP
    if not pwd_context.verify(verify_data.otp, otp_record['otp_hash']):
        raise HTTPException(status_code=400, detail='Invalid OTP')

    # Get user
    user = db.users.find_one({'mobile_number': verify_data.mobile_number})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    # Mark OTP as verified
    db.otp_store.update_one(
        {'_id': otp_record['_id']},
        {'$set': {'verified': True}}
    )

    # Create session token
    session_token = secrets.token_urlsafe(32)
    db.sessions.insert_one({
        'user_id': user['_id'],
        'token': session_token,
        'created_at': datetime.utcnow(),
        'expires_at': datetime.utcnow() + timedelta(days=30)
    })

    return {
        'success': True,
        'token': session_token,
        'user': {
            'id': str(user['_id']),
            'mobile_number': user['mobile_number']
        }
    }


# ===== MOVIE SEARCH & FILTER (KAN-444) =====

@app.get('/api/movies')
def get_movies(
    title: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    release_date_from: Optional[str] = Query(None),
    release_date_to: Optional[str] = Query(None)
):
    """Search and filter movies"""
    db = get_database()

    # Build query filter
    query = {}

    if title:
        query['title'] = {'$regex': title, '$options': 'i'}

    if genre:
        query['genre'] = genre

    if language:
        query['language'] = language

    if min_rating is not None:
        query['rating'] = {'$gte': min_rating}

    if release_date_from or release_date_to:
        date_query = {}
        if release_date_from:
            date_query['$gte'] = release_date_from
        if release_date_to:
            date_query['$lte'] = release_date_to
        query['release_date'] = date_query

    # Execute query
    movies = list(db.movies.find(query).sort('rating', DESCENDING).limit(50))

    # Convert ObjectId to string
    for movie in movies:
        movie['id'] = str(movie.pop('_id'))

    return {
        'success': True,
        'count': len(movies),
        'movies': movies
    }


@app.get('/api/movies/genres')
def get_genres():
    """Get all available movie genres"""
    db = get_database()
    genres = db.movies.distinct('genre')
    return {'genres': sorted(genres)}


@app.get('/api/movies/languages')
def get_languages():
    """Get all available languages"""
    db = get_database()
    languages = db.movies.distinct('language')
    return {'languages': sorted(languages)}


# ===== FOOD ORDERING (KAN-482) =====

@app.get('/api/food/menu')
def get_food_menu(category: Optional[str] = Query(None)):
    """Get food menu items"""
    db = get_database()

    query = {'available': True}
    if category:
        query['category'] = category

    items = list(db.food_items.find(query).sort('category', ASCENDING))

    for item in items:
        item['id'] = str(item.pop('_id'))

    return {
        'success': True,
        'items': items
    }


@app.get('/api/food/categories')
def get_food_categories():
    """Get all food categories"""
    db = get_database()
    categories = db.food_items.distinct('category')
    return {'categories': sorted(categories)}


@app.post('/api/food/orders')
def create_food_order(order: FoodOrder, user: dict = Depends(verify_token)):
    """Create a food order"""
    db = get_database()

    # Calculate total
    total_price = 0
    order_items = []

    for cart_item in order.items:
        food_item = db.food_items.find_one({'_id': cart_item.food_item_id})
        if not food_item:
            raise HTTPException(status_code=404, detail=f'Food item {cart_item.food_item_id} not found')

        item_total = food_item['price'] * cart_item.quantity
        total_price += item_total

        order_items.append({
            'food_item_id': cart_item.food_item_id,
            'name': food_item['name'],
            'price': food_item['price'],
            'quantity': cart_item.quantity,
            'subtotal': item_total
        })

    # Create order
    order_doc = {
        'user_id': user['user_id'],
        'items': order_items,
        'total_price': total_price,
        'booking_id': order.booking_id,
        'status': 'pending',
        'created_at': datetime.utcnow()
    }

    result = db.food_orders.insert_one(order_doc)

    return {
        'success': True,
        'order_id': str(result.inserted_id),
        'total_price': total_price,
        'status': 'pending'
    }


@app.get('/api/food/orders')
def get_user_orders(user: dict = Depends(verify_token)):
    """Get user's food orders"""
    db = get_database()

    orders = list(db.food_orders.find(
        {'user_id': user['user_id']}
    ).sort('created_at', DESCENDING).limit(20))

    for order in orders:
        order['id'] = str(order.pop('_id'))

    return {
        'success': True,
        'orders': orders
    }


# ===== DYNAMIC PRICING (KAN-483) =====

def calculate_dynamic_price(base_price: float, total_seats: int, available_seats: int) -> float:
    """Calculate dynamic price based on availability"""
    occupancy_rate = (total_seats - available_seats) / total_seats

    # Pricing tiers
    if occupancy_rate >= 0.9:  # 90%+ full
        return round(base_price * 1.5, 2)
    elif occupancy_rate >= 0.75:  # 75%+ full
        return round(base_price * 1.3, 2)
    elif occupancy_rate >= 0.5:  # 50%+ full
        return round(base_price * 1.15, 2)
    elif occupancy_rate <= 0.2:  # Less than 20% full
        return round(base_price * 0.85, 2)  # Discount
    else:
        return base_price


@app.get('/api/shows/{show_id}/seats')
def get_show_seats(show_id: str):
    """Get seats with dynamic pricing for a show"""
    db = get_database()

    show = db.shows.find_one({'_id': show_id})
    if not show:
        raise HTTPException(status_code=404, detail='Show not found')

    # Get all seats for this show
    seats = list(db.seats.find({'show_id': show_id}))

    # Calculate total and available seats
    total_seats = len(seats)
    available_seats = sum(1 for seat in seats if seat.get('status') == 'available')

    # Apply dynamic pricing
    for seat in seats:
        base_price = seat.get('base_price', 100.0)
        seat['current_price'] = calculate_dynamic_price(base_price, total_seats, available_seats)
        seat['id'] = str(seat.pop('_id'))

    return {
        'success': True,
        'show_id': show_id,
        'total_seats': total_seats,
        'available_seats': available_seats,
        'occupancy_rate': round((total_seats - available_seats) / total_seats * 100, 1),
        'seats': seats
    }


@app.post('/api/bookings')
def create_booking(
    booking_data: dict = Body(...),
    user: dict = Depends(verify_token)
):
    """Create a seat booking"""
    db = get_database()

    show_id = booking_data.get('show_id')
    seat_ids = booking_data.get('seat_ids', [])

    if not show_id or not seat_ids:
        raise HTTPException(status_code=400, detail='show_id and seat_ids required')

    # Verify seats are available
    seats = list(db.seats.find({
        '_id': {'$in': seat_ids},
        'show_id': show_id,
        'status': 'available'
    }))

    if len(seats) != len(seat_ids):
        raise HTTPException(status_code=400, detail='Some seats are not available')

    # Calculate total with dynamic pricing
    all_seats = list(db.seats.find({'show_id': show_id}))
    total_seats = len(all_seats)
    available_seats = sum(1 for s in all_seats if s.get('status') == 'available')

    total_price = 0
    for seat in seats:
        base_price = seat.get('base_price', 100.0)
        current_price = calculate_dynamic_price(base_price, total_seats, available_seats)
        total_price += current_price

    # Create booking
    booking = {
        'user_id': user['user_id'],
        'show_id': show_id,
        'seat_ids': seat_ids,
        'total_price': total_price,
        'status': 'confirmed',
        'created_at': datetime.utcnow()
    }

    result = db.bookings.insert_one(booking)

    # Mark seats as booked
    db.seats.update_many(
        {'_id': {'$in': seat_ids}},
        {'$set': {'status': 'booked', 'booking_id': str(result.inserted_id)}}
    )

    return {
        'success': True,
        'booking_id': str(result.inserted_id),
        'total_price': total_price
    }


# ===== THEATRE 360 VIEW (KAN-484) =====

@app.get('/api/theatres/{theatre_id}/360-view')
def get_theatre_360_view(theatre_id: str):
    """Get 360-degree view data for a theatre"""
    db = get_database()

    theatre = db.theatres.find_one({'_id': theatre_id})
    if not theatre:
        raise HTTPException(status_code=404, detail='Theatre not found')

    view_360 = theatre.get('view_360', {})

    if not view_360:
        raise HTTPException(status_code=404, detail='360 view not available for this theatre')

    return {
        'success': True,
        'theatre_id': theatre_id,
        'theatre_name': theatre.get('name'),
        'image_360_url': view_360.get('image_url'),
        'metadata': view_360.get('metadata', {}),
        'hotspots': view_360.get('hotspots', [])
    }


@app.get('/api/theatres')
def get_theatres(city: Optional[str] = Query(None)):
    """Get all theatres, optionally filtered by city"""
    db = get_database()

    query = {}
    if city:
        query['city'] = city

    theatres = list(db.theatres.find(query).sort('name', ASCENDING))

    for theatre in theatres:
        theatre['id'] = str(theatre.pop('_id'))
        theatre['has_360_view'] = bool(theatre.get('view_360'))

    return {
        'success': True,
        'count': len(theatres),
        'theatres': theatres
    }


# ===== DATA SEEDING ENDPOINT (FOR DEMO) =====

@app.post('/api/seed-data')
def seed_demo_data():
    """Seed database with demo data for testing"""
    db = get_database()

    # Clear existing data
    db.movies.delete_many({})
    db.food_items.delete_many({})
    db.theatres.delete_many({})
    db.shows.delete_many({})
    db.seats.delete_many({})

    # Seed movies
    movies = [
        {
            '_id': 'movie_1',
            'title': 'Inception',
            'genre': 'Sci-Fi',
            'language': 'English',
            'rating': 8.8,
            'release_date': '2010-07-16',
            'duration': 148,
            'description': 'A thief who steals corporate secrets through dream-sharing technology',
            'poster_url': 'https://via.placeholder.com/300x450?text=Inception'
        },
        {
            '_id': 'movie_2',
            'title': 'The Dark Knight',
            'genre': 'Action',
            'language': 'English',
            'rating': 9.0,
            'release_date': '2008-07-18',
            'duration': 152,
            'description': 'Batman faces the Joker in this epic crime saga',
            'poster_url': 'https://via.placeholder.com/300x450?text=Dark+Knight'
        },
        {
            '_id': 'movie_3',
            'title': 'Interstellar',
            'genre': 'Sci-Fi',
            'language': 'English',
            'rating': 8.6,
            'release_date': '2014-11-07',
            'duration': 169,
            'description': 'A team of explorers travel through a wormhole in space',
            'poster_url': 'https://via.placeholder.com/300x450?text=Interstellar'
        }
    ]
    db.movies.insert_many(movies)

    # Seed food items
    food_items = [
        {
            '_id': 'food_1',
            'name': 'Large Popcorn',
            'description': 'Buttered popcorn',
            'price': 8.99,
            'category': 'Snacks',
            'available': True,
            'image_url': 'https://via.placeholder.com/200x200?text=Popcorn'
        },
        {
            '_id': 'food_2',
            'name': 'Coca Cola',
            'description': 'Large soft drink',
            'price': 4.99,
            'category': 'Beverages',
            'available': True,
            'image_url': 'https://via.placeholder.com/200x200?text=Coke'
        },
        {
            '_id': 'food_3',
            'name': 'Nachos',
            'description': 'Nachos with cheese sauce',
            'price': 6.99,
            'category': 'Snacks',
            'available': True,
            'image_url': 'https://via.placeholder.com/200x200?text=Nachos'
        },
        {
            '_id': 'food_4',
            'name': 'Hot Dog',
            'description': 'Classic hot dog',
            'price': 5.49,
            'category': 'Food',
            'available': True,
            'image_url': 'https://via.placeholder.com/200x200?text=HotDog'
        }
    ]
    db.food_items.insert_many(food_items)

    # Seed theatres with 360 views
    theatres = [
        {
            '_id': 'theatre_1',
            'name': 'Oktawave Cinema Downtown',
            'city': 'New York',
            'address': '123 Broadway, New York, NY 10001',
            'screens': 8,
            'view_360': {
                'image_url': 'https://via.placeholder.com/2048x1024?text=360+Theatre+View',
                'metadata': {
                    'resolution': '2048x1024',
                    'capture_date': '2026-01-15',
                    'photographer': 'Oktawave Studios'
                },
                'hotspots': [
                    {'x': 0.5, 'y': 0.5, 'label': 'Screen'},
                    {'x': 0.3, 'y': 0.7, 'label': 'Premium Seats'}
                ]
            }
        },
        {
            '_id': 'theatre_2',
            'name': 'Oktawave IMAX',
            'city': 'Los Angeles',
            'address': '456 Hollywood Blvd, LA, CA 90028',
            'screens': 12,
            'view_360': {
                'image_url': 'https://via.placeholder.com/2048x1024?text=IMAX+360+View',
                'metadata': {
                    'resolution': '2048x1024',
                    'capture_date': '2026-02-01'
                },
                'hotspots': []
            }
        }
    ]
    db.theatres.insert_many(theatres)

    # Seed shows
    show = {
        '_id': 'show_1',
        'movie_id': 'movie_1',
        'theatre_id': 'theatre_1',
        'screen_number': 1,
        'show_time': '2026-05-15T19:00:00',
        'language': 'English',
        'format': 'IMAX'
    }
    db.shows.insert_one(show)

    # Seed seats for show
    seats = []
    rows = ['A', 'B', 'C', 'D', 'E']
    for row in rows:
        for num in range(1, 11):
            seat_id = f"seat_{row}{num}"
            seats.append({
                '_id': seat_id,
                'show_id': 'show_1',
                'row': row,
                'number': num,
                'type': 'regular' if row in ['A', 'B'] else 'premium',
                'base_price': 150.0 if row in ['D', 'E'] else 100.0,
                'status': 'available'
            })

    # Book some seats to demonstrate dynamic pricing
    for i in range(15):
        seats[i]['status'] = 'booked'

    db.seats.insert_many(seats)

    return {
        'success': True,
        'message': 'Demo data seeded successfully',
        'counts': {
            'movies': len(movies),
            'food_items': len(food_items),
            'theatres': len(theatres),
            'shows': 1,
            'seats': len(seats)
        }
    }
