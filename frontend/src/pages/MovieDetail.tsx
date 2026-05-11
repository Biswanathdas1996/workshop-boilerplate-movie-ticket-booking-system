import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Star, Play } from 'lucide-react'
import api from '../lib/api'
import { motion } from 'framer-motion'

interface Movie {
  id: string
  title: string
  synopsis: string
  poster_url: string
  trailer_url: string
  genre: string[]
  language: string
  duration: number
  release_date: string
  cast: string[]
  director: string
  average_rating: number
  total_reviews: number
}

interface Show {
  id: string
  show_date: string
  show_time: string
  available_seats: number
}

export function MovieDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMovie()
    loadShows()
  }, [id])

  const loadMovie = async () => {
    try {
      const response = await api.get(`/movies/${id}`)
      setMovie(response.data)
    } catch (error) {
      console.error('Failed to load movie', error)
    } finally {
      setLoading(false)
    }
  }

  const loadShows = async () => {
    try {
      const response = await api.get('/shows', { params: { movie_id: id } })
      setShows(response.data)

      if (response.data.length > 0) {
        setSelectedDate(response.data[0].show_date)
      }
    } catch (error) {
      console.error('Failed to load shows', error)
    }
  }

  const handleBookShow = (showId: string) => {
    navigate(`/booking/${showId}`)
  }

  if (loading || !movie) {
    return <div className="loading-container">Loading...</div>
  }

  const showsByDate = shows.filter((s) => s.show_date === selectedDate)
  const uniqueDates = Array.from(new Set(shows.map((s) => s.show_date)))

  return (
    <motion.div
      className="movie-detail-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="movie-hero">
        <div className="movie-backdrop">
          {movie.poster_url && <img src={movie.poster_url} alt={movie.title} />}
        </div>
        <div className="movie-hero-content">
          <div className="movie-poster-large">
            {movie.poster_url ? (
              <img src={movie.poster_url} alt={movie.title} />
            ) : (
              <div className="poster-placeholder">{movie.title[0]}</div>
            )}
          </div>
          <div className="movie-details">
            <h1>{movie.title}</h1>
            <div className="movie-meta-large">
              <span className="rating-large">
                <Star size={20} fill="currentColor" />
                {movie.average_rating.toFixed(1)} ({movie.total_reviews} reviews)
              </span>
              <span>
                <Clock size={16} />
                {movie.duration} min
              </span>
              <span>{movie.language}</span>
              <span>
                <Calendar size={16} />
                {movie.release_date}
              </span>
            </div>
            <div className="movie-genres-large">
              {movie.genre.map((g) => (
                <span key={g} className="genre-tag">
                  {g}
                </span>
              ))}
            </div>
            {movie.trailer_url && (
              <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <Play size={20} />
                Watch Trailer
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="movie-content">
        <section className="movie-section">
          <h2>Synopsis</h2>
          <p>{movie.synopsis}</p>
        </section>

        <section className="movie-section">
          <h2>Cast & Crew</h2>
          <p>
            <strong>Director:</strong> {movie.director}
          </p>
          <p>
            <strong>Cast:</strong> {movie.cast.join(', ')}
          </p>
        </section>

        {shows.length > 0 && (
          <section className="movie-section">
            <h2>Book Tickets</h2>
            <div className="date-selector">
              {uniqueDates.map((date) => (
                <button
                  key={date}
                  className={`date-button ${date === selectedDate ? 'active' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>

            <div className="show-times">
              {showsByDate.map((show) => (
                <motion.button
                  key={show.id}
                  className="show-time-button"
                  onClick={() => handleBookShow(show.id)}
                  disabled={show.available_seats === 0}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="show-time">{show.show_time}</span>
                  <span className="seats-available">{show.available_seats} seats</span>
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  )
}
