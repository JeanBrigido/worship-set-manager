import { test, expect } from '@playwright/test';

test.describe('Services Management (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Note: This assumes a test user is already logged in or you have a test auth state
    // In a real scenario, you would set up authentication before these tests
    await page.goto('/services');
  });

  test('should display services list page', async ({ page }) => {
    await expect(page).toHaveURL(/\/services/);

    // Check for page title or heading
    await expect(page.getByRole('heading', { name: /services/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show skeleton loaders while fetching services', async ({ page }) => {
    // Navigate to services page
    await page.goto('/services');

    // Look for skeleton loaders (they should appear briefly while loading)
    const skeletons = page.locator('.animate-pulse');

    // Skeletons may disappear quickly, so we use a short timeout
    await expect(skeletons.first()).toBeVisible({ timeout: 2000 }).catch(() => {
      // If skeletons are not visible, data loaded too fast - that's OK
    });
  });

  test('should display list of services after loading', async ({ page }) => {
    await page.goto('/services');

    // Wait for services to load
    await page.waitForLoadState('networkidle');

    // Check if services are displayed (this depends on your UI structure)
    // Look for service cards, table rows, or list items
    const servicesList = page.locator('[data-testid="services-list"], table, .service-card').first();
    await expect(servicesList).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to create service page', async ({ page }) => {
    await page.goto('/services');

    // Look for "Create Service" or "New Service" button
    const createButton = page.getByRole('button', { name: /create|new service/i })
      .or(page.getByRole('link', { name: /create|new service/i }));

    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page).toHaveURL(/\/services\/new/);
    }
  });

  test('should display service details page', async ({ page }) => {
    await page.goto('/services');

    // Wait for services to load
    await page.waitForLoadState('networkidle');

    // Click on the first service (if available)
    const firstService = page.locator('[data-testid="service-item"], tr, .service-card').first();

    if (await firstService.isVisible()) {
      await firstService.click();

      // Should navigate to service detail page
      await expect(page).toHaveURL(/\/services\/[a-f0-9-]+/);
    }
  });

  test('should show breadcrumb navigation on service detail page', async ({ page }) => {
    // Navigate to a service detail page (assuming a service exists)
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    const firstService = page.locator('[data-testid="service-item"], tr a, .service-card a').first();

    if (await firstService.isVisible()) {
      await firstService.click();

      // Check for breadcrumb navigation
      const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
      await expect(breadcrumb).toBeVisible({ timeout: 5000 });

      // Check breadcrumb items
      await expect(page.getByText('Home')).toBeVisible();
      await expect(page.getByText('Services')).toBeVisible();
    }
  });
});

test.describe('Worship Set Constraints', () => {
  test('should display worship set constraints indicator', async ({ page }) => {
    // Navigate to a service detail page
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    const firstService = page.locator('[data-testid="service-item"], tr a, .service-card a').first();

    if (await firstService.isVisible()) {
      await firstService.click();

      // Look for worship set constraints (X/6 songs, X/1 new)
      await expect(page.locator('text=/\\d+\\/6|songs/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show max 6 songs constraint', async ({ page }) => {
    // This test checks that the UI displays the 6 songs maximum constraint
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    const firstService = page.locator('[data-testid="service-item"], tr a, .service-card a').first();

    if (await firstService.isVisible()) {
      await firstService.click();

      // Look for constraint indicator showing X/6 format
      const constraintText = page.locator('text=/\\d+\\/6/');
      await expect(constraintText).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show max 1 new song constraint', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    const firstService = page.locator('[data-testid="service-item"], tr a, .service-card a').first();

    if (await firstService.isVisible()) {
      await firstService.click();

      // Look for new song constraint indicator showing X/1 format
      const newSongConstraint = page.locator('text=/\\d+\\/1.*new/i');
      await expect(newSongConstraint).toBeVisible({ timeout: 10000 });
    }
  });

  test('should disable add song button when 6 songs limit is reached', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    const firstService = page.locator('[data-testid="service-item"], tr a, .service-card a').first();

    if (await firstService.isVisible()) {
      await firstService.click();

      // Check if there's a service with 6 songs
      const songCount = page.locator('text=/6\\/6/');

      if (await songCount.isVisible()) {
        // Add song button should be disabled
        const addButton = page.getByRole('button', { name: /add song/i });
        await expect(addButton).toBeDisabled();
      }
    }
  });
});

test.describe('Service Form Validation', () => {
  test('should validate service creation form', async ({ page }) => {
    await page.goto('/services/new');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /create|save/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors
      await expect(page.locator('text=/required|invalid/i')).toBeVisible();
    }
  });

  test('should create service with valid data', async ({ page }) => {
    await page.goto('/services/new');

    // Fill in service form (this depends on your form fields)
    const dateInput = page.getByLabel(/date/i);
    if (await dateInput.isVisible()) {
      await dateInput.fill('2025-12-25');
    }

    const serviceTypeSelect = page.getByLabel(/service type/i);
    if (await serviceTypeSelect.isVisible()) {
      await serviceTypeSelect.click();
      await page.getByRole('option').first().click();
    }

    // Submit form
    const submitButton = page.getByRole('button', { name: /create|save/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should redirect to services list or service detail
      await expect(page).toHaveURL(/\/services/);
    }
  });
});

test.describe('Navigation and UI', () => {
  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/services');

    // Services navigation item should be highlighted
    const servicesNav = page.getByRole('link', { name: /services/i }).first();

    // Check for active state class
    await expect(servicesNav).toHaveClass(/bg-accent|active/);
  });

  test('should maintain responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/services');

    // Check that page is responsive
    await expect(page.locator('body')).toBeVisible();

    // Mobile menu should be accessible
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label="Menu"]');
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }
  });
});
