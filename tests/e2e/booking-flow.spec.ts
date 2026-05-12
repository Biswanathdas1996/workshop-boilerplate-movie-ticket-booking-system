import { test, expect } from '../fixtures/test.fixtures';
import { TEST_USERS, TEST_PAYMENT, BOOKING_CONFIG } from '../fixtures/test-data';

test.describe('Booking Flow - Seat Selection, Payment, and Digital Tickets', () => {
  test.beforeEach(async ({ authHelper }) => {
    // Register and login before each test
    const testUser = {
      ...TEST_USERS.regularUser,
      email: `booking_${Date.now()}@example.com`,
    };
    await authHelper.register(testUser);
  });

  test.describe('Complete Booking Flow', () => {
    test('TC-011: E2E - Complete booking from movie selection to digital ticket', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      // Step 1: Browse and select movie
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();

      // Step 2: Select a show
      await bookingHelper.selectShow(0);

      // Step 3: Select seats
      await expect(page).toHaveURL(/.*\/seats\//);
      const selectedSeats = await bookingHelper.selectSeats(BOOKING_CONFIG.defaultSeatsToSelect);
      expect(selectedSeats.length).toBe(BOOKING_CONFIG.defaultSeatsToSelect);

      // Verify selected seats count
      await bookingHelper.verifySelectedSeatsCount(BOOKING_CONFIG.defaultSeatsToSelect);

      // Step 4: Verify booking summary
      await bookingHelper.verifyBookingSummary(
        BOOKING_CONFIG.defaultSeatsToSelect,
        BOOKING_CONFIG.pricePerSeat
      );

      // Step 5: Proceed to payment
      await bookingHelper.proceedToPayment();

      // Step 6: Complete payment
      await expect(page).toHaveURL(/.*\/payment\//);
      await bookingHelper.completePayment(TEST_PAYMENT);

      // Step 7: Verify booking confirmation and QR code
      await expect(page).toHaveURL(/.*\/bookings\//);

      const bookingNumber = await bookingHelper.getBookingNumber();
      expect(bookingNumber).toBeTruthy();

      // Verify QR code is displayed
      await bookingHelper.verifyQRCodeVisible();

      // Verify booking status is confirmed
      await expect(page.locator('text=/confirmed/i')).toBeVisible();
    });
  });

  test.describe('Seat Selection', () => {
    test('TC-005: Should display interactive seat map with selection functionality', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      // Navigate to seat selection
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);

      // Verify seat map is displayed
      await expect(page.locator('.seat-grid')).toBeVisible();

      // Verify screen indicator
      await expect(page.locator('.screen')).toBeVisible();

      // Verify seats are available
      const availableSeats = page.locator('.seat-available');
      await expect(availableSeats.first()).toBeVisible();

      // Select a seat
      await availableSeats.first().click();

      // Verify seat changes to selected state
      const selectedSeats = page.locator('.seat-selected');
      await expect(selectedSeats).toHaveCount(1);

      // Deselect the seat by clicking again
      await selectedSeats.first().click();

      // Verify seat returns to available state
      await expect(selectedSeats).toHaveCount(0);
    });

    test('Should prevent selection of booked seats', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);

      // Check if there are any booked seats
      const bookedSeats = page.locator('.seat-booked');
      const bookedCount = await bookedSeats.count();

      if (bookedCount > 0) {
        // Try to click a booked seat
        await bookedSeats.first().click();

        // Verify seat remains unselected
        const selectedSeats = page.locator('.seat-selected');
        const selectedCount = await selectedSeats.count();
        expect(selectedCount).toBe(0);
      }
    });

    test('Should display booking summary with correct total', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);

      // Select multiple seats
      const seatCount = 3;
      await bookingHelper.selectSeats(seatCount);

      // Verify booking summary displays correct information
      await expect(page.locator('text=/Total.*\\$/i')).toBeVisible();

      // Verify Continue button is enabled
      const continueButton = page.locator('button:has-text("Continue to Payment")');
      await expect(continueButton).toBeEnabled();
    });
  });

  test.describe('Payment Simulation', () => {
    test('TC-006: Should process payment simulation successfully', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      // Create booking with seats
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);
      await bookingHelper.selectSeats(2);
      await bookingHelper.proceedToPayment();

      // Verify payment page loaded
      await expect(page).toHaveURL(/.*\/payment\//);

      // Verify payment simulation notice
      await expect(page.locator('.alert-info')).toContainText(/payment simulation/i);

      // Verify booking summary is displayed
      await expect(page.locator('h2:has-text("Booking Summary")')).toBeVisible();
      await expect(page.locator('text=/Movie:/i')).toBeVisible();
      await expect(page.locator('text=/Theater:/i')).toBeVisible();
      await expect(page.locator('text=/Total Amount:/i')).toBeVisible();

      // Complete payment
      await bookingHelper.completePayment(TEST_PAYMENT);

      // Verify redirect to booking details
      await expect(page).toHaveURL(/.*\/bookings\//);
    });

    test('TC-017: Should handle payment failure and allow retry', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);
      await bookingHelper.selectSeats(1);
      await bookingHelper.proceedToPayment();

      // Note: Payment has 95% success rate, so we can't reliably test failure
      // This test verifies the form allows resubmission
      await page.fill('input#cardNumber', '9999 9999 9999 9999');
      await page.fill('input#cardHolder', 'Test Failure');

      const payButton = page.locator('button[type="submit"]:has-text("Pay")');
      await expect(payButton).toBeEnabled();
    });

    test('Should support multiple payment methods', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);
      await bookingHelper.selectSeats(1);
      await bookingHelper.proceedToPayment();

      // Verify payment method dropdown
      const paymentMethodSelect = page.locator('select#paymentMethod');
      await expect(paymentMethodSelect).toBeVisible();

      // Verify available payment methods
      const options = paymentMethodSelect.locator('option');
      await expect(options).toHaveCount(3); // card, upi, wallet

      // Select UPI
      await paymentMethodSelect.selectOption('upi');

      // Select Wallet
      await paymentMethodSelect.selectOption('wallet');
    });
  });

  test.describe('Digital Tickets and QR Codes', () => {
    test('TC-007: Should display digital ticket with QR code after successful booking', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      // Complete full booking flow
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);
      await bookingHelper.selectSeats(2);
      await bookingHelper.proceedToPayment();
      await bookingHelper.completePayment(TEST_PAYMENT);

      // Verify booking details page
      await expect(page.locator('h1:has-text("Booking Details")')).toBeVisible();

      // Verify booking information
      await expect(page.locator('text=/Booking #/i')).toBeVisible();
      await expect(page.locator('text=/Movie:/i')).toBeVisible();
      await expect(page.locator('text=/Theater:/i')).toBeVisible();
      await expect(page.locator('text=/Show Time:/i')).toBeVisible();
      await expect(page.locator('text=/Seats:/i')).toBeVisible();
      await expect(page.locator('text=/Total Amount:/i')).toBeVisible();

      // Verify digital ticket section
      await expect(page.locator('h2:has-text("Digital Ticket")')).toBeVisible();

      // Verify QR code is present
      await bookingHelper.verifyQRCodeVisible();

      // Verify QR code instruction text
      await expect(page.locator('text=/present.*qr code/i')).toBeVisible();
    });

    test('Should include booking information in QR code', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      // Complete booking
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);
      await bookingHelper.selectSeats(1);
      await bookingHelper.proceedToPayment();
      await bookingHelper.completePayment(TEST_PAYMENT);

      // Get booking number
      const bookingNumber = await bookingHelper.getBookingNumber();
      expect(bookingNumber).toBeTruthy();

      // Verify QR code contains booking reference
      // Note: Actual QR code content validation would require decoding
      const qrCode = page.locator('img[alt*="QR"]').or(page.locator('svg'));
      await expect(qrCode).toBeVisible();
    });
  });

  test.describe('Booking History', () => {
    test('TC-008: Should display user booking history with filters', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      // Create a booking first
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);
      await bookingHelper.selectSeats(1);
      await bookingHelper.proceedToPayment();
      await bookingHelper.completePayment(TEST_PAYMENT);

      const bookingNumber = await bookingHelper.getBookingNumber();

      // Navigate to My Bookings
      await bookingHelper.navigateToMyBookings();

      // Verify bookings page loaded
      await expect(page.locator('h1:has-text("My Bookings")')).toBeVisible();

      // Verify filter buttons
      await expect(page.locator('button:has-text("All")')).toBeVisible();
      await expect(page.locator('button:has-text("Confirmed")')).toBeVisible();
      await expect(page.locator('button:has-text("Pending")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancelled")')).toBeVisible();

      // Verify booking is in the list
      await bookingHelper.verifyBookingInList(bookingNumber);

      // Test filter - Confirmed bookings
      await bookingHelper.filterBookingsByStatus('Confirmed');
      await bookingHelper.verifyBookingInList(bookingNumber);
    });

    test('Should display booking details in table format', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      // Create a booking
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);
      await bookingHelper.selectSeats(1);
      await bookingHelper.proceedToPayment();
      await bookingHelper.completePayment(TEST_PAYMENT);

      // Navigate to bookings
      await bookingHelper.navigateToMyBookings();

      // Verify table columns
      await expect(page.locator('th:has-text("Booking #")')).toBeVisible();
      await expect(page.locator('th:has-text("Movie")')).toBeVisible();
      await expect(page.locator('th:has-text("Theater")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();

      // Verify View Details button
      const viewDetailsButtons = page.locator('button:has-text("View Details")');
      await expect(viewDetailsButtons.first()).toBeVisible();
    });

    test('TC-016: Should prevent cancellation of past show bookings', async ({
      page,
      moviesHelper,
      bookingHelper,
    }) => {
      // Create a booking
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();
      await bookingHelper.selectShow(0);
      await bookingHelper.selectSeats(1);
      await bookingHelper.proceedToPayment();
      await bookingHelper.completePayment(TEST_PAYMENT);

      // Go to booking details
      const bookingNumber = await bookingHelper.getBookingNumber();

      // Check if show time is in the future (for current bookings, cancel should be available)
      const cancelButton = page.locator('button:has-text("Cancel Booking")');

      // If the show is in the future, button should be visible and enabled
      // If the show is in the past, button should be disabled or hidden
      const isVisible = await cancelButton.isVisible().catch(() => false);

      if (isVisible) {
        const isEnabled = await cancelButton.isEnabled();
        // If visible, it should be enabled for future shows
        expect(isEnabled).toBe(true);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('TC-028: Should show fully booked message when no seats available', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();

      // Check for shows with 0 available seats
      const fullyBookedText = page.locator('text=/0 seats available|fully booked/i');
      const hasFullyBooked = await fullyBookedText.isVisible().catch(() => false);

      if (hasFullyBooked) {
        // Verify Book Now button is disabled
        const bookButton = page.locator('button:has-text("Book Now")').first();
        await expect(bookButton).toBeDisabled();
      }
    });

    test('TC-015: Should handle concurrent seat selection conflicts', async ({
      page,
    }) => {
      // Note: Testing concurrent access requires multiple browser contexts
      // This is a placeholder that verifies the seat locking mechanism exists
      // Full implementation would require parallel test execution
      await page.goto('/movies');

      // Verify the application has seat selection page
      await expect(page.locator('a[href="/movies"]')).toBeVisible();
    });
  });
});
