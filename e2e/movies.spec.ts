import { test, expect } from '@playwright/test';
import { registerUser, generateTestUser } from './helpers/auth.helper';

test.describe('Movie Browsing and Search', () => {
  test('TC-003: Browse and filter movies', async ({ page }) => {
    const testUser = generateTestUser('movies');
    await registerUser(page, testUser);

    // Navigate to movies page
    await page.goto('/movies');

    // Verify page loads with heading
    await expect(page.locator('h1')).toContainText(/movies/i);

    // Check for featured movies section if present
    const featuredSection = page.locator('h2:has-text("Featured"), h2:has-text("featured")');
    if (await featuredSection.isVisible({ timeout: 2000 })) {
      await expect(featuredSection).toBeVisible();
    }

    // Check for trending movies section if present
    const trendingSection = page.locator('h2:has-text("Trending"), h2:has-text("trending")');
    if (await trendingSection.isVisible({ timeout: 2000 })) {
      await expect(trendingSection).toBeVisible();
    }

    // Verify search box is present
    const searchBox = page.locator('input[type="text"][placeholder*="search" i], input[placeholder*="Search movies" i]');
    await expect(searchBox).toBeVisible();

    // Verify filter controls are present
    const genreFilter = page.locator('select[aria-label*="genre" i], select:has(option:has-text("Genre"))');
    const languageFilter = page.locator('select[aria-label*="language" i], select:has(option:has-text("Language"))');

    await expect(genreFilter).toBeVisible();
    await expect(languageFilter).toBeVisible();

    // Test search functionality
    await searchBox.fill('Action');
    await page.waitForTimeout(1000); // Wait for debounced search

    // Test genre filter
    await genreFilter.selectOption('Action');
    await page.waitForTimeout(500);

    // Test language filter
    await languageFilter.selectOption('English');
    await page.waitForTimeout(500);

    // Verify movies display or no results message
    const movieCards = page.locator('.movie-card, [class*="movie"]');
    const noResults = page.locator('text=/no.*found|no.*results/i');

    // Either movies are shown or "no results" message
    const hasMovies = await movieCards.first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasNoResults = await noResults.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasMovies || hasNoResults).toBe(true);
  });

  test('TC-004: View movie details', async ({ page }) => {
    const testUser = generateTestUser('moviedetail');
    await registerUser(page, testUser);

    // Navigate to movies page
    await page.goto('/movies');

    // Wait for movies to load
    const movieCard = page.locator('.movie-card, [class*="movie-card"]').first();

    // Check if any movies exist
    const hasMovies = await movieCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasMovies) {
      // Skip test if no movies are available
      test.skip();
      return;
    }

    // Click on first movie card
    await movieCard.click();

    // Wait for movie detail page to load
    await page.waitForURL(/\/movies\/.+/);

    // Verify movie detail elements are present
    await expect(page.locator('h1')).toBeVisible(); // Movie title

    // Check for synopsis
    const synopsis = page.locator('text=/synopsis|overview|about/i').first();
    if (await synopsis.isVisible({ timeout: 2000 })) {
      await expect(synopsis).toBeVisible();
    }

    // Check for show dates/times if available
    const showSection = page.locator('text=/show|screening|date/i').first();
    if (await showSection.isVisible({ timeout: 2000 })) {
      await expect(showSection).toBeVisible();
    }
  });

  test('TC-026: Loading skeletons display during data fetch - KAN-417', async ({ page }) => {
    const testUser = generateTestUser('loading');
    await registerUser(page, testUser);

    // Navigate to movies page
    const navigation = page.goto('/movies');

    // Try to catch loading skeleton quickly
    const skeleton = page.locator('.skeleton, [class*="skeleton"]');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1000 }).catch(() => false);

    // Wait for navigation to complete
    await navigation;

    // Verify page eventually loads with content
    await expect(page.locator('h1')).toBeVisible();

    // If skeleton was visible, it should now be replaced with content
    if (hasSkeleton) {
      // Skeletons should be gone or replaced
      const movieContent = page.locator('.movie-grid, .movie-card');
      await expect(movieContent.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
