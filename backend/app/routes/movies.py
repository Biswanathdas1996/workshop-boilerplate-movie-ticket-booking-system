from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from ..models import MovieCreate, Movie, MovieSearchParams
from ..auth import get_current_admin
from ..database import get_database

router = APIRouter(prefix="/api/movies", tags=["Movies"])


@router.get("/", response_model=list[Movie])
async def get_movies(
    query: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all movies with optional filters"""
    db = get_database()

    filter_query = {"is_active": True}

    if query:
        filter_query["$or"] = [
            {"title": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"director": {"$regex": query, "$options": "i"}},
            {"cast": {"$regex": query, "$options": "i"}}
        ]

    if genre:
        filter_query["genre"] = genre

    if language:
        filter_query["language"] = language

    if min_rating is not None:
        filter_query["rating"] = {"$gte": min_rating}

    movies = list(db.movies.find(filter_query).skip(skip).limit(limit).sort("release_date", -1))

    for movie in movies:
        movie["id"] = str(movie.pop("_id"))

    return [Movie(**movie) for movie in movies]


@router.get("/{movie_id}", response_model=Movie)
async def get_movie(movie_id: str):
    """Get a specific movie by ID"""
    db = get_database()

    try:
        movie = db.movies.find_one({"_id": ObjectId(movie_id), "is_active": True})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid movie ID"
        )

    if not movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found"
        )

    movie["id"] = str(movie.pop("_id"))
    return Movie(**movie)


@router.post("/", response_model=Movie, status_code=status.HTTP_201_CREATED)
async def create_movie(
    movie: MovieCreate,
    current_admin = Depends(get_current_admin)
):
    """Create a new movie (admin only)"""
    db = get_database()

    movie_dict = movie.model_dump()
    movie_dict["created_at"] = datetime.utcnow()
    movie_dict["is_active"] = True

    result = db.movies.insert_one(movie_dict)
    created_movie = db.movies.find_one({"_id": result.inserted_id})

    created_movie["id"] = str(created_movie.pop("_id"))
    return Movie(**created_movie)


@router.put("/{movie_id}", response_model=Movie)
async def update_movie(
    movie_id: str,
    movie: MovieCreate,
    current_admin = Depends(get_current_admin)
):
    """Update a movie (admin only)"""
    db = get_database()

    try:
        movie_dict = movie.model_dump()
        result = db.movies.update_one(
            {"_id": ObjectId(movie_id)},
            {"$set": movie_dict}
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid movie ID"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found"
        )

    updated_movie = db.movies.find_one({"_id": ObjectId(movie_id)})
    updated_movie["id"] = str(updated_movie.pop("_id"))

    return Movie(**updated_movie)


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_movie(
    movie_id: str,
    current_admin = Depends(get_current_admin)
):
    """Delete a movie (soft delete - admin only)"""
    db = get_database()

    try:
        result = db.movies.update_one(
            {"_id": ObjectId(movie_id)},
            {"$set": {"is_active": False}}
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid movie ID"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found"
        )
