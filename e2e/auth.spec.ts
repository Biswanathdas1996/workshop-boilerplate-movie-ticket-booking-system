import { test, expect } from '@playwright/test';
import { registerUser, loginUser, generateTestUser, logoutUser } from './helpers/auth.helper';

test.describe('Authentication - KAN-378, KAN-379', () => {
  test('TC-001: User registration with valid credentials', async ({ page }) => {
    const testUser = generateTestUser('register');

    await registerUser(page, testUser);

    // Verify successful registration and redirect to homepage
    await expect(page).toHaveURL('/');

    // Verify user is logged in (navbar should show user menu)
    await expect(page.locator('nav')).toBeVisible();
    const userMenuButton = page.locator('nav button[aria-label*="User menu"], nav button[aria-label*="user menu"]');
    await expect(userMenuButton).toBeVisible();

    // Verify JWT token is stored in localStorage
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });
    expect(authStorage).toBeTruthy();
    const authData = JSON.parse(authStorage!);
    expect(authData.state.token).toBeTruthy();
    expect(authData.state.isAuthenticated).toBe(true);
    expect(authData.state.user.email).toBe(testUser.email);
  });

  test('TC-002: User login with valid credentials', async ({ page }) => {
    // First register a user
    const testUser = generateTestUser('login');
    await registerUser(page, testUser);

    // Logout
    await logoutUser(page);

    // Now login with the same credentials
    await loginUser(page, testUser.email, testUser.password);

    // Verify successful login
    await expect(page).toHaveURL('/');

    // Verify authentication state
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });
    expect(authStorage).toBeTruthy();
    const authData = JSON.parse(authStorage!);
    expect(authData.state.token).toBeTruthy();
    expect(authData.state.isAuthenticated).toBe(true);

    // Verify user can access authenticated pages
    await page.goto('/movies');
    await expect(page.locator('h1')).toContainText(/movies/i);
  });

  test('TC-015: Registration fails with duplicate email', async ({ page }) => {
    const testUser = generateTestUser('duplicate');

    // Register first time
    await registerUser(page, testUser);

    // Logout
    await logoutUser(page);

    // Try to register again with same email
    await page.goto('/register');

    await page.fill('input#full_name', testUser.full_name);
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.click('button[type="submit"]');

    // Verify error message is displayed
    const errorMessage = page.locator('.error-message, [role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/email already registered/i);

    // Verify user is not logged in
    await expect(page).toHaveURL('/register');
  });

  test('TC-033: Login fails with invalid credentials', async ({ page }) => {
    const testUser = generateTestUser('invalid');

    // Register a user first
    await registerUser(page, testUser);
    await logoutUser(page);

    // Try to login with wrong password
    await page.goto('/login');
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Verify error message
    const errorMessage = page.locator('.error-message, [role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/invalid|incorrect|failed/i);

    // Verify user remains on login page
    await expect(page).toHaveURL('/login');

    // Verify no authentication token is set
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });
    const authData = authStorage ? JSON.parse(authStorage) : null;
    expect(authData?.state?.isAuthenticated).not.toBe(true);
  });

  test('TC-035: Regular user cannot access admin dashboard', async ({ page }) => {
    const testUser = generateTestUser('regular');

    // Register as regular user
    await registerUser(page, testUser);

    // Try to access admin dashboard
    await page.goto('/admin');

    // Verify redirect to home or see forbidden message
    // The PrivateRoute should redirect non-admin users
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});
