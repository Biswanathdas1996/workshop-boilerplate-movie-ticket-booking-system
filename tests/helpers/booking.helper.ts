import { Page, expect } from '@playwright/test';

export interface PaymentDetails {
  cardNumber: string;
  cardHolder: string;
  paymentMethod?: string;
}

export class BookingHelper {
  constructor(private page: Page) {}

  async selectShow(showIndex: number = 0): Promise<void> {
    // Wait for shows table to load
    await this.page.waitForSelector('table.data-table', { timeout: 10000 });

    // Click "Book Now" button for the specified show
    const bookButtons = this.page.locator('button:has-text("Book Now")');
    await bookButtons.nth(showIndex).click();

    // Wait for seat selection page
    await this.page.waitForURL('**/seats/*');
  }

  async selectSeats(seatCount: number): Promise<string[]> {
    await this.page.waitForSelector('.seat-grid', { timeout: 10000 });

    const selectedSeats: string[] = [];
    const availableSeats = this.page.locator('.seat-available');

    for (let i = 0; i < seatCount; i++) {
      const seat = availableSeats.nth(i);
      await seat.click();

      // Get seat label (row + number)
      const seatText = await seat.getAttribute('aria-label') || `Seat ${i + 1}`;
      selectedSeats.push(seatText);
    }

    return selectedSeats;
  }

  async verifySelectedSeatsCount(expectedCount: number): Promise<void> {
    const selectedSeats = this.page.locator('.seat-selected');
    await expect(selectedSeats).toHaveCount(expectedCount);
  }

  async verifyBookingSummary(seatCount: number, pricePerSeat: number): Promise<void> {
    const totalAmount = seatCount * pricePerSeat;

    // Verify total amount is displayed correctly
    const summaryText = await this.page.locator('text=/Total.*\\$/').textContent();
    expect(summaryText).toContain(totalAmount.toFixed(2));
  }

  async proceedToPayment(): Promise<void> {
    await this.page.click('button:has-text("Continue to Payment")');
    await this.page.waitForURL('**/payment/*');
  }

  async completePayment(paymentDetails: PaymentDetails): Promise<void> {
    await this.page.waitForSelector('form[aria-label="Payment form"]', { timeout: 10000 });

    // Select payment method
    if (paymentDetails.paymentMethod) {
      await this.page.selectOption('select#paymentMethod', paymentDetails.paymentMethod);
    }

    // Fill card details (if card payment)
    if (paymentDetails.cardNumber) {
      await this.page.fill('input#cardNumber', paymentDetails.cardNumber);
    }

    if (paymentDetails.cardHolder) {
      await this.page.fill('input#cardHolder', paymentDetails.cardHolder);
    }

    // Submit payment
    await this.page.click('button[type="submit"]:has-text("Pay")');

    // Wait for redirect to booking details
    await this.page.waitForURL('**/bookings/*', { timeout: 15000 });
  }

  async verifyQRCodeVisible(): Promise<void> {
    // Check if QR code image is visible
    const qrCode = this.page.locator('img[alt*="QR"]').or(this.page.locator('svg[data-testid="qr-code"]'));
    await expect(qrCode).toBeVisible({ timeout: 10000 });
  }

  async getBookingNumber(): Promise<string> {
    const bookingText = await this.page.locator('text=/Booking #[A-Z0-9]+/').textContent();
    const match = bookingText?.match(/Booking #([A-Z0-9]+)/);
    return match ? match[1] : '';
  }

  async navigateToMyBookings(): Promise<void> {
    await this.page.click('a[href="/bookings"]');
    await this.page.waitForURL('**/bookings');
  }

  async verifyBookingInList(bookingNumber: string): Promise<void> {
    await this.page.waitForSelector('table.data-table', { timeout: 10000 });
    const bookingRow = this.page.locator(`td:has-text("${bookingNumber}")`);
    await expect(bookingRow).toBeVisible();
  }

  async filterBookingsByStatus(status: string): Promise<void> {
    await this.page.click(`button:has-text("${status}")`);
    await this.page.waitForTimeout(500);
  }

  async cancelBooking(bookingNumber: string): Promise<void> {
    // Find and click the booking
    await this.page.click(`tr:has-text("${bookingNumber}") button:has-text("View Details")`);

    // Click cancel button
    await this.page.click('button:has-text("Cancel Booking")');

    // Confirm cancellation in dialog
    this.page.on('dialog', dialog => dialog.accept());

    // Wait for status update
    await this.page.waitForTimeout(1000);
  }
}
