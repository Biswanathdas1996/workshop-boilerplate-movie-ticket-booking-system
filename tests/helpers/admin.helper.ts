import { Page, expect } from '@playwright/test';

export class AdminHelper {
  constructor(private page: Page) {}

  async navigateToAdminDashboard(): Promise<void> {
    await this.page.goto('/admin');
    await this.page.waitForSelector('h1:has-text("Admin Dashboard")', { timeout: 10000 });
  }

  async switchToTab(tabName: string): Promise<void> {
    await this.page.click(`button:has-text("${tabName}")`);
    await this.page.waitForTimeout(500);
  }

  async verifyDashboardStats(): Promise<void> {
    // Verify stat cards are visible
    const statCards = this.page.locator('.stat-card');
    await expect(statCards).toHaveCount(6); // Total users, movies, theaters, bookings, revenue, recent bookings
  }

  async getTotalUsers(): Promise<number> {
    const usersStat = this.page.locator('.stat-card:has-text("Total Users") .stat-value');
    const text = await usersStat.textContent();
    return parseInt(text || '0', 10);
  }

  async getTotalMovies(): Promise<number> {
    const moviesStat = this.page.locator('.stat-card:has-text("Active Movies") .stat-value');
    const text = await moviesStat.textContent();
    return parseInt(text || '0', 10);
  }

  async getTotalRevenue(): Promise<number> {
    const revenueStat = this.page.locator('.stat-card:has-text("Total Revenue") .stat-value');
    const text = await revenueStat.textContent();
    const match = text?.match(/\$([\d,.]+)/);
    return match ? parseFloat(match[1].replace(',', '')) : 0;
  }

  async getAllUsers(): Promise<number> {
    await this.switchToTab('Users');
    await this.page.waitForSelector('table.data-table', { timeout: 10000 });
    const rows = this.page.locator('table.data-table tbody tr');
    return await rows.count();
  }

  async activateUser(userEmail: string): Promise<void> {
    await this.switchToTab('Users');
    const userRow = this.page.locator(`tr:has-text("${userEmail}")`);
    await userRow.locator('button:has-text("Activate")').click();
    await this.page.waitForTimeout(500);
  }

  async deactivateUser(userEmail: string): Promise<void> {
    await this.switchToTab('Users');
    const userRow = this.page.locator(`tr:has-text("${userEmail}")`);
    await userRow.locator('button:has-text("Deactivate")').click();
    await this.page.waitForTimeout(500);
  }

  async deleteMovie(movieTitle: string): Promise<void> {
    await this.switchToTab('Movies');
    await this.page.waitForSelector('table.data-table', { timeout: 10000 });

    const movieRow = this.page.locator(`tr:has-text("${movieTitle}")`);
    await movieRow.locator('button:has-text("Delete")').click();

    // Handle confirmation dialog
    this.page.on('dialog', dialog => dialog.accept());

    await this.page.waitForTimeout(1000);
  }

  async verifyPopularMovies(): Promise<void> {
    await this.switchToTab('Overview');
    const popularMoviesSection = this.page.locator('h2:has-text("Popular Movies")');
    await expect(popularMoviesSection).toBeVisible();

    const popularMoviesTable = this.page.locator('table.data-table').first();
    await expect(popularMoviesTable).toBeVisible();
  }
}
