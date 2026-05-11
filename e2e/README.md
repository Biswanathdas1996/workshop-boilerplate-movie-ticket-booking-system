# E2E Test Suite - Movie Ticket Booking System

This directory contains Playwright-based end-to-end tests for the movie ticket booking system.

## Structure

```
e2e/
├── helpers/
│   ├── auth.helper.ts      # Authentication utilities (login, register, logout)
│   ├── api.helper.ts       # API helpers for test data setup
│   └── test-data.ts        # Sample test data (movies, theaters, shows)
├── auth.spec.ts            # Authentication tests (KAN-378, KAN-379)
├── theme-language.spec.ts  # Theme toggle and i18n tests (KAN-415, KAN-416)
├── movies.spec.ts          # Movie browsing, search, and loading tests (KAN-417)
├── booking.spec.ts         # Booking flow tests
└── README.md               # This file
```

## Setup

### Prerequisites

1. Install dependencies:
   ```bash
   npm install --save-dev @playwright/test@latest
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

3. Ensure backend and frontend are running:
   ```bash
   # From project root
   start.bat
   ```

4. Configure environment:
   - Frontend should be running on `http://localhost:5173`
   - Backend should be running on `http://localhost:8000`
   - MongoDB should be connected

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run tests in UI mode
```bash
npx playwright test --ui
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### View test report
```bash
npx playwright show-report
```

## Test Coverage

### Authentication (auth.spec.ts)
- ✅ TC-001: User registration with valid credentials
- ✅ TC-002: User login with valid credentials
- ✅ TC-015: Registration fails with duplicate email
- ✅ TC-033: Login fails with invalid credentials
- ✅ TC-035: Regular user cannot access admin dashboard

### Theme & Language (theme-language.spec.ts)
- ✅ TC-024: Dark mode toggle persists across sessions (KAN-415)
- ✅ TC-025: Multi-language support changes UI text (KAN-416)
- ✅ TC-028: Responsive design on mobile viewport

### Movies (movies.spec.ts)
- ✅ TC-003: Browse and filter movies
- ✅ TC-004: View movie details
- ✅ TC-026: Loading skeletons display during data fetch (KAN-417)

### Booking (booking.spec.ts)
- ✅ TC-005: View booking page and seat selection interface
- ✅ TC-018: Booked seats are disabled and cannot be selected
- ✅ TC-035: Unauthenticated user redirected to login

## Test Data Management

Tests use dynamically generated test users to avoid conflicts:
- Each test creates unique users with timestamps
- Users are created via registration flow
- No database cleanup required between runs (isolated test data)

## Helpers

### auth.helper.ts
- `registerUser()` - Register new user via UI
- `loginUser()` - Login user via UI
- `loginUserAPI()` - Login via API (faster for setup)
- `logoutUser()` - Logout current user
- `generateTestUser()` - Generate unique test user data

### api.helper.ts
- `createMovie()` - Create movie via API (admin)
- `createTheater()` - Create theater via API (admin)
- `createScreen()` - Create screen via API (admin)
- `createShow()` - Create show via API (admin)
- `generateSeatLayout()` - Generate seat layout data

### test-data.ts
- Sample movies, theaters, and shows
- Helper functions for creating test data

## Notes

- Tests run sequentially to avoid booking conflicts
- Each test creates its own user to ensure isolation
- Tests skip gracefully if required data (movies/shows) doesn't exist
- Loading skeleton tests have short timeouts as they're timing-sensitive
- Admin tests require admin user seeded in database

## CI/CD Integration

Add to package.json:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

## Troubleshooting

### Tests fail with timeout
- Ensure backend and frontend are running
- Check MongoDB connection
- Increase timeout in playwright.config.ts

### Authentication tests fail
- Clear browser storage: `npx playwright test --headed` and manually clear
- Check JWT token expiry settings
- Verify auth API endpoints are working

### Movie/booking tests skip
- Seed database with movies, theaters, and shows
- Create admin user and use API helpers to set up test data

## Future Enhancements

- [ ] Add admin dashboard tests (requires admin user seed)
- [ ] Add complete booking flow E2E test (requires payment mock)
- [ ] Add promo code tests
- [ ] Add notification tests
- [ ] Add accessibility (a11y) tests
- [ ] Add visual regression tests
