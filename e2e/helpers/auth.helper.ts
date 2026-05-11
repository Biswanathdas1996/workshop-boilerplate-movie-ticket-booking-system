import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'user';
    language: string;
    theme: string;
  };
}

/**
 * Register a new user via UI
 */
export async function registerUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register');

  await page.fill('input#full_name', user.full_name);
  await page.fill('input#email', user.email);
  if (user.phone) {
    await page.fill('input#phone', user.phone);
  }
  await page.fill('input#password', user.password);

  await page.click('button[type="submit"]');

  // Wait for navigation after successful registration
  await page.waitForURL('/');
  await expect(page.locator('nav')).toBeVisible();
}

/**
 * Login user via UI
 */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');

  await page.fill('input#email', email);
  await page.fill('input#password', password);

  await page.click('button[type="submit"]');

  // Wait for successful login and navigation
  await page.waitForURL('/');
  await expect(page.locator('nav')).toBeVisible();
}

/**
 * Login user via API (faster for setup)
 */
export async function loginUserAPI(page: Page, email: string, password: string): Promise<LoginResponse> {
  const response = await page.request.post('/api/auth/login', {
    data: { email, password }
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json() as LoginResponse;

  // Store token in localStorage
  await page.goto('/');
  await page.evaluate((authData) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        token: authData.access_token,
        user: authData.user,
        isAuthenticated: true
      },
      version: 0
    }));
  }, data);

  await page.reload();
  return data;
}

/**
 * Logout user
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click the user menu dropdown button
  const userMenuButton = page.locator('nav button[aria-label="User menu"]');
  await userMenuButton.click();

  // Wait for dropdown to be visible and click logout
  await page.waitForTimeout(200);
  const logoutButton = page.locator('.dropdown-menu button:has-text("Logout"), .dropdown-menu button >> text=/logout/i');
  await logoutButton.click();

  await page.waitForURL('/login');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const navBar = page.locator('nav');
  const logoutButton = navBar.locator('button:has-text("Logout"), button:has-text("Déconnexion")');
  return await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Generate unique test user
 */
export function generateTestUser(prefix: string = 'test'): TestUser {
  const timestamp = Date.now();
  return {
    email: `${prefix}-${timestamp}@example.com`,
    password: 'TestPassword123!',
    full_name: `Test User ${timestamp}`,
    phone: '+1234567890'
  };
}
