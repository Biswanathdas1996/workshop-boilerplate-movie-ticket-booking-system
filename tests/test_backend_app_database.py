import pytest
from unittest.mock import patch, MagicMock
import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database

# Assuming the file is located at backend/app/database.py
from backend.app.database import get_mongo_client, get_database, init_indexes


@pytest.fixture(autouse=True)
def clear_lru_cache():
    """Clears the lru_cache for get_mongo_client before each test."""
    get_mongo_client.cache_clear()
    yield


@patch.dict(os.environ, {}, clear=True)
def test_get_mongo_client_no_mongodb_uri():
    """
    Test that get_mongo_client raises RuntimeError if MONGODB_URI is not set.
    """
    with pytest.raises(RuntimeError, match='MONGODB_URI is not configured.'):
        get_mongo_client()


@patch.dict(os.environ, {'MONGODB_URI': 'mongodb://localhost:27017'}, clear=True)
@patch('backend.app.database.MongoClient')
def test_get_mongo_client_success(mock_mongo_client):
    """
    Test that get_mongo_client returns a MongoClient instance with the correct URI.
    """
    client = get_mongo_client()
    mock_mongo_client.assert_called_once_with('mongodb://localhost:27017', serverSelectionTimeoutMS=3000)
    assert client == mock_mongo_client.return_value


@patch.dict(os.environ, {'MONGODB_URI': 'mongodb://localhost:27017'}, clear=True)
@patch('backend.app.database.MongoClient')
def test_get_mongo_client_lru_cache(mock_mongo_client):
    """
    Test that get_mongo_client uses lru_cache and only calls MongoClient once.
    """
    client1 = get_mongo_client()
    client2 = get_mongo_client()

    mock_mongo_client.assert_called_once()  # Should only be called once due to lru_cache
    assert client1 == client2
    assert client1 == mock_mongo_client.return_value


@patch('backend.app.database.get_mongo_client')
def test_get_database_success(mock_get_mongo_client):
    """
    Test that get_database returns the default database from the client.
    """
    mock_client = MagicMock(spec=MongoClient)
    mock_db = MagicMock(spec=Database)
    mock_client.get_default_database.return_value = mock_db
    mock_get_mongo_client.return_value = mock_client

    db = get_database()

    mock_get_mongo_client.assert_called_once()
    mock_client.get_default_database.assert_called_once()
    assert db == mock_db


@patch('backend.app.database.get_database')
def test_init_indexes(mock_get_database):
    """
    Test that init_indexes calls create_index for all expected collections and fields.
    """
    mock_db = MagicMock(spec=Database)
    mock_get_database.return_value = mock_db

    # Mock collection objects
    mock_db.users = MagicMock()
    mock_db.movies = MagicMock()
    mock_db.theaters = MagicMock()
    mock_db.shows = MagicMock()
    mock_db.bookings = MagicMock()
    mock_db.payments = MagicMock()
    mock_db.reviews = MagicMock()
    mock_db.promo_codes = MagicMock()
    mock_db.notifications = MagicMock()
    mock_db.audit_logs = MagicMock()

    init_indexes()

    mock_get_database.assert_called_once()

    # Assertions for users collection
    mock_db.users.create_index.assert_any_call([("email", ASCENDING)], unique=True)
    mock_db.users.create_index.assert_any_call([("role", ASCENDING)])
    assert mock_db.users.create_index.call_count == 2

    # Assertions for movies collection
    mock_db.movies.create_index.assert_any_call([("title", ASCENDING)])
    mock_db.movies.create_index.assert_any_call([("genre", ASCENDING)])
    mock_db.movies.create_index.assert_any_call([("is_featured", DESCENDING)])
    mock_db.movies.create_index.assert_any_call([("is_trending", DESCENDING)])
    mock_db.movies.create_index.assert_any_call([("release_date", DESCENDING)])
    assert mock_db.movies.create_index.call_count == 5

    # Assertions for theaters collection
    mock_db.theaters.create_index.assert_any_call([("city", ASCENDING)])
    mock_db.theaters.create_index.assert_any_call([("name", ASCENDING)])
    assert mock_db.theaters.create_index.call_count == 2

    # Assertions for shows collection
    mock_db.shows.create_index.assert_any_call([("movie_id", ASCENDING)])
    mock_db.shows.create_index.assert_any_call([("screen_id", ASCENDING)])
    mock_db.shows.create_index.assert_any_call([("show_date", DESCENDING)])
    mock_db.shows.create_index.assert_any_call([("show_time", ASCENDING)])
    assert mock_db.shows.create_index.call_count == 4

    # Assertions for bookings collection
    mock_db.bookings.create_index.assert_any_call([("user_id", ASCENDING)])
    mock_db.bookings.create_index.assert_any_call([("show_id", ASCENDING)])
    mock_db.bookings.create_index.assert_any_call([("status", ASCENDING)])
    mock_db.bookings.create_index.assert_any_call([("created_at", DESCENDING)])
    assert mock_db.bookings.create_index.call_count == 4

    # Assertions for payments collection
    mock_db.payments.create_index.assert_any_call([("booking_id", ASCENDING)])
    mock_db.payments.create_index.assert_any_call([("status", ASCENDING)])
    mock_db.payments.create_index.assert_any_call([("created_at", DESCENDING)])
    assert mock_db.payments.create_index.call_count == 3

    # Assertions for reviews collection
    mock_db.reviews.create_index.assert_any_call([("movie_id", ASCENDING)])
    mock_db.reviews.create_index.assert_any_call([("user_id", ASCENDING)])
    mock_db.reviews.create_index.assert_any_call([("created_at", DESCENDING)])
    assert mock_db.reviews.create_index.call_count == 3

    # Assertions for promo_codes collection
    mock_db.promo_codes.create_index.assert_any_call([("code", ASCENDING)], unique=True)
    mock_db.promo_codes.create_index.assert_any_call([("is_active", ASCENDING)])
    assert mock_db.promo_codes.create_index.call_count == 2

    # Assertions for notifications collection
    mock_db.notifications.create_index.assert_any_call([("user_id", ASCENDING)])
    mock_db.notifications.create_index.assert_any_call([("is_read", ASCENDING)])
    mock_db.notifications.create_index.assert_any_call([("created_at", DESCENDING)])
    assert mock_db.notifications.create_index.call_count == 3

    # Assertions for audit_logs collection
    mock_db.audit_logs.create_index.assert_any_call([("user_id", ASCENDING)])
    mock_db.audit_logs.create_index.assert_any_call([("entity_type", ASCENDING)])
    mock_db.audit_logs.create_index.assert_any_call([("timestamp", DESCENDING)])
    assert mock_db.audit_logs.create_index.call_count == 3
