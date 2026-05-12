import { test, expect } from '../fixtures/test.fixtures';
import { TEST_USERS, INVALID_CREDENTIALS } from '../fixtures/test-data';

test.describe('Authentication - User Registration and Login', () => {
  test.describe('User Registration', () => {
    test('TC-001: Should successfully register a new user with valid credentials', async ({
      page,
      authHelper,
    }) => {
      const newUser = {
        ...TEST_USERS.regularUser,
        email: `newuser_${Date.now()}@example.com`,
      };

      await authHelper.register(newUser);

      // Verify user is redirected to movies page after registration
      await expect(page).toHaveURL(/.*\/movies/);

      // Verify user is logged in (logout button should be visible)
      const isLoggedIn = await authHelper.isLoggedIn();
      expect(isLoggedIn).toBe(true);

      // Verify JWT token is stored in localStorage
      const token = await authHelper.getStoredToken();
      expect(token).not.toBeNull();
      expect(token?.length).toBeGreaterThan(0);
    });

    test('TC-027: Should show error when registering with existing email', async ({
      page,
      authHelper,
    }) => {
      // First, register a user
      const existingUser = {
        ...TEST_USERS.regularUser,
        email: `existing_${Date.now()}@example.com`,
      };
      await authHelper.register(existingUser);

      // Logout
      await authHelper.logout();

      // Try to register again with the same email
      await page.goto('/register');

      await page.fill('input[type="text"]#fullName', 'Another User');
      await page.fill('input[type="email"]#email', existingUser.email);
      await page.fill('input[type="password"]#password', 'AnotherPass123!');
      await page.click('button[type="submit"]');

      // Verify error message is displayed
      const errorAlert = page.locator('.alert-error');
      await expect(errorAlert).toBeVisible({ timeout: 5000 });
      await expect(errorAlert).toContainText(/email already registered/i);

      // Verify user remains on registration page
      await expect(page).toHaveURL(/.*\/register/);
    });
  });

  test.describe('User Login', () => {
    test('TC-002: Should successfully login with valid JWT authentication', async ({
      page,
      authHelper,
    }) => {
      // First register a user
      const testUser = {
        ...TEST_USERS.regularUser,
        email: `logintest_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      // Logout
      await authHelper.logout();

      // Now login with the same credentials
      await authHelper.login(testUser);

      // Verify redirect to movies page
      await expect(page).toHaveURL(/.*\/movies/);

      // Verify logout button is visible in navbar
      const logoutButton = page.locator('button:has-text("Logout")');
      await expect(logoutButton).toBeVisible();

      // Verify JWT token is stored
      const token = await authHelper.getStoredToken();
      expect(token).not.toBeNull();
    });

    test('TC-026: Should show error for invalid credentials', async ({
      page,
      authHelper,
    }) => {
      await page.goto('/login');

      await page.fill('input[type="email"]#email', INVALID_CREDENTIALS.email);
      await page.fill('input[type="password"]#password', INVALID_CREDENTIALS.password);
      await page.click('button[type="submit"]');

      // Verify error message is displayed
      const errorAlert = page.locator('.alert-error');
      await expect(errorAlert).toBeVisible({ timeout: 5000 });
      await expect(errorAlert).toContainText(/incorrect email or password/i);

      // Verify user remains on login page
      await expect(page).toHaveURL(/.*\/login/);

      // Verify no token is stored
      const token = await authHelper.getStoredToken();
      expect(token).toBeNull();
    });

    test('TC-024: Should support OAuth Google sign-in simulation', async ({ page }) => {
      await page.goto('/login');

      // Verify Google sign-in button is present
      const googleButton = page.locator('button:has-text("Sign in with Google")');
      await expect(googleButton).toBeVisible();

      // Click Google button (will show simulation message)
      await googleButton.click();

      // Verify OAuth simulation message or behavior
      // Note: This is a simulation, actual implementation may vary
      const errorAlert = page.locator('.alert-error');
      await expect(errorAlert).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Session Management', () => {
    test('Should maintain session across page navigation', async ({
      page,
      authHelper,
      moviesHelper,
    }) => {
      // Register and login
      const testUser = {
        ...TEST_USERS.regularUser,
        email: `session_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      // Navigate to different pages
      await moviesHelper.navigateToMovies();
      await expect(authHelper.isLoggedIn()).resolves.toBe(true);

      await page.goto('/bookings');
      await expect(authHelper.isLoggedIn()).resolves.toBe(true);

      // Verify token persists
      const token = await authHelper.getStoredToken();
      expect(token).not.toBeNull();
    });

    test('Should logout successfully and clear session', async ({
      page,
      authHelper,
    }) => {
      // Register and login
      const testUser = {
        ...TEST_USERS.regularUser,
        email: `logout_${Date.now()}@example.com`,
      };
      await authHelper.register(testUser);

      // Verify logged in
      expect(await authHelper.isLoggedIn()).toBe(true);

      // Logout
      await authHelper.logout();

      // Verify redirected to login page
      await expect(page).toHaveURL(/.*\/login/);

      // Verify token is removed
      const token = await authHelper.getStoredToken();
      expect(token).toBeNull();
    });
  });
});
