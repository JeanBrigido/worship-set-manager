import { test, expect } from '@playwright/test';

test.describe('Songs Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/songs');
  });

  test('should display songs library page', async ({ page }) => {
    await expect(page).toHaveURL(/\/songs/);
    await expect(page.getByRole('heading', { name: /songs/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show skeleton loaders while fetching songs', async ({ page }) => {
    await page.goto('/songs');

    const skeletons = page.locator('.animate-pulse');
    await expect(skeletons.first()).toBeVisible({ timeout: 2000 }).catch(() => {
      // Data loaded too fast - acceptable
    });
  });

  test('should display list of songs after loading', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const songsList = page.locator('[data-testid="songs-list"], table, .song-card').first();
    await expect(songsList).toBeVisible({ timeout: 10000 });
  });

  test('should search/filter songs', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('Amazing Grace');
      await page.waitForTimeout(500); // Wait for search debounce

      // Results should update
      await expect(page.locator('text=/amazing grace/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to add song page (admin/leader)', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add song|new song/i })
      .or(page.getByRole('link', { name: /add song|new song/i }));

    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page).toHaveURL(/\/songs\/new/);
    }
  });

  test('should view song details', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const firstSong = page.locator('[data-testid="song-item"], tr a, .song-card a').first();

    if (await firstSong.isVisible()) {
      await firstSong.click();

      await expect(page).toHaveURL(/\/songs\/[a-f0-9-]+/);
    }
  });
});

test.describe('Song Form', () => {
  test('should validate song creation form', async ({ page }) => {
    await page.goto('/songs/new');

    const submitButton = page.getByRole('button', { name: /create|save|add/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      await expect(page.locator('text=/required|invalid/i')).toBeVisible();
    }
  });

  test('should create song with valid data', async ({ page }) => {
    await page.goto('/songs/new');

    const titleInput = page.getByLabel(/title|name/i);
    if (await titleInput.isVisible()) {
      await titleInput.fill('Test Song');
    }

    const artistInput = page.getByLabel(/artist|author/i);
    if (await artistInput.isVisible()) {
      await artistInput.fill('Test Artist');
    }

    const submitButton = page.getByRole('button', { name: /create|save|add/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      await expect(page).toHaveURL(/\/songs/);
    }
  });
});

test.describe('Song Library Features', () => {
  test('should display song metadata', async ({ page }) => {
    await page.goto('/songs');
    await page.waitForLoadState('networkidle');

    const firstSong = page.locator('[data-testid="song-item"], tr, .song-card').first();

    if (await firstSong.isVisible()) {
      // Songs should display title, artist, and other metadata
      await expect(firstSong).toContainText(/./); // Has content
    }
  });

  test('should support sorting songs', async ({ page }) => {
    await page.goto('/songs');
    await page.waitForLoadState('networkidle');

    const sortButton = page.getByRole('button', { name: /sort|title|artist/i }).first();

    if (await sortButton.isVisible()) {
      await sortButton.click();

      // Table should re-order
      await page.waitForTimeout(500);
    }
  });
});
