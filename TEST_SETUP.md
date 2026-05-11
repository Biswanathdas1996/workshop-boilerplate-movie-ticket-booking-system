# E2E Test Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher)
3. **MongoDB** (running instance or MongoDB Atlas connection)

## Installation Steps

### 1. Install Root Dependencies

From the project root directory:

```bash
npm install
```

This will install Playwright and related dependencies.

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

Or install all browsers:

```bash
npx playwright install
```

### 3. Set Up Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Set Up Frontend

```bash
cd frontend
npm install
```

### 5. Configure Environment

Create a `.env` file in the project root with:

```env
MONGODB_URI=mongodb://localhost:27017/movie_booking
FRONTEND_PORT=5173
BACKEND_PORT=8000
SECRET_KEY=your-secret-key-for-jwt
```

### 6. Seed Test Data (Optional)

For comprehensive E2E tests, you may want to seed the database with:
- Admin user (email: admin@example.com, password: AdminPass123!)
- Sample movies, theaters, and shows

This can be done through the admin API or a seed script.

## Running Tests

### Start Application Services

Before running tests, ensure both backend and frontend are running:

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Run Tests

From the project root:

**Run all tests:**
```bash
npm run test:e2e
```

**Run tests in UI mode (interactive):**
```bash
npm run test:e2e:ui
```

**Run tests in headed mode (see browser):**
```bash
npm run test:e2e:headed
```

**Run specific test file:**
```bash
npx playwright test e2e/auth.spec.ts
```

**Run tests with specific tag:**
```bash
npx playwright test --grep "KAN-415"
```

### View Test Reports

After test execution:

```bash
npm run test:e2e:report
```

This will open an HTML report with detailed results, screenshots, and videos of failures.

## Test Structure

```
e2e/
├── helpers/
│   ├── auth.helper.ts      # Authentication utilities
│   ├── api.helper.ts       # API helpers for data setup
│   └── test-data.ts        # Sample test data
├── auth.spec.ts            # Authentication tests
├── theme-language.spec.ts  # Theme & language tests
├── movies.spec.ts          # Movie browsing tests
├── booking.spec.ts         # Booking flow tests
└── README.md               # Detailed test documentation
```

## Test Coverage

### Implemented Tests

**Authentication (auth.spec.ts):**
- ✅ User registration
- ✅ User login
- ✅ Duplicate email validation
- ✅ Invalid credentials handling
- ✅ Admin access control

**Theme & Language (theme-language.spec.ts):**
- ✅ Dark mode toggle (KAN-415)
- ✅ Multi-language support (KAN-416)
- ✅ Responsive design

**Movies (movies.spec.ts):**
- ✅ Browse and filter movies
- ✅ View movie details
- ✅ Loading skeletons (KAN-417)

**Booking (booking.spec.ts):**
- ✅ Seat selection interface
- ✅ Booked seat validation
- ✅ Authentication requirement

## Troubleshooting

### Tests timeout or fail to start

**Issue:** Tests timeout waiting for application
**Solution:** Ensure both frontend (port 5173) and backend (port 8000) are running

### Database connection errors

**Issue:** MongoDB connection refused
**Solution:** Check MongoDB is running and MONGODB_URI is correct in .env

### Authentication tests fail

**Issue:** JWT token issues or localStorage problems
**Solution:** 
- Clear browser state: `npx playwright test --project=chromium --headed`
- Check SECRET_KEY in .env matches backend configuration

### Movie/booking tests skip

**Issue:** Tests skip due to missing data
**Solution:**
- Seed database with sample movies, theaters, and shows
- Use API helpers to create test data
- Check manual_test_cases/test_cases_20260511-174500.csv for expected data structure

### Port conflicts

**Issue:** Port 5173 or 8000 already in use
**Solution:** 
- Kill existing processes on those ports
- Or update FRONTEND_PORT/BACKEND_PORT in .env and playwright.config.ts

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          npm install
          npx playwright install --with-deps chromium
          cd backend && pip install -r requirements.txt
          cd ../frontend && npm install
      
      - name: Start backend
        run: |
          cd backend
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &
        env:
          MONGODB_URI: mongodb://localhost:27017/movie_booking_test
          SECRET_KEY: test-secret-key
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

1. **Test Isolation:** Each test creates its own user with unique email
2. **Conditional Skipping:** Tests skip gracefully if required data is missing
3. **Explicit Waits:** Use `waitForURL`, `waitForSelector` instead of arbitrary timeouts
4. **Realistic Selectors:** Use IDs, aria-labels, and semantic HTML where possible
5. **Screenshot on Failure:** Automatically captured for debugging
6. **Video on Failure:** Full video recording of failed tests

## Extending Tests

To add new tests:

1. Create a new spec file in `e2e/` directory
2. Import helpers from `e2e/helpers/`
3. Follow existing patterns for setup and assertions
4. Add test documentation to `e2e/README.md`
5. Update this setup guide if new dependencies are required

## Support

For issues or questions:
- Check `e2e/README.md` for detailed test documentation
- Review Playwright documentation: https://playwright.dev
- Check manual test cases in `manual_test_cases/` for expected behavior
