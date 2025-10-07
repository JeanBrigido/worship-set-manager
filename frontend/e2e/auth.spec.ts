import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display Sign In and Sign Up buttons on homepage', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign Up' }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('should display login form on sign in page', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check for email and password fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation error for empty login form', async ({ page }) => {
    await page.goto('/auth/signin');

    await page.getByRole('button', { name: /sign in/i }).click();

    // Check for validation messages
    await expect(page.locator('text=/required|invalid/i')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');

    await page.getByLabel(/email/i).fill('invalid@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Check for error message
    await expect(page.locator('text=/invalid|error|failed/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display signup form on sign up page', async ({ page }) => {
    await page.goto('/auth/signup');

    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('should validate password minimum length on signup', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('short');
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show validation error for short password
    await expect(page.locator('text=/8 characters|too short/i')).toBeVisible();
  });

  test('should validate email format on signup', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/password/i).fill('ValidPassword123');
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show validation error for invalid email
    await expect(page.locator('text=/valid email|invalid email/i')).toBeVisible();
  });
});

test.describe('Rate Limiting', () => {
  test('should block excessive login attempts', async ({ page }) => {
    await page.goto('/auth/signin');

    // Attempt login 6 times with invalid credentials
    for (let i = 0; i < 6; i++) {
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(500);
    }

    // 6th attempt should be rate limited
    await expect(page.locator('text=/too many|rate limit/i')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Accessibility', () => {
  test('should have skip to content link', async ({ page }) => {
    await page.goto('/');

    // Focus the skip link (it should be the first focusable element)
    await page.keyboard.press('Tab');

    const skipLink = page.getByText('Skip to main content');
    await expect(skipLink).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through focusable elements
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // Logo/home link
    await page.keyboard.press('Tab'); // Next focusable element

    // Ensure focus is visible
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
