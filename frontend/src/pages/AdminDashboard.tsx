import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, Users, Ticket, TrendingUp, Download } from 'lucide-react'
import api from '../lib/api'
import { motion } from 'framer-motion'

interface DashboardStats {
  total_revenue: number
  total_bookings: number
  total_users: number
  occupancy_rate: number
  top_movies: Array<{ _id: string; bookings: number; revenue: number }>
  recent_bookings: Array<any>
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/dashboard')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load dashboard stats', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    try {
      const response = await api.get('/admin/reports/bookings', {
        params: { format: 'csv' },
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'booking_report.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Failed to export report', error)
    }
  }

  if (loading || !stats) {
    return <div className="loading-container">Loading...</div>
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button className="btn btn-secondary" onClick={exportReport}>
          <Download size={20} />
          Export Report
        </button>
      </div>

      <div className="stats-grid">
        <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stat-icon revenue">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <p className="stat-value">${stats.total_revenue.toFixed(2)}</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-icon bookings">
            <Ticket size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Bookings</h3>
            <p className="stat-value">{stats.total_bookings}</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-icon users">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-value">{stats.total_users}</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-icon occupancy">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Occupancy Rate</h3>
            <p className="stat-value">{stats.occupancy_rate.toFixed(1)}%</p>
          </div>
        </motion.div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Top Performing Movies</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Movie</th>
                  <th>Bookings</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_movies.map((movie) => (
                  <tr key={movie._id}>
                    <td>{movie._id}</td>
                    <td>{movie.bookings}</td>
                    <td>${movie.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Recent Bookings</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Movie</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_bookings.slice(0, 10).map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.id}</td>
                    <td>{booking.movie_title}</td>
                    <td>{booking.show_date}</td>
                    <td>${booking.final_amount.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="admin-quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <Link to="/admin/movies" className="action-card">
            Manage Movies
          </Link>
          <Link to="/admin/theaters" className="action-card">
            Manage Theaters
          </Link>
          <Link to="/admin/shows" className="action-card">
            Schedule Shows
          </Link>
          <Link to="/admin/users" className="action-card">
            User Management
          </Link>
          <Link to="/admin/promo-codes" className="action-card">
            Promo Codes
          </Link>
          <Link to="/admin/audit-logs" className="action-card">
            Audit Logs
          </Link>
        </div>
      </div>
    </div>
  )
}
