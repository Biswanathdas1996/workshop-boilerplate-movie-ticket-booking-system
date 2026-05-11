import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Filter, Star } from 'lucide-react'
import api from '../lib/api'
import { MovieCardSkeleton } from '../components/LoadingSkeleton'
import { motion } from 'framer-motion'

interface Movie {
  id: string
  title: string
  poster_url: string
  genre: string[]
  language: string
  duration: number
  average_rating: number
  is_featured: boolean
  is_trending: boolean
}

export function Movies() {
  const { t } = useTranslation()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')

  useEffect(() => {
    loadMovies()
  }, [search, genreFilter, languageFilter])

  const loadMovies = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (genreFilter) params.genre = genreFilter
      if (languageFilter) params.language = languageFilter

      const response = await api.get('/movies', { params })
      setMovies(response.data)
    } catch (error) {
      console.error('Failed to load movies', error)
    } finally {
      setLoading(false)
    }
  }

  const featuredMovies = movies.filter((m) => m.is_featured)
  const trendingMovies = movies.filter((m) => m.is_trending)
  const allMovies = movies

  return (
    <div className="movies-page">
      <div className="movies-header">
        <h1>{t('nav.movies')}</h1>

        <div className="search-filter-bar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder={t('movies.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search movies"
            />
          </div>

          <div className="filter-group">
            <Filter size={20} />
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              aria-label="Filter by genre"
            >
              <option value="">All Genres</option>
              <option value="Action">Action</option>
              <option value="Comedy">Comedy</option>
              <option value="Drama">Drama</option>
              <option value="Horror">Horror</option>
              <option value="Sci-Fi">Sci-Fi</option>
            </select>

            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              aria-label="Filter by language"
            >
              <option value="">All Languages</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
            </select>
          </div>
        </div>
      </div>

      {featuredMovies.length > 0 && (
        <section className="movie-section">
          <h2>{t('movies.featured')}</h2>
          <div className="movie-grid">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <MovieCardSkeleton key={i} />)
              : featuredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
          </div>
        </section>
      )}

      {trendingMovies.length > 0 && (
        <section className="movie-section">
          <h2>{t('movies.trending')}</h2>
          <div className="movie-grid">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <MovieCardSkeleton key={i} />)
              : trendingMovies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
          </div>
        </section>
      )}

      <section className="movie-section">
        <h2>All Movies</h2>
        <div className="movie-grid">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <MovieCardSkeleton key={i} />)
            : allMovies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
        </div>
      </section>
    </div>
  )
}

function MovieCard({ movie }: { movie: Movie }) {
  return (
    <motion.div
      className="movie-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      <Link to={`/movies/${movie.id}`}>
        <div className="movie-poster">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt={movie.title} loading="lazy" />
          ) : (
            <div className="poster-placeholder">{movie.title[0]}</div>
          )}
          {movie.is_featured && <span className="badge badge-featured">Featured</span>}
          {movie.is_trending && <span className="badge badge-trending">Trending</span>}
        </div>
        <div className="movie-info">
          <h3>{movie.title}</h3>
          <div className="movie-meta">
            <span className="rating">
              <Star size={14} fill="currentColor" />
              {movie.average_rating.toFixed(1)}
            </span>
            <span>{movie.language}</span>
            <span>{movie.duration} min</span>
          </div>
          <div className="movie-genres">
            {movie.genre.slice(0, 2).map((g) => (
              <span key={g} className="genre-tag">
                {g}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
