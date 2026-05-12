import { useState, useEffect } from 'react'
import { adminApi, moviesApi, theatersApi, showsApi } from '../api'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'movies' | 'theaters' | 'users'>('overview')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await adminApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="Loading dashboard"></div>
      </div>
    )
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Operations</p>
        <h1>Admin dashboard</h1>
        <p className="subtitle">Monitor throughput, catalogs, and user access.</p>
      </section>

      <section className="panel">
        <div
          className="segmented-control"
          role="tablist"
          aria-label="Admin sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`segmented-control__btn${activeTab === 'overview' ? ' is-active' : ''}`}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'movies'}
            onClick={() => setActiveTab('movies')}
            className={`segmented-control__btn${activeTab === 'movies' ? ' is-active' : ''}`}
          >
            Movies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'theaters'}
            onClick={() => setActiveTab('theaters')}
            className={`segmented-control__btn${activeTab === 'theaters' ? ' is-active' : ''}`}
          >
            Theaters
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            className={`segmented-control__btn${activeTab === 'users' ? ' is-active' : ''}`}
          >
            Users
          </button>
        </div>

        {activeTab === 'overview' && stats && (
          <>
            <h2 className="section-title">System overview</h2>

            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-value">{stats.total_users}</div>
                <div className="stat-label">Total Users</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{stats.total_movies}</div>
                <div className="stat-label">Active Movies</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{stats.total_theaters}</div>
                <div className="stat-label">Theaters</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{stats.total_bookings}</div>
                <div className="stat-label">Total Bookings</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">${stats.total_revenue.toFixed(2)}</div>
                <div className="stat-label">Total Revenue</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{stats.recent_bookings}</div>
                <div className="stat-label">Bookings (Last 7 Days)</div>
              </div>
            </div>

            {stats.popular_movies && stats.popular_movies.length > 0 && (
              <>
                <h2 className="section-title section-title--spaced">Popular movies</h2>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Movie</th>
                        <th>Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.popular_movies.map((movie: any, index: number) => (
                        <tr key={index}>
                          <td>{movie.title}</td>
                          <td>{movie.bookings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'movies' && <MovieManagement />}
        {activeTab === 'theaters' && <TheaterManagement />}
        {activeTab === 'users' && <UserManagement />}
      </section>
    </main>
  )
}

// Movie Management Component
function MovieManagement() {
  const [movies, setMovies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMovies()
  }, [])

  const loadMovies = async () => {
    try {
      const data = await moviesApi.getAll({})
      setMovies(data)
    } catch (error) {
      console.error('Failed to load movies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this movie?')) return

    try {
      await moviesApi.delete(id)
      await loadMovies()
    } catch (error: any) {
      alert(error.message || 'Failed to delete movie')
    }
  }

  return (
    <>
      <h2 className="section-title">Movie management</h2>

      <p className="alert alert-info alert-banner">
        Use the API to create, update, and delete movies. Full CRUD interface coming soon.
      </p>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Genre</th>
                <th>Rating</th>
                <th>Language</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {movies.map((movie) => (
                <tr key={movie.id}>
                  <td>{movie.title}</td>
                  <td>{movie.genre.join(', ')}</td>
                  <td>{movie.rating}/10</td>
                  <td>{movie.language}</td>
                  <td className="table-actions">
                    <button
                      onClick={() => handleDelete(movie.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// Theater Management Component
function TheaterManagement() {
  const [theaters, setTheaters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTheaters()
  }, [])

  const loadTheaters = async () => {
    try {
      const data = await theatersApi.getAll()
      setTheaters(data)
    } catch (error) {
      console.error('Failed to load theaters:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="section-title">Theater management</h2>

      <p className="alert alert-info alert-banner">
        Use the API to create, update, and delete theaters and screens.
      </p>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>City</th>
              </tr>
            </thead>
            <tbody>
              {theaters.map((theater) => (
                <tr key={theater.id}>
                  <td>{theater.name}</td>
                  <td>{theater.location}</td>
                  <td>{theater.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// User Management Component
function UserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await adminApi.getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      await adminApi.activateUser(id)
      await loadUsers()
    } catch (error: any) {
      alert(error.message || 'Failed to activate user')
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      await adminApi.deactivateUser(id)
      await loadUsers()
    } catch (error: any) {
      alert(error.message || 'Failed to deactivate user')
    }
  }

  return (
    <>
      <h2 className="section-title">User management</h2>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        user.is_active ? 'status-ready' : 'status-error'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-actions">
                    {user.is_active ? (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(user.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
