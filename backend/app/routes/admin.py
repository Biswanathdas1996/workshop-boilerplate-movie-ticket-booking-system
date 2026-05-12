from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from ..models import UserRole
from ..auth import get_current_admin
from ..database import get_database

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/dashboard/stats")
async def get_dashboard_stats(current_admin = Depends(get_current_admin)):
    """Get dashboard statistics"""
    db = get_database()

    # Count totals
    total_users = db.users.count_documents({"role": UserRole.USER})
    total_movies = db.movies.count_documents({"is_active": True})
    total_theaters = db.theaters.count_documents({})
    total_bookings = db.bookings.count_documents({})

    # Revenue calculations
    total_revenue = 0
    completed_payments = db.payments.find({"status": "completed"})
    for payment in completed_payments:
        total_revenue += payment.get("amount", 0)

    # Recent bookings (last 7 days)
    last_week = datetime.utcnow() - timedelta(days=7)
    recent_bookings = db.bookings.count_documents({
        "created_at": {"$gte": last_week}
    })

    # Popular movies
    pipeline = [
        {
            "$group": {
                "_id": "$show_id",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    popular_shows = list(db.bookings.aggregate(pipeline))

    popular_movies = []
    for show in popular_shows:
        show_doc = db.shows.find_one({"_id": ObjectId(show["_id"])})
        if show_doc:
            movie = db.movies.find_one({"_id": ObjectId(show_doc["movie_id"])})
            if movie:
                popular_movies.append({
                    "title": movie["title"],
                    "bookings": show["count"]
                })

    return {
        "total_users": total_users,
        "total_movies": total_movies,
        "total_theaters": total_theaters,
        "total_bookings": total_bookings,
        "total_revenue": round(total_revenue, 2),
        "recent_bookings": recent_bookings,
        "popular_movies": popular_movies
    }


@router.get("/users")
async def get_all_users(
    current_admin = Depends(get_current_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get all users (admin only)"""
    db = get_database()

    users = list(db.users.find({}).skip(skip).limit(limit).sort("created_at", -1))

    for user in users:
        user["id"] = str(user.pop("_id"))
        user.pop("hashed_password", None)

    return users


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_admin = Depends(get_current_admin)
):
    """Activate a user account"""
    db = get_database()

    try:
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": True}}
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {"message": "User activated successfully"}


@router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    current_admin = Depends(get_current_admin)
):
    """Deactivate a user account"""
    db = get_database()

    try:
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": False}}
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {"message": "User deactivated successfully"}


@router.get("/bookings")
async def get_all_bookings(
    current_admin = Depends(get_current_admin),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get all bookings (admin only)"""
    db = get_database()

    filter_query = {}
    if status:
        filter_query["status"] = status

    bookings = list(
        db.bookings.find(filter_query)
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
    )

    for booking in bookings:
        booking["id"] = str(booking.pop("_id"))

    return bookings


@router.get("/revenue")
async def get_revenue_report(
    current_admin = Depends(get_current_admin),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get revenue report with date filters"""
    db = get_database()

    filter_query = {"status": "completed"}

    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
            filter_query["created_at"] = {"$gte": start}
        except:
            pass

    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
            if "created_at" in filter_query:
                filter_query["created_at"]["$lte"] = end
            else:
                filter_query["created_at"] = {"$lte": end}
        except:
            pass

    payments = list(db.payments.find(filter_query))

    total_revenue = sum(p.get("amount", 0) for p in payments)
    total_transactions = len(payments)

    # Group by payment method
    payment_methods = {}
    for payment in payments:
        method = payment.get("payment_method", "unknown")
        payment_methods[method] = payment_methods.get(method, 0) + payment.get("amount", 0)

    return {
        "total_revenue": round(total_revenue, 2),
        "total_transactions": total_transactions,
        "average_transaction": round(total_revenue / total_transactions, 2) if total_transactions > 0 else 0,
        "by_payment_method": {k: round(v, 2) for k, v in payment_methods.items()}
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_admin = Depends(get_current_admin)
):
    """Delete a user account (admin only)"""
    db = get_database()

    try:
        # Check if user is admin
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user and user.get("role") == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete admin user"
            )

        result = db.users.delete_one({"_id": ObjectId(user_id)})
    except HTTPException:
        raise
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {"message": "User deleted successfully"}
