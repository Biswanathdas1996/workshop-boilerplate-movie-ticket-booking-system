from datetime import datetime
import random
import string
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from ..models import PaymentCreate, Payment, PaymentStatus
from ..auth import get_current_user
from ..database import get_database
from ..rate_limiter import limiter, PAYMENT_RATE_LIMIT

router = APIRouter(prefix="/api/payments", tags=["Payments"])


def generate_transaction_id() -> str:
    """Generate a unique transaction ID"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"TXN{timestamp}{random_str}"


@router.post("/", response_model=Payment, status_code=status.HTTP_201_CREATED)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def process_payment(
    payment: PaymentCreate,
    request,
    current_user = Depends(get_current_user)
):
    """Process payment simulation"""
    db = get_database()

    # Verify booking exists and belongs to current user
    try:
        booking = db.bookings.find_one({
            "_id": ObjectId(payment.booking_id),
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

    if booking.get("status") == "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking already paid"
        )

    # Simulate payment processing
    # In production, integrate with payment gateway (Stripe, PayPal, etc.)
    transaction_id = generate_transaction_id()

    # Simulate 95% success rate
    success = random.random() < 0.95

    payment_dict = payment.model_dump()
    payment_dict["transaction_id"] = transaction_id
    payment_dict["status"] = PaymentStatus.COMPLETED if success else PaymentStatus.FAILED
    payment_dict["created_at"] = datetime.utcnow()

    result = db.payments.insert_one(payment_dict)

    if success:
        # Update booking status to confirmed
        db.bookings.update_one(
            {"_id": ObjectId(payment.booking_id)},
            {"$set": {"status": "confirmed"}}
        )

    created_payment = db.payments.find_one({"_id": result.inserted_id})
    created_payment["id"] = str(created_payment.pop("_id"))

    return Payment(**created_payment)


@router.get("/{payment_id}", response_model=Payment)
async def get_payment(
    payment_id: str,
    current_user = Depends(get_current_user)
):
    """Get payment details"""
    db = get_database()

    try:
        payment = db.payments.find_one({"_id": ObjectId(payment_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment ID"
        )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    # Verify payment belongs to user's booking
    booking = db.bookings.find_one({
        "_id": ObjectId(payment["booking_id"]),
        "user_id": current_user.email
    })

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    payment["id"] = str(payment.pop("_id"))
    return Payment(**payment)


@router.get("/booking/{booking_id}", response_model=Payment)
async def get_payment_by_booking(
    booking_id: str,
    current_user = Depends(get_current_user)
):
    """Get payment by booking ID"""
    db = get_database()

    # Verify booking belongs to user
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

    payment = db.payments.find_one({"booking_id": booking_id})

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    payment["id"] = str(payment.pop("_id"))
    return Payment(**payment)


@router.post("/simulate-failure")
async def simulate_payment_failure(
    payment: PaymentCreate,
    current_user = Depends(get_current_user)
):
    """Simulate a payment failure for testing"""
    db = get_database()

    # Verify booking
    try:
        booking = db.bookings.find_one({
            "_id": ObjectId(payment.booking_id),
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

    transaction_id = generate_transaction_id()

    payment_dict = payment.model_dump()
    payment_dict["transaction_id"] = transaction_id
    payment_dict["status"] = PaymentStatus.FAILED
    payment_dict["created_at"] = datetime.utcnow()

    result = db.payments.insert_one(payment_dict)
    created_payment = db.payments.find_one({"_id": result.inserted_id})
    created_payment["id"] = str(created_payment.pop("_id"))

    return Payment(**created_payment)
