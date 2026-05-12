from functools import lru_cache
import os
from pymongo import MongoClient
from pymongo.database import Database


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    mongodb_uri = os.getenv('MONGODB_URI')
    if not mongodb_uri:
        raise RuntimeError('MONGODB_URI is not configured.')
    return MongoClient(mongodb_uri, serverSelectionTimeoutMS=3000)


def get_database() -> Database:
    client = get_mongo_client()
    return client.get_default_database()


def create_indexes():
    """Create database indexes for better performance"""
    db = get_database()

    # User indexes
    db.users.create_index("email", unique=True)

    # Movie indexes
    db.movies.create_index("title")
    db.movies.create_index("genre")
    db.movies.create_index("release_date")

    # Theater indexes
    db.theaters.create_index("city")
    db.theaters.create_index("location")

    # Show indexes
    db.shows.create_index("movie_id")
    db.shows.create_index("theater_id")
    db.shows.create_index("start_time")

    # Booking indexes
    db.bookings.create_index("user_id")
    db.bookings.create_index("show_id")
    db.bookings.create_index("booking_number", unique=True)

    # Payment indexes
    db.payments.create_index("booking_id")
    db.payments.create_index("transaction_id", unique=True)
