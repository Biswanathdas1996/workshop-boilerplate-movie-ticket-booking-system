import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { SeatMapSkeleton } from '../components/LoadingSkeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Check } from 'lucide-react'

interface Seat {
  row: string
  number: number
  category: string
  price: number
  status: 'available' | 'booked' | 'selected'
}

export function Booking() {
  const { showId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [seats, setSeats] = useState<Seat[]>([])
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [bookingStep, setBookingStep] = useState(1) // 1: seat selection, 2: summary, 3: payment

  useEffect(() => {
    loadSeats()
  }, [showId])

  const loadSeats = async () => {
    try {
      const response = await api.get(`/shows/${showId}/seats`)
      setSeats(response.data.seats)
    } catch (error) {
      console.error('Failed to load seats', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSeat = (seat: Seat) => {
    if (seat.status === 'booked') return

    const isSelected = selectedSeats.some((s) => s.row === seat.row && s.number === seat.number)

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => !(s.row === seat.row && s.number === seat.number)))
    } else {
      setSelectedSeats([...selectedSeats, seat])
    }
  }

  const validatePromoCode = async () => {
    if (!promoCode) return

    try {
      const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
      const response = await api.post('/promo-codes/validate', { code: promoCode, amount: total })
      setPromoDiscount(response.data.discount_amount)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Invalid promo code')
      setPromoDiscount(0)
    }
  }

  const createBooking = async () => {
    try {
      const response = await api.post('/bookings', {
        show_id: showId,
        seats: selectedSeats,
        promo_code: promoCode || null
      })

      navigate(`/payment/${response.data.id}`)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Booking failed')
    }
  }

  const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
  const finalAmount = totalAmount - promoDiscount

  const seatRows = Array.from(new Set(seats.map((s) => s.row))).sort()

  if (loading) {
    return (
      <div className="booking-page">
        <SeatMapSkeleton />
      </div>
    )
  }

  return (
    <div className="booking-page">
      <div className="booking-progress">
        <div className={`progress-step ${bookingStep >= 1 ? 'active' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">{t('booking.selectSeats')}</span>
        </div>
        <div className={`progress-step ${bookingStep >= 2 ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Review</span>
        </div>
        <div className={`progress-step ${bookingStep >= 3 ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Payment</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {bookingStep === 1 && (
          <motion.div
            key="seat-selection"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="booking-content"
          >
            <div className="seat-legend">
              <div className="legend-item">
                <div className="seat seat-available"></div>
                <span>{t('booking.available')}</span>
              </div>
              <div className="legend-item">
                <div className="seat seat-selected"></div>
                <span>{t('booking.selected')}</span>
              </div>
              <div className="legend-item">
                <div className="seat seat-booked"></div>
                <span>{t('booking.booked')}</span>
              </div>
            </div>

            <div className="screen-indicator">
              <div className="screen">SCREEN</div>
            </div>

            <div className="seat-map">
              {seatRows.map((row) => (
                <div key={row} className="seat-row">
                  <span className="row-label">{row}</span>
                  <div className="seats">
                    {seats
                      .filter((s) => s.row === row)
                      .sort((a, b) => a.number - b.number)
                      .map((seat) => {
                        const isSelected = selectedSeats.some((s) => s.row === seat.row && s.number === seat.number)
                        return (
                          <motion.button
                            key={`${seat.row}${seat.number}`}
                            className={`seat seat-${seat.status} ${isSelected ? 'seat-selected' : ''} seat-${seat.category}`}
                            onClick={() => toggleSeat(seat)}
                            disabled={seat.status === 'booked'}
                            whileHover={seat.status !== 'booked' ? { scale: 1.1 } : {}}
                            whileTap={seat.status !== 'booked' ? { scale: 0.9 } : {}}
                            aria-label={`Seat ${seat.row}${seat.number} ${seat.category} $${seat.price}`}
                          >
                            {seat.number}
                          </motion.button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>

            {selectedSeats.length > 0 && (
              <motion.div className="booking-summary-bar" initial={{ y: 100 }} animate={{ y: 0 }}>
                <div className="selected-seats-info">
                  <strong>Selected Seats:</strong>
                  {selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')}
                </div>
                <div className="total-amount">
                  <strong>{t('booking.total')}:</strong> ${totalAmount.toFixed(2)}
                </div>
                <button className="btn btn-primary" onClick={() => setBookingStep(2)}>
                  Continue <ChevronRight size={20} />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {bookingStep === 2 && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="booking-review"
          >
            <h2>Review Your Booking</h2>

            <div className="review-section">
              <h3>Selected Seats</h3>
              <div className="selected-seats-list">
                {selectedSeats.map((seat) => (
                  <div key={`${seat.row}${seat.number}`} className="seat-item">
                    <span>
                      {seat.row}
                      {seat.number} ({seat.category})
                    </span>
                    <span>${seat.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="review-section">
              <h3>Promo Code</h3>
              <div className="promo-code-input">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
                <button className="btn btn-secondary" onClick={validatePromoCode}>
                  Apply
                </button>
              </div>
              {promoDiscount > 0 && (
                <div className="promo-applied">
                  <Check size={16} />
                  Discount applied: -${promoDiscount.toFixed(2)}
                </div>
              )}
            </div>

            <div className="review-section">
              <div className="amount-breakdown">
                <div className="amount-row">
                  <span>Subtotal</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="amount-row discount">
                    <span>Discount</span>
                    <span>-${promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="amount-row total">
                  <strong>Total</strong>
                  <strong>${finalAmount.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="review-actions">
              <button className="btn btn-secondary" onClick={() => setBookingStep(1)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={createBooking}>
                Proceed to Payment <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
