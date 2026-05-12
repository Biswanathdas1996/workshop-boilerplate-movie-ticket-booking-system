from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
BOOKING_RATE_LIMIT = "10/minute"  # 10 booking requests per minute
PAYMENT_RATE_LIMIT = "5/minute"   # 5 payment requests per minute
AUTH_RATE_LIMIT = "5/minute"       # 5 auth attempts per minute
GENERAL_RATE_LIMIT = "100/minute"  # 100 general requests per minute
