import os
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Email configuration (simulated for now)
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@movietickets.com")


async def send_booking_confirmation(
    to_email: str,
    booking_number: str,
    movie_title: str,
    theater_name: str,
    show_time: datetime,
    seats: list[dict],
    total_amount: float,
    qr_code: Optional[str] = None
):
    """Send booking confirmation email"""
    if not EMAIL_ENABLED:
        logger.info(f"Email simulation: Booking confirmation to {to_email}")
        logger.info(f"Booking #{booking_number} for {movie_title}")
        return

    # In production, integrate with SendGrid, AWS SES, or similar
    subject = f"Booking Confirmation - {booking_number}"
    seats_str = ", ".join([f"{s['row']}{s['number']}" for s in seats])

    body = f"""
    Dear Customer,

    Your booking has been confirmed!

    Booking Number: {booking_number}
    Movie: {movie_title}
    Theater: {theater_name}
    Show Time: {show_time.strftime('%d %B %Y, %I:%M %p')}
    Seats: {seats_str}
    Total Amount: ${total_amount:.2f}

    Please present this booking number or QR code at the theater entrance.

    Thank you for choosing us!
    """

    logger.info(f"Sending email to {to_email}: {subject}")
    # TODO: Implement actual email sending logic


async def send_password_reset(to_email: str, reset_token: str):
    """Send password reset email"""
    if not EMAIL_ENABLED:
        logger.info(f"Email simulation: Password reset to {to_email}")
        return

    subject = "Password Reset Request"
    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"

    body = f"""
    Dear Customer,

    We received a request to reset your password.

    Click the link below to reset your password:
    {reset_link}

    This link will expire in 1 hour.

    If you didn't request this, please ignore this email.

    Best regards,
    Movie Tickets Team
    """

    logger.info(f"Sending password reset email to {to_email}")
    # TODO: Implement actual email sending logic


async def send_welcome_email(to_email: str, full_name: str):
    """Send welcome email to new users"""
    if not EMAIL_ENABLED:
        logger.info(f"Email simulation: Welcome email to {to_email}")
        return

    subject = "Welcome to Movie Tickets!"

    body = f"""
    Dear {full_name},

    Welcome to Movie Tickets!

    Thank you for creating an account. You can now browse movies, book tickets, and enjoy seamless movie experiences.

    Happy watching!

    Best regards,
    Movie Tickets Team
    """

    logger.info(f"Sending welcome email to {to_email}")
    # TODO: Implement actual email sending logic
