# Movie Ticket Booking System - E2E Automation Tests

Comprehensive end-to-end automation tests for the Movie Ticket Booking System using Playwright.

## Test Coverage

This test suite covers all major features introduced in PR #2:

### 1. Authentication Tests (`auth.spec.ts`)
- **TC-001**: User Registration with valid credentials
- **TC-002**: User Login with JWT authentication
- **TC-024**: OAuth Google sign-in simulation
- **TC-026**: Invalid credentials error handling
- **TC-027**: Duplicate email registration prevention
- Session management and logout functionality

### 2. Movies Tests (`movies.spec.ts`)
- **TC-003**: Browse movies with search and filters
- **TC-004**: View movie details with trailer
- **TC-020**: Partial text search functionality
- **TC-025**: Genre and language filtering
- **TC-018**: Empty state for no search results
- Movie detail page with show times

### 3. Booking Flow Tests (`booking-flow.spec.ts`)
- **TC-011**: Complete E2E booking flow from selection to digital ticket
- **TC-005**: Interactive seat selection with visual feedback
- **TC-006**: Payment simulation (95% success rate)
- **TC-007**: Digital ticket generation with QR code
- **TC-008**: User booking history with status filters
- **TC-016**: Past show cancellation prevention
- **TC-028**: Fully booked show handling
- **TC-017**: Payment failure and retry

### 4. Admin Dashboard Tests (`admin.spec.ts`)
- **TC-009**: Dashboard statistics overview
- **TC-010**: Movie CRUD operations (soft delete)
- **TC-023**: User management with activation/deactivation
- **TC-030**: Non-admin access prevention
- Popular movies analytics
- Tab navigation

### 5. Accessibility & Security Tests (`accessibility-security.spec.ts`)
- **TC-021**: Keyboard navigation (WCAG 2.1 compliance)
- **TC-022**: Responsive mobile layout
- **TC-032**: Rate limiting on authentication
- **TC-033**: SQL injection prevention
- **TC-034**: XSS attack prevention
- **TC-019**: JWT token expiration handling
- **TC-029**: Payment form validation
- **TC-014**: Email notification simulation
- ARIA labels and focus indicators

## Project Structure

```
tests/
├── e2e/                          # Test specification files
│   ├── auth.spec.ts             # Authentication tests
│   ├── movies.spec.ts           # Movie browsing and search tests
│   ├── booking-flow.spec.ts     # End-to-end booking flow tests
│   ├── admin.spec.ts            # Admin dashboard tests
│   └── accessibility-security.spec.ts  # A11y and security tests
├── helpers/                      # Page object helpers
│   ├── auth.helper.ts           # Authentication helper methods
│   ├── movies.helper.ts         # Movies page helper methods
│   ├── booking.helper.ts        # Booking flow helper methods
│   └── admin.helper.ts          # Admin dashboard helper methods
├── fixtures/                     # Test fixtures and data
│   ├── test.fixtures.ts         # Playwright test fixtures
│   └── test-data.ts             # Test data constants
├── playwright.config.ts          # Playwright configuration
├── package.json                  # Test dependencies
└── README.md                     # This file
```

## Setup

### Prerequisites
- Node.js 18+ installed
- Movie Booking System application running locally
- MongoDB database configured and running

### Installation

1. Navigate to the tests directory:
```bash
cd tests
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

### Configuration

Ensure your application is running with the following:
- **Frontend**: http://localhost:5173 (default)
- **Backend**: http://localhost:8000 (default)
- **MongoDB**: Connected and seeded with test data

Set the environment variable if using a different URL:
```bash
export FRONTEND_URL=http://localhost:3000
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run specific test suite
```bash
npm run test:auth        # Authentication tests only
npm run test:movies      # Movies tests only
npm run test:booking     # Booking flow tests only
npm run test:admin       # Admin dashboard tests only
npm run test:a11y        # Accessibility & security tests only
```

### Run tests in specific browser
```bash
npm run test:chrome      # Chromium only
npm run test:firefox     # Firefox only
npm run test:webkit      # WebKit (Safari) only
```

### Debug mode
```bash
npm run test:debug
```

### View test report
```bash
npm run test:report
```

## Test Helpers

### AuthHelper
- `register(credentials)` - Register a new user
- `login(credentials)` - Login with existing credentials
- `logout()` - Logout current user
- `isLoggedIn()` - Check if user is logged in
- `getStoredToken()` - Get JWT token from localStorage

### MoviesHelper
- `navigateToMovies()` - Navigate to movies page
- `searchMovies(query)` - Search for movies
- `filterByGenre(genre)` - Filter by genre
- `filterByLanguage(language)` - Filter by language
- `clickMovieByTitle(title)` - Click specific movie
- `verifyMovieDetailsVisible()` - Verify movie details loaded

### BookingHelper
- `selectShow(index)` - Select a show time
- `selectSeats(count)` - Select specified number of seats
- `verifySelectedSeatsCount(count)` - Verify seat selection
- `proceedToPayment()` - Navigate to payment page
- `completePayment(details)` - Complete payment simulation
- `verifyQRCodeVisible()` - Verify QR code generation
- `navigateToMyBookings()` - Go to booking history
- `filterBookingsByStatus(status)` - Filter bookings

### AdminHelper
- `navigateToAdminDashboard()` - Navigate to admin dashboard
- `switchToTab(tabName)` - Switch between admin tabs
- `verifyDashboardStats()` - Verify statistics cards
- `getTotalUsers()` - Get total users count
- `getTotalRevenue()` - Get total revenue
- `activateUser(email)` - Activate user account
- `deactivateUser(email)` - Deactivate user account
- `deleteMovie(title)` - Soft delete movie

## Test Data

Test data is defined in `fixtures/test-data.ts`:

- **TEST_USERS**: Pre-configured test user credentials
- **TEST_PAYMENT**: Default payment details for simulations
- **MOVIE_FILTERS**: Available genres and languages
- **BOOKING_CONFIG**: Default booking configuration

## CI/CD Integration

The tests are configured for CI/CD with:
- Automatic retry on failure (2 retries in CI)
- HTML report generation
- Screenshot capture on failure
- Trace recording on first retry

Example GitHub Actions workflow:
```yaml
- name: Run E2E Tests
  run: |
    cd tests
    npm install
    npx playwright install --with-deps
    npm test
```

## Best Practices

1. **Use Helpers**: Always use the helper classes instead of direct page interactions
2. **Dynamic Test Data**: Use timestamps in email addresses to avoid conflicts
3. **Wait Strategies**: Tests use explicit waits for better reliability
4. **Isolation**: Each test is independent and creates its own test data
5. **Cleanup**: Tests don't require manual cleanup as they use unique data

## Troubleshooting

### Tests are flaky
- Increase timeouts in `playwright.config.ts`
- Check application is fully loaded before running tests
- Verify database has adequate test data

### Authentication fails
- Ensure backend JWT authentication is working
- Check MongoDB connection
- Verify email uniqueness (tests use timestamps)

### Booking tests fail
- Ensure shows are seeded in database with available seats
- Check backend seat locking mechanism
- Verify payment simulation is enabled

### Admin tests fail
- Create an admin user in database with role='admin'
- Verify admin routes are protected correctly
- Check admin dashboard is accessible at /admin

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Use appropriate helper methods
3. Add test case ID reference in comments (e.g., TC-001)
4. Update this README with new test coverage
5. Ensure tests are independent and reusable

## Coverage Summary

- **Total Test Cases**: 35+ test scenarios
- **Happy Path**: 11 test cases
- **Edge Cases**: 8 test cases
- **Negative Cases**: 10 test cases
- **E2E Flows**: 3 complete flows
- **Accessibility**: 6 test cases
- **Security**: 5 test cases
