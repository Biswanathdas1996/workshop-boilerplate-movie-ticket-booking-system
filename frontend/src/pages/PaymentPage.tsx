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
      <section className="panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Payment</h1>

        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          This is a payment simulation. No real transaction will be processed.
        </div>

        <div className="booking-summary" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Booking Summary</h2>
          <p><strong>Movie:</strong> {booking.movie?.title}</p>
          <p><strong>Theater:</strong> {booking.theater?.name}</p>
          <p><strong>Show Time:</strong> {new Date(booking.show?.start_time).toLocaleString()}</p>
          <p><strong>Seats:</strong> {booking.seats.map((s: any) => `${s.row}${s.number}`).join(', ')}</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '1rem' }}>
            <strong>Total Amount:</strong> ${booking.total_amount.toFixed(2)}
          </p>
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
            className="btn btn-primary"
            disabled={processing}
            style={{ width: '100%' }}
          >
            {processing ? 'Processing Payment...' : `Pay $${booking.total_amount.toFixed(2)}`}
          </button>
        </form>
      </section>
    </main>
  )
}
