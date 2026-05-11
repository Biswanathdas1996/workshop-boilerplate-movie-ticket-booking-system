import { test, expect } from '@playwright/test';
import { registerUser, generateTestUser, loginUser, logoutUser } from './helpers/auth.helper';

test.describe('Theme and Language Features', () => {
  test('TC-024: Dark mode toggle persists across sessions - KAN-415', async ({ page }) => {
    const testUser = generateTestUser('theme');

    // Register and login
    await registerUser(page, testUser);

    // Verify initial theme is light (default)
    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    expect(htmlTheme).toBe('light');

    // Find and click theme toggle button
    const themeToggle = page.locator('nav button[aria-label*="Toggle theme"], nav button[aria-label*="theme"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();

    // Wait for theme to change to dark
    await page.waitForTimeout(500); // Allow for theme update
    const darkTheme = await page.locator('html').getAttribute('data-theme');
    expect(darkTheme).toBe('dark');

    // Verify dark mode icon changed (Sun icon appears in dark mode)
    const sunIcon = page.locator('nav button[aria-label*="theme"] svg');
    await expect(sunIcon).toBeVisible();

    // Logout and login again
    await logoutUser(page);
    await loginUser(page, testUser.email, testUser.password);

    // Verify dark mode persists after re-login
    await page.waitForTimeout(500);
    const persistedTheme = await page.locator('html').getAttribute('data-theme');
    expect(persistedTheme).toBe('dark');
  });

  test('TC-025: Multi-language support changes all UI text - KAN-416', async ({ page }) => {
    const testUser = generateTestUser('language');

    // Register and login
    await registerUser(page, testUser);

    // Navigate to movies page to see translatable content
    await page.goto('/movies');

    // Verify initial language is English
    const moviesHeading = page.locator('h1');
    await expect(moviesHeading).toContainText(/movies/i);

    // Find and click language selector (Globe icon)
    const languageSelector = page.locator('nav button[aria-label*="language"], nav button[aria-label*="Change language"]');
    await expect(languageSelector).toBeVisible();
    await languageSelector.click();

    // Select Spanish from dropdown
    const spanishOption = page.locator('button:has-text("Español"), .dropdown-menu button:has-text("Español")');
    await expect(spanishOption).toBeVisible();
    await spanishOption.click();

    // Wait for language change
    await page.waitForTimeout(500);

    // Verify UI text changed to Spanish
    // "Movies" should become "Películas"
    await expect(moviesHeading).toContainText(/películas/i);

    // Check navigation links
    const navLinks = page.locator('nav a');
    const navText = await navLinks.allTextContents();
    const hasSpanishText = navText.some(text =>
      text.toLowerCase().includes('películas') ||
      text.toLowerCase().includes('reservas')
    );
    expect(hasSpanishText).toBe(true);

    // Logout and login to verify persistence
    await logoutUser(page);
    await loginUser(page, testUser.email, testUser.password);

    // Verify Spanish persists
    await page.goto('/movies');
    await page.waitForTimeout(500);
    await expect(page.locator('h1')).toContainText(/películas/i);
  });

  test('TC-028: Responsive design on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const testUser = generateTestUser('mobile');
    await registerUser(page, testUser);

    // Navigate to movies page
    await page.goto('/movies');

    // Verify page is responsive
    await expect(page.locator('h1')).toBeVisible();

    // Check that movie grid adapts (should show fewer columns)
    const movieGrid = page.locator('.movie-grid, .movies-page');
    await expect(movieGrid).toBeVisible();

    // Verify navbar is visible and adapted
    await expect(page.locator('nav')).toBeVisible();

    // Check that content doesn't overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });
});
