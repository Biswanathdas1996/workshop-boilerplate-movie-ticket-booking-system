import { useState, useEffect, FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { bookingsApi, paymentsApi } from '../api'

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')

  useEffect(() => {
    if (bookingId) {
      loadBooking()
    }
  }, [bookingId])

  const loadBooking = async () => {
    try {
      const data = await bookingsApi.getById(bookingId!)
      setBooking(data)
    } catch (error) {
      console.error('Failed to load booking:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (e: FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const paymentData = {
        booking_id: bookingId,
        amount: booking.total_amount,
        payment_method: paymentMethod,
        card_number: cardNumber || undefined,
        card_holder: cardHolder || undefined,
      }

      await paymentsApi.process(paymentData)
      navigate(`/bookings/${bookingId}`)
    } catch (error: any) {
      alert(error.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="Loading payment details"></div>
      </div>
    )
  }

  if (!booking) {
    return (
      <main className="page">
        <div className="empty-state">
          <h2>Booking not found</h2>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="panel panel--narrow">
        <header>
          <h1 className="page-heading page-heading--tight">Checkout</h1>
          <p className="subtitle">Review your reservation and confirm payment.</p>
        </header>

        <div className="alert alert-info alert-banner" role="status">
          This is a payment simulation — no charges are processed.
        </div>

        <div className="summary-block">
          <h2 className="summary-block__title">Order summary</h2>
          <div className="summary-rows">
            <div className="summary-row">
              <span className="summary-row__label">Film</span>
              <span className="summary-row__value">{booking.movie?.title}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Venue</span>
              <span className="summary-row__value">{booking.theater?.name}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Showtime</span>
              <span className="summary-row__value">
                {new Date(booking.show?.start_time).toLocaleString()}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Seats</span>
              <span className="summary-row__value">
                {booking.seats.map((s: any) => `${s.row}${s.number}`).join(', ')}
              </span>
            </div>
            <div className="summary-row summary-row--total">
              <span className="summary-row__label">Total due</span>
              <span className="summary-row__value">${booking.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handlePayment} aria-label="Payment form">
          <div className="form-group">
            <label htmlFor="paymentMethod" className="form-label">
              Payment Method
            </label>
            <select
              id="paymentMethod"
              className="form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="card">Credit/Debit Card</option>
              <option value="upi">UPI</option>
              <option value="wallet">Digital Wallet</option>
            </select>
          </div>

          {paymentMethod === 'card' && (
            <>
              <div className="form-group">
                <label htmlFor="cardNumber" className="form-label">
                  Card Number
                </label>
                <input
                  type="text"
                  id="cardNumber"
                  className="form-input"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cardHolder" className="form-label">
                  Card Holder Name
                </label>
                <input
                  type="text"
                  id="cardHolder"
                  className="form-input"
                  placeholder="John Doe"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={processing}
          >
            {processing ? 'Processing Payment...' : `Pay $${booking.total_amount.toFixed(2)}`}
          </button>
        </form>
      </section>
    </main>
  )
}
