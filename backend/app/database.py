from functools import lru_cache
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
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
