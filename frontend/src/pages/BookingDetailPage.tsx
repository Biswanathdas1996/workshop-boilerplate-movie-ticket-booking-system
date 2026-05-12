import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { bookingsApi } from '../api'
import { QRCodeSVG } from 'qrcode.react'

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
        <h1 style={{ marginBottom: '1.5rem' }}>Booking Details</h1>

        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          Booking #{booking.booking_number} - {booking.status.toUpperCase()}
        </div>

        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Booking Information</h2>

            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Movie:</strong> {booking.movie?.title}
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Theater:</strong> {booking.theater?.name}
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Location:</strong> {booking.theater?.location}, {booking.theater?.city}
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Show Time:</strong>{' '}
              {new Date(booking.show?.start_time).toLocaleString()}
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Seats:</strong>{' '}
              {booking.seats.map((s: any) => `${s.row}${s.number}`).join(', ')}
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Total Amount:</strong> ${booking.total_amount.toFixed(2)}
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Booked On:</strong> {new Date(booking.created_at).toLocaleString()}
            </p>

            {booking.status === 'confirmed' && !showPassed && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn btn-danger"
                style={{ marginTop: '1rem' }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            )}
          </div>

          {booking.status === 'confirmed' && booking.qr_code && (
            <div>
              <h2 style={{ marginBottom: '1rem' }}>Digital Ticket</h2>
              <p style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
                Present this QR code at the theater entrance
              </p>

              <div className="qr-code-container">
                {booking.qr_code.startsWith('data:image') ? (
                  <img
                    src={booking.qr_code}
                    alt="Booking QR Code"
                    style={{ maxWidth: '300px' }}
                  />
                ) : (
                  <QRCodeSVG
                    value={booking.qr_code}
                    size={256}
                    level="H"
                    includeMargin
                  />
                )}
              </div>

              <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                Booking #{booking.booking_number}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
