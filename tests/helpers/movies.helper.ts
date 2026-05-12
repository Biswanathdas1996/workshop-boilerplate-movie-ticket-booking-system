import { Page, expect } from '@playwright/test';

export class MoviesHelper {
  constructor(private page: Page) {}

  async navigateToMovies(): Promise<void> {
    await this.page.goto('/movies');
    await this.page.waitForSelector('.movie-grid', { timeout: 10000 });
  }

  async searchMovies(query: string): Promise<void> {
    const searchInput = this.page.locator('input[type="search"]');
    await searchInput.fill(query);
    // Wait for search results to update
    await this.page.waitForTimeout(500);
  }

  async filterByGenre(genre: string): Promise<void> {
    await this.page.selectOption('select[aria-label="Filter by genre"]', genre);
    await this.page.waitForTimeout(500);
  }

  async filterByLanguage(language: string): Promise<void> {
    await this.page.selectOption('select[aria-label="Filter by language"]', language);
    await this.page.waitForTimeout(500);
  }

  async getMovieCards(): Promise<number> {
    const cards = this.page.locator('.movie-card');
    return await cards.count();
  }

  async clickMovieByTitle(title: string): Promise<void> {
    const movieCard = this.page.locator('.movie-card', { hasText: title }).first();
    await movieCard.click();
    await this.page.waitForURL('**/movies/*');
  }

  async clickFirstMovie(): Promise<void> {
    const firstMovie = this.page.locator('.movie-card').first();
    await firstMovie.click();
    await this.page.waitForURL('**/movies/*');
  }

  async verifyMovieDetailsVisible(): Promise<void> {
    await expect(this.page.locator('h1')).toBeVisible();
    await expect(this.page.locator('img[alt*="poster"]')).toBeVisible();
  }
}
