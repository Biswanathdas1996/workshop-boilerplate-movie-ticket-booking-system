import { motion } from 'framer-motion'

export function MovieCardSkeleton() {
  return (
    <motion.div
      className="skeleton-card"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
    >
      <div className="skeleton-poster"></div>
      <div className="skeleton-text skeleton-title"></div>
      <div className="skeleton-text skeleton-subtitle"></div>
    </motion.div>
  )
}

export function SeatMapSkeleton() {
  return (
    <motion.div
      className="skeleton-seat-map"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
    >
      {Array.from({ length: 8 }).map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-seat-row">
          {Array.from({ length: 10 }).map((_, seatIdx) => (
            <div key={seatIdx} className="skeleton-seat"></div>
          ))}
        </div>
      ))}
    </motion.div>
  )
}

export function BookingCardSkeleton() {
  return (
    <motion.div
      className="skeleton-booking-card"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
    >
      <div className="skeleton-text skeleton-title"></div>
      <div className="skeleton-text skeleton-subtitle"></div>
      <div className="skeleton-text skeleton-subtitle"></div>
    </motion.div>
  )
}
