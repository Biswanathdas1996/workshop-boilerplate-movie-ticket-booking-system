import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
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
          <span className="logo-mark" aria-hidden="true">▶</span>
          <span>MovieTickets</span>
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
      <section className="hero hero--home">
        <p className="eyebrow" aria-label="Category">
          Movie Booking Platform
        </p>
        <h1>Tickets in seconds, seats you actually want</h1>
        <p className="subtitle">
          Browse what&apos;s playing, lock your seats in real time, and walk in with a digital ticket—no queues, no guesswork.
        </p>
        <div className="hero-actions">
          <Link to="/movies" className="btn btn-primary" aria-label="Browse all movies">
            Browse movies
          </Link>
          <Link to="/register" className="btn btn-secondary" aria-label="Create an account">
            Create account
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Built for tonight&apos;s showing</h2>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <p className="label">Discover</p>
            <p>Search and filters tuned for what&apos;s trending and what fits your vibe.</p>
          </div>
          <div className="feature-card">
            <p className="label">Pick seats</p>
            <p>Interactive hall map—see what&apos;s free before you commit.</p>
          </div>
          <div className="feature-card">
            <p className="label">Pay securely</p>
            <p>Fast checkout simulation with clear confirmations every step.</p>
          </div>
          <div className="feature-card">
            <p className="label">Go paperless</p>
            <p>Digital confirmations with QR you can flash at the door.</p>
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
          <footer className="site-footer">
            <div className="site-footer__inner">
              <p className="site-footer__brand">
                <span className="logo-mark site-footer__mark" aria-hidden="true">
                  ▶
                </span>
                MovieTickets
              </p>
              <p className="site-footer__meta">
                Workshop demo — browse, book, and pay in a cohesive cinema checkout flow.
              </p>
            </div>
          </footer>
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
