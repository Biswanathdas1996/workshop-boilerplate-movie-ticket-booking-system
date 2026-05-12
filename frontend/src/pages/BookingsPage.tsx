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
        <p className="eyebrow">Reservations</p>
        <h1>My bookings</h1>
        <p className="subtitle">View upcoming and past showtimes at a glance.</p>
      </section>

      <section className="panel">
        <div
          className="segmented-control"
          role="tablist"
          aria-label="Filter bookings by status"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`segmented-control__btn${filter === 'all' ? ' is-active' : ''}`}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'confirmed'}
            onClick={() => setFilter('confirmed')}
            className={`segmented-control__btn${filter === 'confirmed' ? ' is-active' : ''}`}
          >
            Confirmed
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'pending'}
            onClick={() => setFilter('pending')}
            className={`segmented-control__btn${filter === 'pending' ? ' is-active' : ''}`}
          >
            Pending
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'cancelled'}
            onClick={() => setFilter('cancelled')}
            className={`segmented-control__btn${filter === 'cancelled' ? ' is-active' : ''}`}
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
            <Link to="/movies" className="btn btn-primary empty-state-actions">
              Browse movies
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
                    <td className="table-actions">
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Details
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
