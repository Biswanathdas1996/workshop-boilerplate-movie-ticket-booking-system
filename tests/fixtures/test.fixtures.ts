import { test as base } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { MoviesHelper } from '../helpers/movies.helper';
import { BookingHelper } from '../helpers/booking.helper';
import { AdminHelper } from '../helpers/admin.helper';

type TestFixtures = {
  authHelper: AuthHelper;
  moviesHelper: MoviesHelper;
  bookingHelper: BookingHelper;
  adminHelper: AdminHelper;
};

export const test = base.extend<TestFixtures>({
  authHelper: async ({ page }, use) => {
    const authHelper = new AuthHelper(page);
    await use(authHelper);
  },

  moviesHelper: async ({ page }, use) => {
    const moviesHelper = new MoviesHelper(page);
    await use(moviesHelper);
  },

  bookingHelper: async ({ page }, use) => {
    const bookingHelper = new BookingHelper(page);
    await use(bookingHelper);
  },

  adminHelper: async ({ page }, use) => {
    const adminHelper = new AdminHelper(page);
    await use(adminHelper);
  },
});

export { expect } from '@playwright/test';
