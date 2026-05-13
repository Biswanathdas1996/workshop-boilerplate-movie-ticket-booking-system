import { useEffect, useState } from 'react'

// ===== TYPES =====

type User = {
  id: string
  mobile_number: string
  token: string
}

type Movie = {
  id: string
  title: string
  genre: string
  language: string
  rating: number
  release_date: string
  duration: number
  description: string
  poster_url: string
}

type FoodItem = {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url?: string
}

type CartItem = {
  food_item: FoodItem
  quantity: number
}

type Theatre = {
  id: string
  name: string
  city: string
  address: string
  has_360_view: boolean
}

type Seat = {
  id: string
  row: string
  number: number
  type: string
  base_price: number
  current_price: number
  status: string
}

type View = 'login' | 'register' | 'movies' | 'food' | 'booking' | 'theatres' | 'theatre360'

// ===== MAIN APP =====

function App() {
  const [view, setView] = useState<View>('login')
  const [user, setUser] = useState<User | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const userData = localStorage.getItem('userData')

    if (token && userData) {
      setUser(JSON.parse(userData))
      setView('movies')
    }
    setIsInitialized(true)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    setUser(null)
    setView('login')
  }

  if (!isInitialized) {
    return <div className="page loading">Loading...</div>
  }

  return (
    <main className="page">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Oktawave Cinema</h1>
          {user && (
            <div className="header-actions">
              <span className="user-info">{user.mobile_number}</span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      {user && (
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${view === 'movies' ? 'active' : ''}`}
            onClick={() => setView('movies')}
          >
            Movies
          </button>
          <button
            className={`nav-tab ${view === 'food' ? 'active' : ''}`}
            onClick={() => setView('food')}
          >
            Food Menu
          </button>
          <button
            className={`nav-tab ${view === 'theatres' ? 'active' : ''}`}
            onClick={() => setView('theatres')}
          >
            Theatres
          </button>
        </nav>
      )}

      {/* Content */}
      {view === 'login' && <LoginView onSuccess={setUser} onRegister={() => setView('register')} />}
      {view === 'register' && <RegisterView onBack={() => setView('login')} />}
      {view === 'movies' && user && <MoviesView user={user} onBooking={() => setView('booking')} />}
      {view === 'food' && user && <FoodMenuView user={user} />}
      {view === 'theatres' && user && <TheatresView onView360={(id) => setView('theatre360')} />}
      {view === 'theatre360' && user && <Theatre360View onBack={() => setView('theatres')} />}
    </main>
  )
}

// ===== LOGIN VIEW (KAN-481) =====

function LoginView({ onSuccess, onRegister }: { onSuccess: (user: User) => void; onRegister: () => void }) {
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState<'mobile' | 'otp'>('mobile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoOtp, setDemoOtp] = useState('')

  const handleSendOTP = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: mobile }),
      })

      const data = await response.json()

      if (response.ok) {
        setStage('otp')
        setDemoOtp(data.otp_demo || '') // For demo purposes
      } else {
        setError(data.detail || 'Failed to send OTP')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: mobile, otp }),
      })

      const data = await response.json()

      if (response.ok) {
        const userData = { ...data.user, token: data.token }
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('userData', JSON.stringify(userData))
        onSuccess(userData)
      } else {
        setError(data.detail || 'Invalid OTP')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-panel panel">
      <div className="auth-content">
        <h2>Welcome to Oktawave Cinema</h2>
        <p className="subtitle">Login with your mobile number</p>

        {stage === 'mobile' ? (
          <>
            <div className="form-group">
              <label>Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter your mobile number"
                className="input"
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button onClick={handleSendOTP} disabled={loading || !mobile} className="btn btn-primary btn-block">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>

            <p className="text-center mt-2">
              New user?{' '}
              <button onClick={onRegister} className="link-button">
                Register here
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                maxLength={6}
                className="input"
              />
              {demoOtp && <p className="demo-hint">Demo OTP: {demoOtp}</p>}
            </div>

            {error && <p className="error-message">{error}</p>}

            <button onClick={handleVerifyOTP} disabled={loading || !otp} className="btn btn-primary btn-block">
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button onClick={() => setStage('mobile')} className="btn btn-secondary btn-block mt-2">
              Change Number
            </button>
          </>
        )}
      </div>
    </section>
  )
}

// ===== REGISTER VIEW (KAN-481) =====

function RegisterView({ onBack }: { onBack: () => void }) {
  return (
    <section className="auth-panel panel">
      <div className="auth-content">
        <h2>Register</h2>
        <p className="subtitle">Registration uses the same flow as login. You'll receive an OTP to verify your mobile number.</p>
        <button onClick={onBack} className="btn btn-primary btn-block">
          Back to Login
        </button>
      </div>
    </section>
  )
}

// ===== MOVIES VIEW (KAN-444) =====

function MoviesView({ user }: { user: User; onBooking: () => void }) {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTitle, setSearchTitle] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterLanguage, setFilterLanguage] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [needsSeeding, setNeedsSeeding] = useState(false)

  useEffect(() => {
    loadGenres()
    loadLanguages()
    loadMovies()
  }, [])

  const loadGenres = async () => {
    try {
      const response = await fetch('/api/movies/genres')
      const data = await response.json()
      setGenres(data.genres || [])
    } catch (error) {
      console.error('Failed to load genres:', error)
    }
  }

  const loadLanguages = async () => {
    try {
      const response = await fetch('/api/movies/languages')
      const data = await response.json()
      setLanguages(data.languages || [])
    } catch (error) {
      console.error('Failed to load languages:', error)
    }
  }

  const loadMovies = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTitle) params.append('title', searchTitle)
      if (filterGenre) params.append('genre', filterGenre)
      if (filterLanguage) params.append('language', filterLanguage)
      if (filterRating) params.append('min_rating', filterRating)

      const response = await fetch(`/api/movies?${params}`)
      const data = await response.json()

      if (data.movies && data.movies.length === 0 && !searchTitle && !filterGenre) {
        setNeedsSeeding(true)
      }

      setMovies(data.movies || [])
    } catch (error) {
      console.error('Failed to load movies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedData = async () => {
    try {
      const response = await fetch('/api/seed-data', { method: 'POST' })
      if (response.ok) {
        setNeedsSeeding(false)
        loadMovies()
        loadGenres()
        loadLanguages()
      }
    } catch (error) {
      console.error('Failed to seed data:', error)
    }
  }

  const handleSearch = () => {
    loadMovies()
  }

  const handleReset = () => {
    setSearchTitle('')
    setFilterGenre('')
    setFilterLanguage('')
    setFilterRating('')
    setTimeout(loadMovies, 100)
  }

  if (needsSeeding) {
    return (
      <section className="panel">
        <div className="empty-state">
          <h2>No Data Available</h2>
          <p>Click below to seed demo data for testing all features.</p>
          <button onClick={handleSeedData} className="btn btn-primary">
            Seed Demo Data
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Search & Filter Panel */}
      <section className="panel">
        <h2>Search & Filter Movies</h2>

        <div className="filter-grid">
          <div className="form-group">
            <label>Search by Title</label>
            <input
              type="text"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder="Enter movie title"
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Genre</label>
            <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className="input">
              <option value="">All Genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Language</label>
            <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} className="input">
              <option value="">All Languages</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Min Rating</label>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className="input">
              <option value="">Any Rating</option>
              <option value="7">7+</option>
              <option value="8">8+</option>
              <option value="9">9+</option>
            </select>
          </div>
        </div>

        <div className="button-row">
          <button onClick={handleSearch} className="btn btn-primary">
            Search
          </button>
          <button onClick={handleReset} className="btn btn-secondary">
            Reset
          </button>
        </div>
      </section>

      {/* Movies Grid */}
      <section className="panel">
        <h2>Movies ({movies.length})</h2>

        {loading ? (
          <p>Loading movies...</p>
        ) : movies.length === 0 ? (
          <p className="empty-message">No movies found. Try different filters.</p>
        ) : (
          <div className="movies-grid">
            {movies.map((movie) => (
              <article key={movie.id} className="movie-card">
                <img src={movie.poster_url} alt={movie.title} className="movie-poster" />
                <div className="movie-info">
                  <h3>{movie.title}</h3>
                  <div className="movie-meta">
                    <span className="badge">{movie.genre}</span>
                    <span className="badge">{movie.language}</span>
                    <span className="rating">⭐ {movie.rating}</span>
                  </div>
                  <p className="movie-description">{movie.description}</p>
                  <button className="btn btn-primary btn-sm btn-block">Book Now</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

// ===== FOOD MENU VIEW (KAN-482) =====

function FoodMenuView({ user }: { user: User }) {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [showCart, setShowCart] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  useEffect(() => {
    loadCategories()
    loadFoodItems()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/food/categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadFoodItems = async () => {
    setLoading(true)
    try {
      const params = filterCategory ? `?category=${filterCategory}` : ''
      const response = await fetch(`/api/food/menu${params}`)
      const data = await response.json()
      setFoodItems(data.items || [])
    } catch (error) {
      console.error('Failed to load food items:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (item: FoodItem) => {
    const existing = cart.find((c) => c.food_item.id === item.id)
    if (existing) {
      setCart(cart.map((c) => (c.food_item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)))
    } else {
      setCart([...cart, { food_item: item, quantity: 1 }])
    }
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(
      cart
        .map((c) => (c.food_item.id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    )
  }

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.food_item.price * item.quantity, 0).toFixed(2)
  }

  const handleCheckout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/food/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map((c) => ({ food_item_id: c.food_item.id, quantity: c.quantity })),
        }),
      })

      if (response.ok) {
        setOrderSuccess(true)
        setCart([])
        setTimeout(() => setOrderSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Failed to create order:', error)
    }
  }

  useEffect(() => {
    loadFoodItems()
  }, [filterCategory])

  return (
    <>
      {/* Filter Panel */}
      <section className="panel">
        <div className="panel-head">
          <h2>Food Menu</h2>
          <button onClick={() => setShowCart(!showCart)} className="btn btn-primary btn-sm">
            Cart ({cart.length}) - ${getTotalPrice()}
          </button>
        </div>

        <div className="form-group">
          <label>Category</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input">
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Cart Panel */}
      {showCart && (
        <section className="panel cart-panel">
          <h2>Your Cart</h2>

          {cart.length === 0 ? (
            <p className="empty-message">Your cart is empty</p>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <div key={item.food_item.id} className="cart-item">
                    <div className="cart-item-info">
                      <h4>{item.food_item.name}</h4>
                      <p>${item.food_item.price.toFixed(2)}</p>
                    </div>
                    <div className="quantity-controls">
                      <button onClick={() => updateQuantity(item.food_item.id, -1)} className="btn-icon">
                        −
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.food_item.id, 1)} className="btn-icon">
                        +
                      </button>
                    </div>
                    <p className="cart-item-total">${(item.food_item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <h3>Total: ${getTotalPrice()}</h3>
                <button onClick={handleCheckout} className="btn btn-primary btn-block">
                  Checkout
                </button>
              </div>
            </>
          )}

          {orderSuccess && <div className="success-message">Order placed successfully!</div>}
        </section>
      )}

      {/* Food Items Grid */}
      <section className="panel">
        {loading ? (
          <p>Loading menu...</p>
        ) : (
          <div className="food-grid">
            {foodItems.map((item) => (
              <article key={item.id} className="food-card">
                <img src={item.image_url} alt={item.name} className="food-image" />
                <div className="food-info">
                  <h3>{item.name}</h3>
                  <p className="food-description">{item.description}</p>
                  <div className="food-footer">
                    <span className="price">${item.price.toFixed(2)}</span>
                    <button onClick={() => addToCart(item)} className="btn btn-primary btn-sm">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

// ===== THEATRES VIEW (KAN-484) =====

function TheatresView({ onView360 }: { onView360: (id: string) => void }) {
  const [theatres, setTheatres] = useState<Theatre[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTheatre, setSelectedTheatre] = useState<string | null>(null)

  useEffect(() => {
    loadTheatres()
  }, [])

  const loadTheatres = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/theatres')
      const data = await response.json()
      setTheatres(data.theatres || [])
    } catch (error) {
      console.error('Failed to load theatres:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleView360 = (theatreId: string) => {
    setSelectedTheatre(theatreId)
    onView360(theatreId)
  }

  return (
    <section className="panel">
      <h2>Our Theatres</h2>

      {loading ? (
        <p>Loading theatres...</p>
      ) : theatres.length === 0 ? (
        <p className="empty-message">No theatres available. Please seed demo data.</p>
      ) : (
        <div className="theatres-grid">
          {theatres.map((theatre) => (
            <article key={theatre.id} className="theatre-card">
              <h3>{theatre.name}</h3>
              <p className="theatre-city">{theatre.city}</p>
              <p className="theatre-address">{theatre.address}</p>

              {theatre.has_360_view && (
                <button onClick={() => handleView360(theatre.id)} className="btn btn-primary btn-sm btn-block">
                  View 360° Tour
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

// ===== THEATRE 360 VIEW (KAN-484) =====

function Theatre360View({ onBack }: { onBack: () => void }) {
  const [viewData, setViewData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [theatreId] = useState('theatre_1') // Default to first theatre for demo

  useEffect(() => {
    load360View()
  }, [])

  const load360View = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/theatres/${theatreId}/360-view`)
      const data = await response.json()
      setViewData(data)
    } catch (error) {
      console.error('Failed to load 360 view:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel">
      <button onClick={onBack} className="btn btn-secondary btn-sm mb-2">
        ← Back to Theatres
      </button>

      {loading ? (
        <p>Loading 360° view...</p>
      ) : viewData ? (
        <div className="theatre-360">
          <h2>{viewData.theatre_name} - 360° View</h2>
          <div className="viewer-360">
            <img src={viewData.image_360_url} alt="360 Theatre View" className="image-360" />
            <p className="viewer-hint">Click and drag to explore the theatre (demo image shown)</p>
          </div>

          {viewData.metadata && (
            <div className="view-metadata">
              <h3>Details</h3>
              <p>Resolution: {viewData.metadata.resolution}</p>
              {viewData.metadata.capture_date && <p>Captured: {viewData.metadata.capture_date}</p>}
            </div>
          )}
        </div>
      ) : (
        <p className="error-message">Failed to load 360° view</p>
      )}
    </section>
  )
}

export default App
