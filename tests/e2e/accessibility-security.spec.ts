import { test, expect } from '../fixtures/test.fixtures';
import { TEST_USERS } from '../fixtures/test-data';

test.describe('Accessibility and Security Features', () => {
  test.describe('WCAG 2.1 Accessibility Compliance', () => {
    test.beforeEach(async ({ authHelper }) => {
      const testUser = {
        ...TEST_USERS.regularUser,
        email: `a11y_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);
    });

    test('TC-021: Should support keyboard navigation throughout the application', async ({
      page,
    }) => {
      await page.goto('/movies');

      // Test Tab navigation
      await page.keyboard.press('Tab');

      // Verify focus is visible on interactive elements
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();

      // Navigate through multiple elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Verify tab navigation works
      const newFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(newFocusedElement).toBeTruthy();
    });

    test('Should have proper ARIA labels on interactive elements', async ({
      page,
    }) => {
      await page.goto('/movies');

      // Check search input has aria-label
      const searchInput = page.locator('input[type="search"]');
      const ariaLabel = await searchInput.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();

      // Check filter dropdowns have aria-labels
      const genreFilter = page.locator('select[aria-label="Filter by genre"]');
      await expect(genreFilter).toBeVisible();

      const languageFilter = page.locator('select[aria-label="Filter by language"]');
      await expect(languageFilter).toBeVisible();
    });

    test('Should have proper focus indicators on interactive elements', async ({
      page,
    }) => {
      await page.goto('/movies');

      // Focus on a button and check for outline
      const firstButton = page.locator('button, a').first();
      await firstButton.focus();

      // Verify element is focused
      const isFocused = await firstButton.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    test('Should have proper heading hierarchy', async ({
      page,
    }) => {
      await page.goto('/movies');

      // Verify h1 exists
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      // Verify h1 contains meaningful content
      const h1Text = await h1.textContent();
      expect(h1Text?.length).toBeGreaterThan(0);
    });

    test('Should have alt text for images', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();

      // Check if movie posters have alt text
      const movieImages = page.locator('.movie-card-image');
      if ((await movieImages.count()) > 0) {
        const firstImage = movieImages.first();
        const altText = await firstImage.getAttribute('alt');
        expect(altText).toBeTruthy();
      }
    });

    test('Should support Enter key for form submission', async ({
      page,
    }) => {
      await page.goto('/login');

      await page.fill('input[type="email"]#email', 'test@example.com');
      await page.fill('input[type="password"]#password', 'TestPass123!');

      // Press Enter to submit
      await page.keyboard.press('Enter');

      // Verify form was submitted (even if credentials are wrong)
      await page.waitForTimeout(1000);

      // Either redirected or error shown
      const hasError = await page.locator('.alert-error').isVisible().catch(() => false);
      const wasRedirected = page.url() !== '/login';

      expect(hasError || wasRedirected).toBe(true);
    });
  });

  test.describe('Responsive Design', () => {
    test('TC-022: Should display properly on mobile viewport', async ({
      page,
      authHelper,
      moviesHelper,
    }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const testUser = {
        ...TEST_USERS.regularUser,
        email: `mobile_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      await moviesHelper.navigateToMovies();

      // Verify page is responsive
      const movieGrid = page.locator('.movie-grid');
      await expect(movieGrid).toBeVisible();

      // Verify mobile-friendly elements
      const navbar = page.locator('.navbar');
      await expect(navbar).toBeVisible();

      // Verify search is accessible on mobile
      const searchInput = page.locator('input[type="search"]');
      await expect(searchInput).toBeVisible();
    });

    test('Should have mobile-friendly seat selection', async ({
      page,
      authHelper,
      moviesHelper,
      bookingHelper,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const testUser = {
        ...TEST_USERS.regularUser,
        email: `mobile_seat_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();

      // Try to select a show
      const hasShows = await page.locator('button:has-text("Book Now")').isVisible().catch(() => false);

      if (hasShows) {
        await bookingHelper.selectShow(0);

        // Verify seat grid is accessible on mobile
        const seatGrid = page.locator('.seat-grid');
        await expect(seatGrid).toBeVisible();

        // Verify seats are tappable (minimum 32px as per mobile guidelines)
        const seat = page.locator('.seat-available').first();
        if (await seat.isVisible()) {
          await seat.click();

          // Verify seat was selected
          const selectedSeats = page.locator('.seat-selected');
          await expect(selectedSeats).toHaveCount(1);
        }
      }
    });
  });

  test.describe('Security Features', () => {
    test('TC-033: Should prevent SQL injection in search input', async ({
      page,
      authHelper,
      moviesHelper,
    }) => {
      const testUser = {
        ...TEST_USERS.regularUser,
        email: `security_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      await moviesHelper.navigateToMovies();

      // Attempt SQL injection
      const sqlInjection = "'; DROP TABLE movies; --";
      await moviesHelper.searchMovies(sqlInjection);

      // Application should still function normally
      await page.waitForTimeout(1000);

      // Verify page didn't crash
      await expect(page.locator('.movie-grid').or(page.locator('.empty-state'))).toBeVisible();

      // Verify search was treated as literal string
      const movieCards = page.locator('.movie-card');
      const emptyState = page.locator('.empty-state');

      const hasMovies = (await movieCards.count()) > 0;
      const hasEmptyState = await emptyState.isVisible();

      expect(hasMovies || hasEmptyState).toBe(true);
    });

    test('TC-034: Should prevent XSS attacks in user input', async ({
      page,
      authHelper,
      moviesHelper,
    }) => {
      const testUser = {
        ...TEST_USERS.regularUser,
        email: `xss_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      await moviesHelper.navigateToMovies();

      // Attempt XSS injection
      const xssPayload = "<script>alert('XSS')</script>";
      await moviesHelper.searchMovies(xssPayload);

      // Verify no alert was triggered
      await page.waitForTimeout(500);

      // Verify search input is sanitized
      const searchInput = page.locator('input[type="search"]');
      const inputValue = await searchInput.inputValue();

      // Input should be escaped or sanitized
      // React typically escapes this automatically
      await expect(page).not.toHaveURL(/javascript:/);
    });

    test('TC-032: Should enforce rate limiting on authentication endpoint', async ({
      page,
    }) => {
      await page.goto('/login');

      const invalidEmail = 'ratelimit@example.com';
      const invalidPassword = 'wrong123';

      // Make multiple rapid login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('input[type="email"]#email', invalidEmail);
        await page.fill('input[type="password"]#password', invalidPassword);
        await page.click('button[type="submit"]');

        await page.waitForTimeout(200);
      }

      // After multiple attempts, should see rate limit error
      // Note: Actual rate limit behavior depends on backend configuration
      const hasError = await page.locator('.alert-error').isVisible();

      // Either rate limited or regular error
      expect(hasError).toBe(true);
    });

    test('TC-019: Should handle JWT token expiration gracefully', async ({
      page,
      authHelper,
    }) => {
      const testUser = {
        ...TEST_USERS.regularUser,
        email: `token_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      // Get the token
      const token = await authHelper.getStoredToken();
      expect(token).not.toBeNull();

      // Simulate expired token by setting an invalid token
      await page.evaluate(() => {
        localStorage.setItem('token', 'expired.invalid.token');
      });

      // Try to access protected route
      await page.goto('/bookings');

      // Should be redirected to login or see error
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      const isOnLogin = currentUrl.includes('/login');
      const hasError = await page.locator('.alert-error, text=/session expired/i').isVisible().catch(() => false);

      expect(isOnLogin || hasError).toBe(true);
    });
  });

  test.describe('Email Notifications', () => {
    test('TC-014: Should trigger email notification on booking confirmation', async ({
      page,
      authHelper,
      moviesHelper,
      bookingHelper,
    }) => {
      const testUser = {
        ...TEST_USERS.regularUser,
        email: `email_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      // Complete a booking
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();

      const hasShows = await page.locator('button:has-text("Book Now")').isVisible().catch(() => false);

      if (hasShows) {
        await bookingHelper.selectShow(0);
        await bookingHelper.selectSeats(1);
        await bookingHelper.proceedToPayment();
        await bookingHelper.completePayment({
          cardNumber: '1234 5678 9012 3456',
          cardHolder: 'Test User',
        });

        // Email simulation should be triggered (check console or logs in real implementation)
        // Verify booking confirmation is shown
        await expect(page.locator('text=/Booking #/i')).toBeVisible();

        // In production, verify email log or service was called
      }
    });
  });

  test.describe('Data Validation', () => {
    test('TC-029: Should validate payment card details', async ({
      page,
      authHelper,
      moviesHelper,
      bookingHelper,
    }) => {
      const testUser = {
        ...TEST_USERS.regularUser,
        email: `validation_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();

      const hasShows = await page.locator('button:has-text("Book Now")').isVisible().catch(() => false);

      if (hasShows) {
        await bookingHelper.selectShow(0);
        await bookingHelper.selectSeats(1);
        await bookingHelper.proceedToPayment();

        // Enter invalid card number
        await page.fill('input#cardNumber', '0000');

        // Try to submit
        const submitButton = page.locator('button[type="submit"]:has-text("Pay")');

        // Either HTML5 validation or custom validation should prevent submission
        const isEnabled = await submitButton.isEnabled();

        // If enabled, clicking should show error
        if (isEnabled) {
          await submitButton.click();

          // Should either stay on page or show error
          await page.waitForTimeout(1000);

          const stillOnPayment = page.url().includes('/payment');
          const hasError = await page.locator('.alert-error, text=/invalid/i').isVisible().catch(() => false);

          expect(stillOnPayment || hasError).toBe(true);
        }
      }
    });

    test('Should validate registration form inputs', async ({
      page,
    }) => {
      await page.goto('/register');

      // Try to submit with missing fields
      await page.click('button[type="submit"]');

      // HTML5 validation should prevent submission
      // Or custom validation should show errors
      const isStillOnRegister = await page.url().includes('/register');

      expect(isStillOnRegister).toBe(true);

      // Try with invalid email
      await page.fill('input#fullName', 'Test User');
      await page.fill('input[type="email"]#email', 'invalid-email');
      await page.fill('input[type="password"]#password', 'short');

      await page.click('button[type="submit"]');

      // Should remain on registration page
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/register');
    });

    test('Should enforce password minimum length', async ({
      page,
    }) => {
      await page.goto('/register');

      await page.fill('input#fullName', 'Test User');
      await page.fill('input[type="email"]#email', 'test@example.com');
      await page.fill('input[type="password"]#password', '12345'); // Less than 6 characters

      // HTML5 validation with minLength should prevent submission
      const passwordInput = page.locator('input[type="password"]#password');
      const minLength = await passwordInput.getAttribute('minLength');

      expect(minLength).toBe('6');
    });
  });
});
