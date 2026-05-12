import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { authApi } from './api'

// Types
interface User {
  id: string
  email: string
  full_name: string
  role: 'user' | 'admin'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
}

// Context
const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

// Auth Provider
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authApi.getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('token', data.access_token)
    const userData = await authApi.getMe()
    setUser(userData)
  }

  const register = async (email: string, password: string, fullName: string) => {
    const userData = await authApi.register({
      email,
      password,
      full_name: fullName,
    })
    // Auto-login after registration
    await login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Protected Route
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="Loading"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Navbar Component
function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-content">
        <Link to="/" className="logo" aria-label="Home">
          🎬 MovieTickets
        </Link>

        <ul className="nav-links">
          <li><Link to="/movies">Movies</Link></li>
          {user ? (
            <>
              <li><Link to="/bookings">My Bookings</Link></li>
              {user.role === 'admin' && (
                <li><Link to="/admin">Admin</Link></li>
              )}
              <li>
                <button onClick={logout} className="btn btn-secondary" aria-label="Sign out">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login" className="btn btn-primary">Login</Link></li>
              <li><Link to="/register" className="btn btn-secondary">Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}

// Home Page
function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow" aria-label="Category">Movie Booking Platform</p>
        <h1>Book Your Movie Tickets Online</h1>
        <p className="subtitle">
          Browse movies, select seats, and enjoy seamless booking with digital tickets and QR codes
        </p>
        <div style={{ marginTop: '1.5rem' }}>
          <Link to="/movies" className="btn btn-primary" aria-label="Browse all movies">
            Browse Movies
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Features</h2>
        <div className="movie-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="health-card">
            <p className="label">🎬 Browse Movies</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Search and filter latest releases</p>
          </div>
          <div className="health-card">
            <p className="label">🪑 Select Seats</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Interactive seat selection</p>
          </div>
          <div className="health-card">
            <p className="label">💳 Easy Payment</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Secure payment simulation</p>
          </div>
          <div className="health-card">
            <p className="label">📱 Digital Tickets</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>QR code tickets</p>
          </div>
        </div>
      </section>
    </main>
  )
}

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/movies/:id" element={<MovieDetailPage />} />
            <Route
              path="/booking/:showId"
              element={
                <ProtectedRoute>
                  <SeatSelectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/:bookingId"
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <BookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute>
                  <BookingDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Import pages (will create these next)
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MoviesPage from './pages/MoviesPage'
import MovieDetailPage from './pages/MovieDetailPage'
import SeatSelectionPage from './pages/SeatSelectionPage'
import PaymentPage from './pages/PaymentPage'
import BookingsPage from './pages/BookingsPage'
import BookingDetailPage from './pages/BookingDetailPage'
import AdminDashboard from './pages/AdminDashboard'

export default App
