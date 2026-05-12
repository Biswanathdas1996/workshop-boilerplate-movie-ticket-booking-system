import { Page, expect } from '@playwright/test';

export interface UserCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export class AuthHelper {
  constructor(private page: Page) {}

  async register(credentials: UserCredentials): Promise<void> {
    await this.page.goto('/register');

    await this.page.fill('input[type="text"]#fullName', credentials.fullName || 'Test User');
    await this.page.fill('input[type="email"]#email', credentials.email);
    await this.page.fill('input[type="password"]#password', credentials.password);

    await this.page.click('button[type="submit"]');

    // Wait for redirect to movies page after successful registration
    await this.page.waitForURL('**/movies', { timeout: 10000 });
  }

  async login(credentials: UserCredentials): Promise<void> {
    await this.page.goto('/login');

    await this.page.fill('input[type="email"]#email', credentials.email);
    await this.page.fill('input[type="password"]#password', credentials.password);

    await this.page.click('button[type="submit"]');

    // Wait for redirect after successful login
    await this.page.waitForURL('**/movies', { timeout: 10000 });
  }

  async logout(): Promise<void> {
    await this.page.click('button:has-text("Logout")');
    await this.page.waitForURL('**/login');
  }

  async isLoggedIn(): Promise<boolean> {
    const logoutButton = this.page.locator('button:has-text("Logout")');
    return await logoutButton.isVisible();
  }

  async getStoredToken(): Promise<string | null> {
    return await this.page.evaluate(() => localStorage.getItem('token'));
  }
}
