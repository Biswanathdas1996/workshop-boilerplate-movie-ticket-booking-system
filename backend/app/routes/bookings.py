from datetime import datetime
import random
import string
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from ..models import BookingCreate, Booking, BookingDetail, BookingStatus, SeatStatus
from ..auth import get_current_user
from ..database import get_database
from ..qr_service import generate_qr_code
from ..email_service import send_booking_confirmation
from ..rate_limiter import limiter, BOOKING_RATE_LIMIT

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


def generate_booking_number() -> str:
    """Generate a unique booking number"""
    timestamp = datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"BK{timestamp}{random_str}"


@router.post("/", response_model=Booking, status_code=status.HTTP_201_CREATED)
@limiter.limit(BOOKING_RATE_LIMIT)
async def create_booking(
    booking: BookingCreate,
    request,
    current_user = Depends(get_current_user)
):
    """Create a new booking"""
    db = get_database()

    # Verify show exists
    try:
        show = db.shows.find_one({"_id": ObjectId(booking.show_id)})
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

    # Verify all seats are available and mark them as booked
    seat_ids = []
    for seat_info in booking.seats:
        seat = db.seats.find_one({
            "show_id": booking.show_id,
            "row": seat_info["row"],
            "number": seat_info["number"],
            "status": {"$in": [SeatStatus.AVAILABLE, SeatStatus.SELECTED]}
        })

        if not seat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Seat {seat_info['row']}{seat_info['number']} is not available"
            )

        seat_ids.append(str(seat["_id"]))

    # Create booking
    booking_number = generate_booking_number()
    booking_dict = booking.model_dump()
    booking_dict["booking_number"] = booking_number
    booking_dict["status"] = BookingStatus.PENDING
    booking_dict["created_at"] = datetime.utcnow()
    booking_dict["user_id"] = current_user.email  # Store user email

    result = db.bookings.insert_one(booking_dict)
    booking_id = str(result.inserted_id)

    # Mark seats as booked
    for seat_id in seat_ids:
        db.seats.update_one(
            {"_id": ObjectId(seat_id)},
            {"$set": {"status": SeatStatus.BOOKED}}
        )

    # Generate QR code
    qr_data = f"BOOKING:{booking_number}|SHOW:{booking.show_id}|USER:{current_user.email}"
    qr_code = generate_qr_code(qr_data)

    # Update booking with QR code
    db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"qr_code": qr_code}}
    )

    # Send confirmation email
    movie = db.movies.find_one({"_id": ObjectId(show["movie_id"])})
    theater = db.theaters.find_one({"_id": ObjectId(show["theater_id"])})

    await send_booking_confirmation(
        to_email=current_user.email,
        booking_number=booking_number,
        movie_title=movie["title"] if movie else "Unknown",
        theater_name=theater["name"] if theater else "Unknown",
        show_time=show["start_time"],
        seats=booking.seats,
        total_amount=booking.total_amount,
        qr_code=qr_code
    )

    created_booking = db.bookings.find_one({"_id": ObjectId(booking_id)})
    created_booking["id"] = str(created_booking.pop("_id"))

    return Booking(**created_booking)


@router.get("/", response_model=list[BookingDetail])
async def get_user_bookings(
    current_user = Depends(get_current_user),
    status: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all bookings for current user"""
    db = get_database()

    filter_query = {"user_id": current_user.email}

    if status:
        filter_query["status"] = status

    bookings = list(
        db.bookings.find(filter_query)
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
    )

    result = []
    for booking in bookings:
        booking["id"] = str(booking.pop("_id"))

        # Get show details
        show = db.shows.find_one({"_id": ObjectId(booking["show_id"])})
        if show:
            show["id"] = str(show.pop("_id"))
            booking["show"] = show

            # Get movie details
            movie = db.movies.find_one({"_id": ObjectId(show["movie_id"])})
            if movie:
                movie["id"] = str(movie.pop("_id"))
                booking["movie"] = movie

            # Get theater details
            theater = db.theaters.find_one({"_id": ObjectId(show["theater_id"])})
            if theater:
                theater["id"] = str(theater.pop("_id"))
                booking["theater"] = theater

        result.append(BookingDetail(**booking))

    return result


@router.get("/{booking_id}", response_model=BookingDetail)
async def get_booking(
    booking_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific booking by ID"""
    db = get_database()

    try:
        booking = db.bookings.find_one({
            "_id": ObjectId(booking_id),
            "user_id": current_user.email
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid booking ID"
        )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    booking["id"] = str(booking.pop("_id"))

    # Get show details
    show = db.shows.find_one({"_id": ObjectId(booking["show_id"])})
    if show:
        show["id"] = str(show.pop("_id"))
        booking["show"] = show

        # Get movie details
        movie = db.movies.find_one({"_id": ObjectId(show["movie_id"])})
        if movie:
            movie["id"] = str(movie.pop("_id"))
            booking["movie"] = movie

        # Get theater details
        theater = db.theaters.find_one({"_id": ObjectId(show["theater_id"])})
        if theater:
            theater["id"] = str(theater.pop("_id"))
            booking["theater"] = theater

    return BookingDetail(**booking)


@router.post("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: str,
    current_user = Depends(get_current_user)
):
    """Confirm a booking after successful payment"""
    db = get_database()

    try:
        result = db.bookings.update_one(
            {"_id": ObjectId(booking_id), "user_id": current_user.email},
            {"$set": {"status": BookingStatus.CONFIRMED}}
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid booking ID"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    return {"message": "Booking confirmed successfully"}


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    current_user = Depends(get_current_user)
):
    """Cancel a booking and release seats"""
    db = get_database()

    try:
        booking = db.bookings.find_one({
            "_id": ObjectId(booking_id),
            "user_id": current_user.email
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid booking ID"
        )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    if booking["status"] == BookingStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking already cancelled"
        )

    # Release seats
    for seat_info in booking["seats"]:
        db.seats.update_one(
            {
                "show_id": booking["show_id"],
                "row": seat_info["row"],
                "number": seat_info["number"]
            },
            {"$set": {"status": SeatStatus.AVAILABLE}}
        )

    # Update booking status
    db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": BookingStatus.CANCELLED}}
    )

    return {"message": "Booking cancelled successfully"}
