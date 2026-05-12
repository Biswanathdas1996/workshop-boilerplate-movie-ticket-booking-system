import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .database import get_mongo_client, create_indexes
from .rate_limiter import limiter
from .routes import auth, movies, theaters, shows, bookings, payments, admin

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

frontend_port = os.getenv('FRONTEND_PORT', '5173')
backend_port = os.getenv('BACKEND_PORT', '8000')

app = FastAPI(
    title='Movie Ticket Booking System API',
    description='Comprehensive API for movie ticket booking with authentication, seat selection, and payments',
    version='1.0.0'
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[f'http://localhost:{frontend_port}'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Include routers
app.include_router(auth.router)
app.include_router(movies.router)
app.include_router(theaters.router)
app.include_router(shows.router)
app.include_router(bookings.router)
app.include_router(payments.router)
app.include_router(admin.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database indexes on startup"""
    try:
        create_indexes()
        print("✓ Database indexes created successfully")
    except Exception as e:
        print(f"⚠ Warning: Could not create indexes - {e}")


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
