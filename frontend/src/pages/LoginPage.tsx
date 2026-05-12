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
    <main className="page">
      <section className="panel" style={{ maxWidth: '500px', margin: '2rem auto' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Login</h1>

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

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn btn-secondary"
            style={{ width: '100%' }}
            aria-label="Sign in with Google"
          >
            🌐 Sign in with Google
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 600 }}>
            Register here
          </Link>
        </p>
      </section>
    </main>
  )
}
