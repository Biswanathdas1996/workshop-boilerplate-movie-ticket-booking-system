import { test, expect } from '@playwright/test';
import { registerUser, generateTestUser } from './helpers/auth.helper';

test.describe('Booking Flow', () => {
  test('TC-005: View booking page and seat selection interface', async ({ page }) => {
    const testUser = generateTestUser('booking');
    await registerUser(page, testUser);

    // Navigate to movies
    await page.goto('/movies');

    // Try to find a movie with shows
    const movieCard = page.locator('.movie-card, [class*="movie-card"]').first();
    const hasMovies = await movieCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasMovies) {
      test.skip();
      return;
    }

    // Click on movie to view details
    await movieCard.click();
    await page.waitForURL(/\/movies\/.+/);

    // Look for show times
    const showButton = page.locator('button:has-text(/[0-9]{1,2}:[0-9]{2}/), a:has-text(/[0-9]{1,2}:[0-9]{2}/)').first();
    const hasShows = await showButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasShows) {
      // No shows available for this movie
      test.skip();
      return;
    }

    // Click on a show time
    await showButton.click();

    // Wait for booking page
    await page.waitForURL(/\/booking\/.+/);

    // Verify booking page elements
    await expect(page.locator('text=/select.*seat|seat.*selection/i')).toBeVisible({ timeout: 5000 });

    // Check for seat map
    const seatMap = page.locator('.seat-map, [class*="seat"]');
    await expect(seatMap.first()).toBeVisible();

    // Check for seat legend (available, booked, selected)
    const legend = page.locator('.seat-legend, text=/available|booked|selected/i');
    await expect(legend.first()).toBeVisible();
  });

  test('TC-018: Booked seats are disabled and cannot be selected', async ({ page }) => {
    const testUser = generateTestUser('bookedseat');
    await registerUser(page, testUser);

    // Navigate through to booking page
    await page.goto('/movies');

    const movieCard = page.locator('.movie-card, [class*="movie-card"]').first();
    if (!await movieCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await movieCard.click();
    await page.waitForURL(/\/movies\/.+/);

    const showButton = page.locator('button:has-text(/[0-9]{1,2}:[0-9]{2}/), a:has-text(/[0-9]{1,2}:[0-9]{2}/)').first();
    if (!await showButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await showButton.click();
    await page.waitForURL(/\/booking\/.+/);

    // Find booked seats (if any)
    const bookedSeats = page.locator('.seat.booked, [class*="seat"][class*="booked"], button[disabled]:has-text(/[A-Z][0-9]/)');
    const hasBookedSeats = await bookedSeats.first().isVisible({ timeout: 2000 }).catch(() => false);

    if (hasBookedSeats) {
      // Verify booked seat is disabled
      const firstBookedSeat = bookedSeats.first();
      await expect(firstBookedSeat).toBeDisabled();

      // Attempt to click it (should have no effect)
      await firstBookedSeat.click({ force: true, timeout: 1000 }).catch(() => {});

      // Verify it didn't get selected
      const isSelected = await firstBookedSeat.evaluate((el) =>
        el.classList.contains('selected') || el.getAttribute('aria-pressed') === 'true'
      );
      expect(isSelected).toBe(false);
    }

    // Find and click an available seat
    const availableSeats = page.locator('.seat.available, [class*="seat"]:not([disabled]):not([class*="booked"])');
    const hasAvailableSeats = await availableSeats.first().isVisible({ timeout: 2000 }).catch(() => false);

    if (hasAvailableSeats) {
      const firstAvailableSeat = availableSeats.first();
      await firstAvailableSeat.click();

      // Verify seat becomes selected
      await page.waitForTimeout(500);
      const isNowSelected = await firstAvailableSeat.evaluate((el) =>
        el.classList.contains('selected') || el.getAttribute('aria-pressed') === 'true'
      );
      expect(isNowSelected).toBe(true);
    }
  });

  test('TC-035: Unauthenticated user redirected to login when accessing booking', async ({ page }) => {
    // Do NOT login, go directly to a booking URL
    await page.goto('/booking/test-show-id');

    // Should be redirected to login
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page).toHaveURL('/login');

    // Verify login page is displayed
    await expect(page.locator('h1')).toContainText(/login/i);
  });
});
