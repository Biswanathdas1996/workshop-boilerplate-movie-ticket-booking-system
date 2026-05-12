import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { bookingsApi } from '../api'

interface Booking {
  id: string
  booking_number: string
  status: string
  total_amount: number
  created_at: string
  movie?: { title: string }
  theater?: { name: string }
  show?: { start_time: string }
  seats: any[]
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadBookings()
  }, [filter])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const data = await bookingsApi.getAll(
        filter === 'all' ? undefined : filter
      )
      setBookings(data)
    } catch (error) {
      console.error('Failed to load bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'status-ready'
      case 'pending':
        return 'status-loading'
      case 'cancelled':
        return 'status-error'
      default:
        return 'status-loading'
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <h1>My Bookings</h1>
        <p className="subtitle">View your past and upcoming movie reservations</p>
      </section>

      <section className="panel">
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setFilter('all')}
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`btn ${filter === 'confirmed' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`btn ${filter === 'cancelled' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Cancelled
          </button>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" role="status" aria-label="Loading bookings"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">🎫</div>
            <h3>No bookings found</h3>
            <p>Start booking your favorite movies!</p>
            <Link to="/movies" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Browse Movies
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>Movie</th>
                  <th>Theater</th>
                  <th>Show Time</th>
                  <th>Seats</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.booking_number}</td>
                    <td>{booking.movie?.title || 'N/A'}</td>
                    <td>{booking.theater?.name || 'N/A'}</td>
                    <td>
                      {booking.show?.start_time
                        ? new Date(booking.show.start_time).toLocaleString()
                        : 'N/A'}
                    </td>
                    <td>
                      {booking.seats.map((s: any) => `${s.row}${s.number}`).join(', ')}
                    </td>
                    <td>${booking.total_amount.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
