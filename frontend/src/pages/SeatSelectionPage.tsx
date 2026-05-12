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
        <header>
          <h1 className="page-heading">Select your seats</h1>
          <p className="subtitle">
            {new Date(show.start_time).toLocaleString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </header>

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

        <div className="seat-legend" aria-label="Seat legend">
          <span className="seat-legend__item">
            <span className="seat seat-available" aria-hidden="true"></span>
            Available
          </span>
          <span className="seat-legend__item">
            <span className="seat seat-selected" aria-hidden="true"></span>
            Selected
          </span>
          <span className="seat-legend__item">
            <span className="seat seat-booked" aria-hidden="true"></span>
            Booked
          </span>
        </div>
      </section>

      <section className="panel">
        <h2 className="summary-block__title">Booking summary</h2>

        {selectedSeats.length > 0 ? (
          <>
            <div className="summary-rows summary-rows--spaced">
              <div className="summary-row">
                <span className="summary-row__label">Seats</span>
                <span className="summary-row__value">
                  {selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Quantity</span>
                <span className="summary-row__value">{selectedSeats.length}</span>
              </div>
              <div className="summary-row summary-row--total">
                <span className="summary-row__label">Total</span>
                <span className="summary-row__value">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleBooking}
              disabled={booking}
              className="btn btn-primary btn-block"
            >
              {booking ? 'Processing...' : 'Continue to payment'}
            </button>
          </>
        ) : (
          <p className="empty-state empty-state--inline">Tap seats on the map to start your booking.</p>
        )}
      </section>
    </main>
  )
}
