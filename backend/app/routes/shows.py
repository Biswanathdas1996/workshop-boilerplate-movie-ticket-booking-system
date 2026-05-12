from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from ..models import ShowCreate, Show, Seat, SeatStatus
from ..auth import get_current_admin, get_current_user
from ..database import get_database

router = APIRouter(prefix="/api/shows", tags=["Shows"])


@router.get("/", response_model=list[Show])
async def get_shows(
    movie_id: Optional[str] = Query(None),
    theater_id: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get all shows with optional filters"""
    db = get_database()

    filter_query = {}

    if movie_id:
        filter_query["movie_id"] = movie_id

    if theater_id:
        filter_query["theater_id"] = theater_id

    if city:
        # Join with theaters to filter by city
        theaters = list(db.theaters.find({"city": {"$regex": city, "$options": "i"}}))
        theater_ids = [str(t["_id"]) for t in theaters]
        filter_query["theater_id"] = {"$in": theater_ids}

    if date:
        # Filter by date (shows starting on that date)
        try:
            date_obj = datetime.fromisoformat(date)
            next_day = datetime(date_obj.year, date_obj.month, date_obj.day, 23, 59, 59)
            filter_query["start_time"] = {
                "$gte": date_obj,
                "$lt": next_day
            }
        except:
            pass

    shows = list(db.shows.find(filter_query).skip(skip).limit(limit).sort("start_time", 1))

    for show in shows:
        show["id"] = str(show.pop("_id"))

        # Get booked seats count
        booked_count = db.seats.count_documents({
            "show_id": show["id"],
            "status": SeatStatus.BOOKED
        })

        # Get screen to calculate available seats
        screen = db.screens.find_one({"_id": ObjectId(show["screen_id"])})
        total_seats = screen["total_seats"] if screen else 0
        show["available_seats"] = total_seats - booked_count

    return [Show(**show) for show in shows]


@router.get("/{show_id}", response_model=Show)
async def get_show(show_id: str):
    """Get a specific show by ID"""
    db = get_database()

    try:
        show = db.shows.find_one({"_id": ObjectId(show_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid show ID"
        )

    if not show:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Show not found"
        )

    show["id"] = str(show.pop("_id"))

    # Calculate available seats
    booked_count = db.seats.count_documents({
        "show_id": show["id"],
        "status": SeatStatus.BOOKED
    })

    screen = db.screens.find_one({"_id": ObjectId(show["screen_id"])})
    total_seats = screen["total_seats"] if screen else 0
    show["available_seats"] = total_seats - booked_count

    return Show(**show)


@router.post("/", response_model=Show, status_code=status.HTTP_201_CREATED)
async def create_show(
    show: ShowCreate,
    current_admin = Depends(get_current_admin)
):
    """Create a new show (admin only)"""
    db = get_database()

    # Verify movie exists
    try:
        movie = db.movies.find_one({"_id": ObjectId(show.movie_id)})
        if not movie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Movie not found"
            )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid movie ID"
        )

    # Verify screen exists
    try:
        screen = db.screens.find_one({"_id": ObjectId(show.screen_id)})
        if not screen:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Screen not found"
            )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid screen ID"
        )

    show_dict = show.model_dump()
    show_dict["created_at"] = datetime.utcnow()

    result = db.shows.insert_one(show_dict)
    show_id = str(result.inserted_id)

    # Initialize seats for this show
    layout = screen["seat_layout"]
    rows = layout.get("rows", 10)
    cols = layout.get("columns", 15)

    seats = []
    for row_num in range(rows):
        row_letter = chr(65 + row_num)  # A, B, C, ...
        for col_num in range(1, cols + 1):
            seats.append({
                "show_id": show_id,
                "row": row_letter,
                "number": col_num,
                "status": SeatStatus.AVAILABLE
            })

    if seats:
        db.seats.insert_many(seats)

    created_show = db.shows.find_one({"_id": result.inserted_id})
    created_show["id"] = str(created_show.pop("_id"))
    created_show["available_seats"] = screen["total_seats"]

    return Show(**created_show)


@router.get("/{show_id}/seats", response_model=list[Seat])
async def get_show_seats(show_id: str):
    """Get all seats for a show with their status"""
    db = get_database()

    # Verify show exists
    try:
        show = db.shows.find_one({"_id": ObjectId(show_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid show ID"
        )

    if not show:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Show not found"
        )

    seats = list(db.seats.find({"show_id": show_id}))

    for seat in seats:
        seat["id"] = str(seat.pop("_id"))

    return [Seat(**seat) for seat in seats]


@router.post("/{show_id}/seats/hold")
async def hold_seats(
    show_id: str,
    seat_ids: list[str],
    current_user = Depends(get_current_user)
):
    """Temporarily hold seats for booking (5 minutes hold)"""
    db = get_database()

    # Check if all seats are available
    for seat_id in seat_ids:
        try:
            seat = db.seats.find_one({"_id": ObjectId(seat_id), "show_id": show_id})
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid seat ID: {seat_id}"
            )

        if not seat or seat["status"] != SeatStatus.AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Seat {seat_id} is not available"
            )

    # Hold the seats
    for seat_id in seat_ids:
        db.seats.update_one(
            {"_id": ObjectId(seat_id)},
            {"$set": {"status": SeatStatus.SELECTED}}
        )

    return {"message": "Seats held successfully", "expires_in": 300}  # 5 minutes


@router.delete("/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_show(
    show_id: str,
    current_admin = Depends(get_current_admin)
):
    """Delete a show and its seats (admin only)"""
    db = get_database()

    try:
        # Delete associated seats first
        db.seats.delete_many({"show_id": show_id})

        # Delete the show
        result = db.shows.delete_one({"_id": ObjectId(show_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid show ID"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Show not found"
        )
