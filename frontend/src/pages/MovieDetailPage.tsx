import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { moviesApi, showsApi } from '../api'

interface Movie {
  id: string
  title: string
  description: string
  genre: string[]
  duration_minutes: number
  rating: number
  poster_url: string
  trailer_youtube_id: string | null
  language: string
  director: string
  cast: string[]
  release_date: string
}

interface Show {
  id: string
  start_time: string
  price: number
  available_seats: number
  theater_id: string
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadMovieDetails()
      loadShows()
    }
  }, [id])

  const loadMovieDetails = async () => {
    try {
      const data = await moviesApi.getById(id!)
      setMovie(data)
    } catch (error) {
      console.error('Failed to load movie:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadShows = async () => {
    try {
      const data = await showsApi.getAll({ movie_id: id })
      setShows(data)
    } catch (error) {
      console.error('Failed to load shows:', error)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="Loading movie details"></div>
      </div>
    )
  }

  if (!movie) {
    return (
      <main className="page">
        <div className="empty-state">
          <h2>Movie not found</h2>
          <Link to="/movies" className="btn btn-primary">
            Back to Movies
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="movie-detail-layout">
          <img
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            className="movie-detail-poster"
          />

          <div>
            <h1 className="movie-hero__title">{movie.title}</h1>

            <div className="movie-meta-row">
              <span className="status-badge badge-rating">⭐ {movie.rating}/10</span>
              <span className="status-badge badge-muted">{movie.duration_minutes} min</span>
              <span className="status-badge badge-muted">{movie.language}</span>
            </div>

            <div className="genre-tags genre-tags--below-meta">
              {movie.genre.map((g) => (
                <span key={g} className="genre-tag">
                  {g}
                </span>
              ))}
            </div>

            <p className="movie-body">{movie.description}</p>

            <div className="detail-stack">
              <p className="movie-card-info">
                <strong>Director</strong>
                {' · '}
                {movie.director}
              </p>
              <p className="movie-card-info">
                <strong>Cast</strong>
                {' · '}
                {movie.cast.join(', ')}
              </p>
            </div>

            <div className="movie-detail-actions">
              {shows.length > 0 ? (
                <a href="#shows" className="btn btn-primary">
                  🎟 Book Now
                </a>
              ) : (
                <span className="status-badge badge-muted">No shows available</span>
              )}
            </div>
          </div>
        </div>

        {movie.trailer_youtube_id && (
          <div className="section-block">
            <h2 className="section-title">Official trailer</h2>
            <div className="video-container">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailer_youtube_id}`}
                title={`${movie.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}
      </section>

      <section className="panel" id="shows">
        <h2 className="section-title">Available shows</h2>

        {shows.length === 0 ? (
          <div className="empty-state">
            <p>No shows available for this movie yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Show Time</th>
                  <th>Price</th>
                  <th>Available Seats</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shows.map((show) => (
                  <tr key={show.id}>
                    <td>{new Date(show.start_time).toLocaleString()}</td>
                    <td>${show.price.toFixed(2)}</td>
                    <td>{show.available_seats} seats</td>
                    <td>
                      <Link
                        to={`/booking/${show.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        Book Now
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
