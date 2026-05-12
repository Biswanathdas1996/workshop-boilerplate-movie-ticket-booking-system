import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { bookingsApi } from '../api'
import { QRCodeSVG } from 'qrcode.react'

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (id) {
      loadBooking()
    }
  }, [id])

  const loadBooking = async () => {
    try {
      const data = await bookingsApi.getById(id!)
      setBooking(data)
    } catch (error) {
      console.error('Failed to load booking:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    setCancelling(true)
    try {
      await bookingsApi.cancel(id!)
      await loadBooking()
    } catch (error: any) {
      alert(error.message || 'Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="Loading booking details"></div>
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

  const showPassed = new Date(booking.show?.start_time) < new Date()

  return (
    <main className="page">
      <section className="panel">
        <header>
          <p className="eyebrow">Reservation</p>
          <h1 className="page-heading page-heading--tight">{booking.movie?.title || 'Booking'}</h1>
          <div className="movie-meta-row page-header-badges">
            <span className="status-badge badge-muted">{booking.booking_number}</span>
            <span
              className={`status-badge ${
                booking.status === 'confirmed' ? 'status-ready' : 'badge-muted'
              }`}
            >
              {booking.status}
            </span>
          </div>
        </header>

        <div className="alert alert-success alert-banner" role="status">
          {booking.status === 'confirmed'
            ? 'Confirmed — arrive 15 minutes before showtime with your QR code ready.'
            : `Status: ${booking.status}.`}
        </div>

        <div className="detail-grid">
          <div className="info-card">
            <h2 className="info-card__title">Booking details</h2>
            <div className="info-lines">
              <p className="info-line">
                <strong>Theater</strong>
                {booking.theater?.name}
              </p>
              <p className="info-line">
                <strong>Address</strong>
                {booking.theater?.location}, {booking.theater?.city}
              </p>
              <p className="info-line">
                <strong>Showtime</strong>
                {new Date(booking.show?.start_time).toLocaleString()}
              </p>
              <p className="info-line">
                <strong>Seats</strong>
                {booking.seats.map((s: any) => `${s.row}${s.number}`).join(', ')}
              </p>
              <p className="info-line">
                <strong>Total paid</strong>${booking.total_amount.toFixed(2)}
              </p>
              <p className="info-line">
                <strong>Booked on</strong>
                {new Date(booking.created_at).toLocaleString()}
              </p>
            </div>

            {booking.status === 'confirmed' && !showPassed && (
              <div className="info-actions">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="btn btn-danger btn-sm"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel booking'}
                </button>
              </div>
            )}
          </div>

          {booking.status === 'confirmed' && booking.qr_code ? (
            <div className="info-card summary-block">
              <h2 className="summary-block__title">Digital ticket</h2>
              <p className="ticket-note">
                Present this QR code at the entrance — brightness up, center on screen.
              </p>

              <div className="qr-code-container">
                {booking.qr_code.startsWith('data:image') ? (
                  <img src={booking.qr_code} alt="Booking QR code" />
                ) : (
                  <QRCodeSVG
                    value={booking.qr_code}
                    size={256}
                    level="H"
                    includeMargin
                  />
                )}
              </div>

              <p className="qr-caption">Booking #{booking.booking_number}</p>
            </div>
          ) : (
            <div className="info-card summary-block">
              <h2 className="summary-block__title">Digital ticket</h2>
              <p className="ticket-note">
                Your QR code appears here once the booking is confirmed and paid.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
