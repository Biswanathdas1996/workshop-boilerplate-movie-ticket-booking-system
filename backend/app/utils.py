from typing import Optional, Dict, Any
import qrcode
from io import BytesIO
import base64
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import io


def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 encoded string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"


def generate_booking_id() -> str:
    """Generate unique booking ID"""
    return f"BKG{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"


def generate_receipt_pdf(booking_data: Dict[str, Any]) -> bytes:
    """Generate PDF receipt for booking"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Header
    p.setFont("Helvetica-Bold", 24)
    p.drawString(100, height - 100, "Movie Ticket Receipt")

    # Booking details
    p.setFont("Helvetica", 12)
    y_position = height - 150
    seat_labels = [f"{s['row']}{s['number']}" for s in booking_data.get('seats', [])]

    details = [
        f"Booking ID: {booking_data.get('id', 'N/A')}",
        f"Movie: {booking_data.get('movie_title', 'N/A')}",
        f"Theater: {booking_data.get('theater_name', 'N/A')}",
        f"Screen: {booking_data.get('screen_name', 'N/A')}",
        f"Date: {booking_data.get('show_date', 'N/A')}",
        f"Time: {booking_data.get('show_time', 'N/A')}",
        f"Seats: {', '.join(seat_labels)}",
        f"Total Amount: ${booking_data.get('final_amount', 0):.2f}",
    ]

    for detail in details:
        p.drawString(100, y_position, detail)
        y_position -= 20

    # Add QR code if available
    if booking_data.get('qr_code'):
        qr_data = booking_data['qr_code'].split(',')[1]
        qr_bytes = base64.b64decode(qr_data)
        qr_image = ImageReader(io.BytesIO(qr_bytes))
        p.drawImage(qr_image, 100, y_position - 150, width=150, height=150)

    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer.read()


def calculate_discount(amount: float, promo_code: Optional[Dict[str, Any]]) -> float:
    """Calculate discount amount based on promo code"""
    if not promo_code:
        return 0.0

    discount_percent = promo_code.get('discount_percent', 0)
    return amount * (discount_percent / 100)


def format_booking_email(booking_data: Dict[str, Any]) -> str:
    """Format booking confirmation email"""
    seats_str = ', '.join([f"{s['row']}{s['number']}" for s in booking_data.get('seats', [])])

    return f"""
    <html>
    <body style="font-family: 'Proxima Nova', Arial, sans-serif;">
        <h2>Booking Confirmation</h2>
        <p>Dear Customer,</p>
        <p>Your booking has been confirmed!</p>

        <h3>Booking Details:</h3>
        <ul>
            <li><strong>Booking ID:</strong> {booking_data.get('id', 'N/A')}</li>
            <li><strong>Movie:</strong> {booking_data.get('movie_title', 'N/A')}</li>
            <li><strong>Theater:</strong> {booking_data.get('theater_name', 'N/A')}</li>
            <li><strong>Screen:</strong> {booking_data.get('screen_name', 'N/A')}</li>
            <li><strong>Date:</strong> {booking_data.get('show_date', 'N/A')}</li>
            <li><strong>Time:</strong> {booking_data.get('show_time', 'N/A')}</li>
            <li><strong>Seats:</strong> {seats_str}</li>
            <li><strong>Total Amount:</strong> ${booking_data.get('final_amount', 0):.2f}</li>
        </ul>

        <p>Please show your QR code at the theater entrance.</p>
        <p>Thank you for choosing us!</p>
    </body>
    </html>
    """


def send_email_notification(to_email: str, subject: str, html_content: str):
    """Send email notification (stub - integrate with actual email service)"""
    # TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    print(f"EMAIL: To={to_email}, Subject={subject}")
    print(html_content)


def send_sms_notification(phone: str, message: str):
    """Send SMS notification (stub - integrate with actual SMS service)"""
    # TODO: Integrate with Twilio or similar SMS service
    print(f"SMS: To={phone}, Message={message}")


def send_push_notification(user_id: str, title: str, body: str):
    """Send push notification (stub - integrate with FCM or similar)"""
    # TODO: Integrate with Firebase Cloud Messaging or similar
    print(f"PUSH: User={user_id}, Title={title}, Body={body}")
