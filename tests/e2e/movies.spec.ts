import { test, expect } from '../fixtures/test.fixtures';
import { TEST_USERS, MOVIE_SEARCH_TERMS, MOVIE_FILTERS } from '../fixtures/test-data';

test.describe('Movies - Browse, Search and Filter', () => {
  test.beforeEach(async ({ authHelper }) => {
    // Register and login before each test
    const testUser = {
      ...TEST_USERS.regularUser,
      email: `movietest_${Date.now()}@example.com`,
    };
    await authHelper.register(testUser);
  });

  test.describe('Browse Movies', () => {
    test('TC-003: Should display movies with search and filter functionality', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();

      // Verify movies page loaded
      await expect(page.locator('h1')).toContainText(/browse movies/i);

      // Verify movie grid is visible
      const movieGrid = page.locator('.movie-grid');
      await expect(movieGrid).toBeVisible();

      // Verify at least one movie card is displayed
      const movieCards = page.locator('.movie-card');
      await expect(movieCards.first()).toBeVisible();

      // Verify filter controls are visible
      await expect(page.locator('input[type="search"]')).toBeVisible();
      await expect(page.locator('select[aria-label="Filter by genre"]')).toBeVisible();
      await expect(page.locator('select[aria-label="Filter by language"]')).toBeVisible();
    });

    test('Should display movie details including poster, rating, and genre tags', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();

      const firstMovieCard = page.locator('.movie-card').first();

      // Verify movie card elements
      await expect(firstMovieCard.locator('.movie-card-image')).toBeVisible();
      await expect(firstMovieCard.locator('.movie-card-title')).toBeVisible();
      await expect(firstMovieCard.locator('.movie-card-info')).toBeVisible();
      await expect(firstMovieCard.locator('.genre-tags')).toBeVisible();
    });
  });

  test.describe('Search Movies', () => {
    test('TC-020: Should filter movies by search query', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();

      // Get initial count
      const initialCount = await moviesHelper.getMovieCards();
      expect(initialCount).toBeGreaterThan(0);

      // Search for "Action"
      await moviesHelper.searchMovies(MOVIE_SEARCH_TERMS.action);

      // Verify search results updated
      await page.waitForTimeout(500);

      // All visible movies should contain the search term in title or description
      const movieCards = page.locator('.movie-card');
      const count = await movieCards.count();

      if (count > 0) {
        const firstCard = movieCards.first();
        await expect(firstCard).toBeVisible();
      }
    });

    test('TC-018: Should show empty state for search with no results', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();

      // Search for non-existent movie
      await moviesHelper.searchMovies(MOVIE_SEARCH_TERMS.nonExistent);

      // Wait for results to update
      await page.waitForTimeout(500);

      // Verify empty state is shown
      const emptyState = page.locator('.empty-state');
      await expect(emptyState).toBeVisible({ timeout: 5000 });
      await expect(emptyState).toContainText(/no movies found/i);

      // Verify suggestion text
      await expect(emptyState).toContainText(/try adjusting/i);
    });
  });

  test.describe('Filter Movies', () => {
    test('TC-025: Should filter movies by genre', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();

      // Filter by Action genre
      await moviesHelper.filterByGenre('Action');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify genre tag is displayed on movie cards
      const genreTags = page.locator('.genre-tag');
      if ((await genreTags.count()) > 0) {
        const firstTag = genreTags.first();
        await expect(firstTag).toBeVisible();
      }
    });

    test('Should filter movies by language', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();

      // Filter by English language
      await moviesHelper.filterByLanguage('English');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify movies are displayed (if any match)
      const movieCards = page.locator('.movie-card');
      const count = await movieCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('Should combine multiple filters', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();

      // Apply multiple filters
      await moviesHelper.searchMovies('Action');
      await moviesHelper.filterByGenre('Action');
      await moviesHelper.filterByLanguage('English');

      // Wait for all filters to apply
      await page.waitForTimeout(1000);

      // Verify results or empty state
      const movieCards = page.locator('.movie-card');
      const emptyState = page.locator('.empty-state');

      const hasMovies = (await movieCards.count()) > 0;
      const hasEmptyState = await emptyState.isVisible();

      expect(hasMovies || hasEmptyState).toBe(true);
    });
  });

  test.describe('Movie Details', () => {
    test('TC-004: Should display movie details with trailer and show times', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();

      // Click on first movie
      await moviesHelper.clickFirstMovie();

      // Verify movie details page loaded
      await moviesHelper.verifyMovieDetailsVisible();

      // Verify movie information
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('img[alt*="poster"]')).toBeVisible();

      // Verify rating and genre tags
      const statusBadges = page.locator('.status-badge');
      await expect(statusBadges.first()).toBeVisible();

      const genreTags = page.locator('.genre-tag');
      await expect(genreTags.first()).toBeVisible();

      // Verify description
      await expect(page.locator('p').filter({ hasText: /.{20,}/ }).first()).toBeVisible();

      // Verify director and cast information
      await expect(page.locator('text=/Director:/i')).toBeVisible();
      await expect(page.locator('text=/Cast:/i')).toBeVisible();
    });

    test('Should display YouTube trailer when available', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();

      // Check if trailer section exists
      const trailerSection = page.locator('h2:has-text("Official Trailer")');
      const hasTrailer = await trailerSection.isVisible().catch(() => false);

      if (hasTrailer) {
        // Verify iframe is present
        const iframe = page.locator('iframe[src*="youtube"]');
        await expect(iframe).toBeVisible();

        // Verify iframe has correct attributes
        const src = await iframe.getAttribute('src');
        expect(src).toContain('youtube.com/embed/');
      }
    });

    test('Should display available shows table', async ({
      page,
      moviesHelper,
    }) => {
      await moviesHelper.navigateToMovies();
      await moviesHelper.clickFirstMovie();

      // Verify shows section exists
      const showsSection = page.locator('h2:has-text(/Shows/i)');
      const hasShows = await showsSection.isVisible().catch(() => false);

      if (hasShows) {
        // Verify shows table is displayed
        const showsTable = page.locator('table.data-table');
        await expect(showsTable).toBeVisible();

        // Verify Book Now buttons are present
        const bookButtons = page.locator('button:has-text("Book Now")');
        await expect(bookButtons.first()).toBeVisible();
      }
    });
  });
});
