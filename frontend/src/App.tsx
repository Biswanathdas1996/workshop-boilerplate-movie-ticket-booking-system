import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Movies } from './pages/Movies'
import { MovieDetail } from './pages/MovieDetail'
import { Booking } from './pages/Booking'
import { AdminDashboard } from './pages/AdminDashboard'
import { useAuthStore } from './store/authStore'
import './i18n/config'
import './styles.css'

function PrivateRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  const { user } = useAuthStore()

  useEffect(() => {
    // KAN-415: Dark Mode Theme Toggle - Apply theme on load
    const theme = user?.theme || 'light'
    document.documentElement.setAttribute('data-theme', theme)
  }, [user?.theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <Layout>
              <div className="home-page">
                <section className="home-hero">
                  <p className="hero-kicker">Cinema Night, Upgraded</p>
                  <h1>Book your next blockbuster in seconds</h1>
                  <p>
                    Discover trending releases, lock premium seats, and check out instantly with a smoother movie
                    ticket experience.
                  </p>
                  <div className="home-hero-actions">
                    <Link to="/movies" className="btn btn-primary btn-large">
                      Browse Movies
                    </Link>
                    <Link to="/register" className="btn btn-secondary btn-large">
                      Create Account
                    </Link>
                  </div>
                </section>

                <section className="home-feature-grid" aria-label="Platform highlights">
                  <article className="home-feature-card">
                    <h2>Real-Time Seat Map</h2>
                    <p>Pick exactly where you want to sit with live availability and category-based pricing.</p>
                  </article>
                  <article className="home-feature-card">
                    <h2>Smart Discovery</h2>
                    <p>Filter by genre and language, then jump straight into featured and trending picks.</p>
                  </article>
                  <article className="home-feature-card">
                    <h2>Fast Checkout</h2>
                    <p>Apply promo codes, review totals clearly, and complete bookings without friction.</p>
                  </article>
                </section>
              </div>
            </Layout>
          }
        />

        <Route
          path="/movies"
          element={
            <Layout>
              <Movies />
            </Layout>
          }
        />

        <Route
          path="/movies/:id"
          element={
            <Layout>
              <MovieDetail />
            </Layout>
          }
        />

        <Route
          path="/booking/:showId"
          element={
            <PrivateRoute>
              <Layout>
                <Booking />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute requireAdmin>
              <Layout>
                <AdminDashboard />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
