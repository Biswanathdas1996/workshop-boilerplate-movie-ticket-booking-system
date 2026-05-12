import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../App'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/movies')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // OAuth simulation
    setError('OAuth integration available - configure with your provider')
  }

  return (
    <main className="page auth-page">
      <section className="panel auth-panel">
        <header className="auth-panel__intro">
          <p className="eyebrow">Welcome back</p>
          <h1 className="auth-panel__title">Sign in</h1>
          <p className="auth-panel__lede">Continue to reservations, seating, and your digital ticket.</p>
        </header>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="Login form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              autoComplete="current-password"
            />
          </div>

          <div className="btn-stack">
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="btn btn-secondary btn-block"
              aria-label="Sign in with Google"
            >
              Continue with Google
            </button>
          </div>
        </form>

        <p className="form-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="link-accent">
            Register here
          </Link>
        </p>
      </section>
    </main>
  )
}
