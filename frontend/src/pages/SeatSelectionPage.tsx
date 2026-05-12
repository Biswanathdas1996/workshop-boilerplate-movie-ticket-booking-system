import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { showsApi, bookingsApi } from '../api'

interface Seat {
  id: string
  row: string
  number: number
  status: 'available' | 'booked' | 'selected'
}

interface Show {
  id: string
  price: number
  start_time: string
  movie_id: string
}

export default function SeatSelectionPage() {
  const { showId } = useParams<{ showId: string }>()
  const navigate = useNavigate()
  const [show, setShow] = useState<Show | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    if (showId) {
      loadShowAndSeats()
    }
  }, [showId])

  const loadShowAndSeats = async () => {
    try {
      const [showData, seatsData] = await Promise.all([
        showsApi.getById(showId!),
        showsApi.getSeats(showId!),
      ])
      setShow(showData)
      setSeats(seatsData)
    } catch (error) {
      console.error('Failed to load show:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSeat = (seat: Seat) => {
    if (seat.status === 'booked') return

    const isSelected = selectedSeats.some((s) => s.id === seat.id)
    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id))
    } else {
      setSelectedSeats([...selectedSeats, seat])
    }
  }

  const handleBooking = async () => {
    if (selectedSeats.length === 0 || !show) return

    setBooking(true)
    try {
      const bookingData = {
        show_id: showId,
        seats: selectedSeats.map((s) => ({ row: s.row, number: s.number })),
        total_amount: selectedSeats.length * show.price,
        user_id: 'current-user', // Will be filled by backend
      }

      const result = await bookingsApi.create(bookingData)
      navigate(`/payment/${result.id}`)
    } catch (error: any) {
      alert(error.message || 'Booking failed')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="Loading seats"></div>
      </div>
    )
  }

  if (!show) {
    return (
      <main className="page">
        <div className="empty-state">
          <h2>Show not found</h2>
        </div>
      </main>
    )
  }

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = []
    acc[seat.row].push(seat)
    return acc
  }, {} as Record<string, Seat[]>)

  const totalAmount = selectedSeats.length * show.price

  return (
    <main className="page">
      <section className="panel">
        <h1 style={{ marginBottom: '1rem' }}>Select Your Seats</h1>
        <p className="subtitle">Show time: {new Date(show.start_time).toLocaleString()}</p>

        <div className="screen" role="img" aria-label="Screen">
          SCREEN THIS WAY
        </div>

        <div className="seat-grid" role="group" aria-label="Seat selection">
          {Object.keys(seatsByRow)
            .sort()
            .map((row) => (
              <div key={row} className="seat-row">
                <span className="seat-row-label" aria-label={`Row ${row}`}>
                  {row}
                </span>
                {seatsByRow[row]
                  .sort((a, b) => a.number - b.number)
                  .map((seat) => {
                    const isSelected = selectedSeats.some((s) => s.id === seat.id)
                    const seatClass = seat.status === 'booked'
                      ? 'seat-booked'
                      : isSelected
                      ? 'seat-selected'
                      : 'seat-available'

                    return (
                      <button
                        key={seat.id}
                        className={`seat ${seatClass}`}
                        onClick={() => toggleSeat(seat)}
                        disabled={seat.status === 'booked'}
                        aria-label={`Seat ${row}${seat.number}, ${seat.status === 'booked' ? 'unavailable' : isSelected ? 'selected' : 'available'}`}
                        aria-pressed={isSelected}
                      >
                        {seat.number}
                      </button>
                    )
                  })}
              </div>
            ))}
        </div>

        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="seat seat-available" aria-hidden="true"></div>
            <span>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="seat seat-selected" aria-hidden="true"></div>
            <span>Selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="seat seat-booked" aria-hidden="true"></div>
            <span>Booked</span>
          </div>
        </div>
      </section>

      <section className="panel booking-summary">
        <h2 style={{ marginBottom: '1rem' }}>Booking Summary</h2>

        {selectedSeats.length > 0 ? (
          <>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Selected Seats:</strong>{' '}
              {selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Number of Seats:</strong> {selectedSeats.length}
            </p>
            <p style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>
              <strong>Total Amount:</strong> ${totalAmount.toFixed(2)}
            </p>

            <button
              onClick={handleBooking}
              disabled={booking}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {booking ? 'Processing...' : 'Continue to Payment'}
            </button>
          </>
        ) : (
          <p className="empty-state">Please select at least one seat</p>
        )}
      </section>
    </main>
  )
}
