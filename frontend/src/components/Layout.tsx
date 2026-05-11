import { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Moon, Sun, Bell, Globe, LogOut, User, Film, Calendar } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { motion } from 'framer-motion'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, logout, updateUser } = useAuthStore()
  const navigate = useNavigate()

  const toggleTheme = async () => {
    const newTheme = user?.theme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', newTheme)

    if (isAuthenticated && user) {
      try {
        await api.put('/auth/me', { theme: newTheme })
        updateUser({ theme: newTheme })
      } catch (error) {
        console.error('Failed to update theme', error)
      }
    }
  }

  const changeLanguage = async (lang: string) => {
    i18n.changeLanguage(lang)

    if (isAuthenticated && user) {
      try {
        await api.put('/auth/me', { language: lang })
        updateUser({ language: lang })
      } catch (error) {
        console.error('Failed to update language', error)
      }
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <Film size={28} />
            <span>MovieTicket</span>
          </Link>

          <div className="navbar-links">
            <Link to="/movies">{t('nav.movies')}</Link>
            {isAuthenticated && (
              <>
                <Link to="/bookings">{t('nav.bookings')}</Link>
                {user?.role === 'admin' && <Link to="/admin">{t('nav.admin')}</Link>}
              </>
            )}
          </div>

          <div className="navbar-actions">
            <button onClick={toggleTheme} className="icon-button" aria-label="Toggle theme">
              {user?.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="dropdown">
              <button className="icon-button" aria-label="Change language">
                <Globe size={20} />
              </button>
              <div className="dropdown-menu">
                <button onClick={() => changeLanguage('en')}>English</button>
                <button onClick={() => changeLanguage('es')}>Español</button>
                <button onClick={() => changeLanguage('fr')}>Français</button>
              </div>
            </div>

            {isAuthenticated ? (
              <>
                <Link to="/notifications" className="icon-button" aria-label="Notifications">
                  <Bell size={20} />
                </Link>
                <div className="dropdown">
                  <button className="icon-button" aria-label="User menu">
                    <User size={20} />
                  </button>
                  <div className="dropdown-menu">
                    <Link to="/profile">{t('nav.profile')}</Link>
                    <button onClick={handleLogout}>
                      <LogOut size={16} />
                      {t('nav.logout')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary">
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </nav>

      <motion.main
        className="main-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>

      <footer className="footer">
        <p>&copy; 2026 MovieTicket. All rights reserved.</p>
      </footer>
    </div>
  )
}
