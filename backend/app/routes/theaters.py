from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from ..models import TheaterCreate, Theater, ScreenCreate, Screen
from ..auth import get_current_admin
from ..database import get_database

router = APIRouter(prefix="/api/theaters", tags=["Theaters"])


# Theater routes
@router.get("/", response_model=list[Theater])
async def get_theaters(
    city: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get all theaters with optional city filter"""
    db = get_database()

    filter_query = {}
    if city:
        filter_query["city"] = {"$regex": city, "$options": "i"}

    theaters = list(db.theaters.find(filter_query).skip(skip).limit(limit))

    for theater in theaters:
        theater["id"] = str(theater.pop("_id"))

    return [Theater(**theater) for theater in theaters]


@router.get("/{theater_id}", response_model=Theater)
async def get_theater(theater_id: str):
    """Get a specific theater by ID"""
    db = get_database()

    try:
        theater = db.theaters.find_one({"_id": ObjectId(theater_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid theater ID"
        )

    if not theater:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theater not found"
        )

    theater["id"] = str(theater.pop("_id"))
    return Theater(**theater)


@router.post("/", response_model=Theater, status_code=status.HTTP_201_CREATED)
async def create_theater(
    theater: TheaterCreate,
    current_admin = Depends(get_current_admin)
):
    """Create a new theater (admin only)"""
    db = get_database()

    theater_dict = theater.model_dump()
    theater_dict["created_at"] = datetime.utcnow()

    result = db.theaters.insert_one(theater_dict)
    created_theater = db.theaters.find_one({"_id": result.inserted_id})

    created_theater["id"] = str(created_theater.pop("_id"))
    return Theater(**created_theater)


@router.put("/{theater_id}", response_model=Theater)
async def update_theater(
    theater_id: str,
    theater: TheaterCreate,
    current_admin = Depends(get_current_admin)
):
    """Update a theater (admin only)"""
    db = get_database()

    try:
        theater_dict = theater.model_dump()
        result = db.theaters.update_one(
            {"_id": ObjectId(theater_id)},
            {"$set": theater_dict}
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid theater ID"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theater not found"
        )

    updated_theater = db.theaters.find_one({"_id": ObjectId(theater_id)})
    updated_theater["id"] = str(updated_theater.pop("_id"))

    return Theater(**updated_theater)


@router.delete("/{theater_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_theater(
    theater_id: str,
    current_admin = Depends(get_current_admin)
):
    """Delete a theater (admin only)"""
    db = get_database()

    try:
        result = db.theaters.delete_one({"_id": ObjectId(theater_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid theater ID"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theater not found"
        )


# Screen routes
@router.get("/{theater_id}/screens", response_model=list[Screen])
async def get_theater_screens(theater_id: str):
    """Get all screens for a theater"""
    db = get_database()

    screens = list(db.screens.find({"theater_id": theater_id}))

    for screen in screens:
        screen["id"] = str(screen.pop("_id"))

    return [Screen(**screen) for screen in screens]


@router.post("/{theater_id}/screens", response_model=Screen, status_code=status.HTTP_201_CREATED)
async def create_screen(
    theater_id: str,
    screen: ScreenCreate,
    current_admin = Depends(get_current_admin)
):
    """Create a new screen for a theater (admin only)"""
    db = get_database()

    # Verify theater exists
    try:
        theater = db.theaters.find_one({"_id": ObjectId(theater_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid theater ID"
        )

    if not theater:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theater not found"
        )

    screen_dict = screen.model_dump()
    screen_dict["created_at"] = datetime.utcnow()

    result = db.screens.insert_one(screen_dict)
    created_screen = db.screens.find_one({"_id": result.inserted_id})

    created_screen["id"] = str(created_screen.pop("_id"))
    return Screen(**created_screen)


@router.delete("/{theater_id}/screens/{screen_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_screen(
    theater_id: str,
    screen_id: str,
    current_admin = Depends(get_current_admin)
):
    """Delete a screen (admin only)"""
    db = get_database()

    try:
        result = db.screens.delete_one({
            "_id": ObjectId(screen_id),
            "theater_id": theater_id
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid screen ID"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screen not found"
        )
