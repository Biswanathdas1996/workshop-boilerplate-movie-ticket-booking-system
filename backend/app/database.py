from functools import lru_cache
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
from datetime import datetime
import os


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    mongodb_uri = os.getenv('MONGODB_URI')
    if not mongodb_uri:
        raise RuntimeError('MONGODB_URI is not configured.')
    return MongoClient(mongodb_uri, serverSelectionTimeoutMS=3000)


def get_database() -> Database:
    client = get_mongo_client()
    return client.get_default_database()


def init_indexes():
    """Initialize database indexes for better performance"""
    db = get_database()

    # Users indexes
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.users.create_index([("role", ASCENDING)])

    # Movies indexes
    db.movies.create_index([("title", ASCENDING)])
    db.movies.create_index([("genre", ASCENDING)])
    db.movies.create_index([("is_featured", DESCENDING)])
    db.movies.create_index([("is_trending", DESCENDING)])
    db.movies.create_index([("release_date", DESCENDING)])

    # Theaters indexes
    db.theaters.create_index([("city", ASCENDING)])
    db.theaters.create_index([("name", ASCENDING)])

    # Shows indexes
    db.shows.create_index([("movie_id", ASCENDING)])
    db.shows.create_index([("screen_id", ASCENDING)])
    db.shows.create_index([("show_date", DESCENDING)])
    db.shows.create_index([("show_time", ASCENDING)])

    # Bookings indexes
    db.bookings.create_index([("user_id", ASCENDING)])
    db.bookings.create_index([("show_id", ASCENDING)])
    db.bookings.create_index([("status", ASCENDING)])
    db.bookings.create_index([("created_at", DESCENDING)])

    # Payments indexes
    db.payments.create_index([("booking_id", ASCENDING)])
    db.payments.create_index([("status", ASCENDING)])
    db.payments.create_index([("created_at", DESCENDING)])

    # Reviews indexes
    db.reviews.create_index([("movie_id", ASCENDING)])
    db.reviews.create_index([("user_id", ASCENDING)])
    db.reviews.create_index([("created_at", DESCENDING)])

    # Promo codes indexes
    db.promo_codes.create_index([("code", ASCENDING)], unique=True)
    db.promo_codes.create_index([("is_active", ASCENDING)])

    # Notifications indexes
    db.notifications.create_index([("user_id", ASCENDING)])
    db.notifications.create_index([("is_read", ASCENDING)])
    db.notifications.create_index([("created_at", DESCENDING)])

    # Audit logs indexes
    db.audit_logs.create_index([("user_id", ASCENDING)])
    db.audit_logs.create_index([("entity_type", ASCENDING)])
    db.audit_logs.create_index([("timestamp", DESCENDING)])


def seed_dummy_movies() -> int:
    """Seed sample movies once when the movies collection is empty."""
    db = get_database()

    if db.movies.count_documents({}, limit=1) > 0:
        return 0

    now = datetime.utcnow()
    sample_movies = [
        {
            "title": "Neon Skyline",
            "synopsis": "An underground courier uncovers a city-wide conspiracy while racing through a neon-lit metropolis.",
            "genre": ["Action", "Sci-Fi"],
            "language": "English",
            "duration": 128,
            "release_date": "2026-04-18",
            "cast": ["Lena Park", "Dario Wells", "Mina Ortiz"],
            "director": "Avery Quinn",
            "trailer_url": "https://example.com/trailers/neon-skyline",
            "poster_url": "https://picsum.photos/seed/neonskyline/500/750",
            "rating": 4.3,
            "is_featured": True,
            "is_trending": True,
            "created_at": now,
        },
        {
            "title": "Midnight Monsoon",
            "synopsis": "Two strangers get trapped at a coastal station and discover a shared past during one stormy night.",
            "genre": ["Drama", "Romance"],
            "language": "English",
            "duration": 112,
            "release_date": "2026-03-07",
            "cast": ["Noah Reyes", "Ivy Laurent", "Raj Malhotra"],
            "director": "Kira Donnelly",
            "trailer_url": "https://example.com/trailers/midnight-monsoon",
            "poster_url": "https://picsum.photos/seed/midnightmonsoon/500/750",
            "rating": 4.0,
            "is_featured": True,
            "is_trending": False,
            "created_at": now,
        },
        {
            "title": "Laugh Track Live",
            "synopsis": "A failing comedy club bets everything on a chaotic live show that spirals into viral fame.",
            "genre": ["Comedy"],
            "language": "English",
            "duration": 98,
            "release_date": "2026-01-22",
            "cast": ["Cam Brooks", "Elise Grant", "Mateo King"],
            "director": "Jordan Pike",
            "trailer_url": "https://example.com/trailers/laugh-track-live",
            "poster_url": "https://picsum.photos/seed/laughtracklive/500/750",
            "rating": 3.8,
            "is_featured": False,
            "is_trending": True,
            "created_at": now,
        },
    ]

    result = db.movies.insert_many(sample_movies)
    return len(result.inserted_ids)
