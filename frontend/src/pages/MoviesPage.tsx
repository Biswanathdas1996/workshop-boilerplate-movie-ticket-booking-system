import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { moviesApi } from '../api'

interface Movie {
  id: string
  title: string
  description: string
  genre: string[]
  duration_minutes: number
  rating: number
  poster_url: string
  language: string
  release_date: string
}

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('')

  useEffect(() => {
    loadMovies()
  }, [searchQuery, selectedGenre, selectedLanguage])

  const loadMovies = async () => {
    setLoading(true)
    try {
      const data = await moviesApi.getAll({
        query: searchQuery || undefined,
        genre: selectedGenre || undefined,
        language: selectedLanguage || undefined,
      })
      setMovies(data)
    } catch (error) {
      console.error('Failed to load movies:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Now showing</p>
        <h1>Browse movies</h1>
        <p className="subtitle">Search by title or narrow the list by genre and language.</p>
      </section>

      <section className="panel">
        <div className="search-bar">
          <div className="search-bar__main">
            <label className="sr-only" htmlFor="movie-search">
              Search movies
            </label>
            <div className="search-bar__input-wrap">
              <svg
                className="search-bar__icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M16.5 16.5 21 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                id="movie-search"
                type="search"
                placeholder="Search by title…"
                className="form-input search-input search-bar__search-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="search-bar__filters" role="group" aria-label="Filter movies">
            <div className="search-bar__field">
              <label className="search-bar__label" htmlFor="movie-genre">
                Genre
              </label>
              <select
                id="movie-genre"
                className="form-select filter-select search-bar__select"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
              >
                <option value="">All genres</option>
                <option value="Action">Action</option>
                <option value="Comedy">Comedy</option>
                <option value="Drama">Drama</option>
                <option value="Horror">Horror</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Thriller">Thriller</option>
              </select>
            </div>

            <div className="search-bar__field">
              <label className="search-bar__label" htmlFor="movie-language">
                Language
              </label>
              <select
                id="movie-language"
                className="form-select filter-select search-bar__select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="">All languages</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" role="status" aria-label="Loading movies"></div>
          </div>
        ) : movies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">🎬</div>
            <h3>No movies found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="movie-grid">
            {movies.map((movie) => (
              <Link
                to={`/movies/${movie.id}`}
                key={movie.id}
                className="movie-card"
                aria-label={`View details for ${movie.title}`}
              >
                <img
                  src={movie.poster_url}
                  alt={`${movie.title} poster`}
                  className="movie-card-image"
                  loading="lazy"
                />
                <div className="movie-card-content">
                  <h3 className="movie-card-title">{movie.title}</h3>
                  <p className="movie-card-info">
                    ⭐ {movie.rating}/10 • {movie.duration_minutes} min • {movie.language}
                  </p>
                  <div className="genre-tags" role="list" aria-label="Genres">
                    {movie.genre.slice(0, 3).map((g) => (
                      <span key={g} className="genre-tag" role="listitem">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
