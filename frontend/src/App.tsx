import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
                <h1>Welcome to MovieTicket</h1>
                <p>Your one-stop destination for booking movie tickets</p>
                <a href="/movies" className="btn btn-primary btn-large">
                  Browse Movies
                </a>
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
