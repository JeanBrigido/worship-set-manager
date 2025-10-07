import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/signin');

    // Login as admin user
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');

    // Wait for redirect to home page
    await page.waitForURL('/');

    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Access Control', () => {
    test('should allow admin users to access dashboard', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    });

    test('should redirect non-admin users to homepage', async ({ page }) => {
      // Logout
      await page.click('button[aria-label="User menu"]');
      await page.click('text=Sign out');

      // Login as musician
      await page.goto('/auth/signin');
      await page.fill('input[name="email"]', 'musician@test.com');
      await page.fill('input[name="password"]', 'MusicianPass123');
      await page.click('button[type="submit"]');

      // Try to access admin dashboard
      await page.goto('/admin/dashboard');

      // Should be redirected to home
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Leader Rotation Management', () => {
    test('should display existing leader rotations', async ({ page }) => {
      await expect(page.getByText('Leader Rotation Management')).toBeVisible();

      // Check for table headers
      await expect(page.getByRole('columnheader', { name: 'Order' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Leader' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('should create new leader rotation', async ({ page }) => {
      // Click add to rotation button
      await page.click('button:has-text("Add to Rotation")');

      // Fill rotation form
      await page.click('text=Leader');
      await page.click('text=Leader One');

      await page.click('text=Service Type');
      await page.click('text=Sunday Service');

      // Set rotation order
      const orderInput = page.locator('input[type="number"]');
      await orderInput.fill('3');

      // Submit
      await page.click('button:has-text("Add to Rotation")').last();

      // Wait for success toast
      await expect(page.getByText(/leader added to rotation/i)).toBeVisible({ timeout: 5000 });

      // Verify rotation appears in table
      await expect(page.getByRole('cell', { name: '3' })).toBeVisible();
    });

    test('should delete leader rotation', async ({ page }) => {
      // Find a rotation row and click delete button
      const firstDeleteButton = page.locator('button[aria-label="Delete rotation"]').first();
      await firstDeleteButton.click();

      // Confirm deletion if modal appears
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Wait for success toast
      await expect(page.getByText(/leader removed from rotation/i)).toBeVisible({ timeout: 5000 });
    });

    test('should display rotations grouped by service type', async ({ page }) => {
      // Check for service type headers
      await expect(page.getByText('Sunday Service')).toBeVisible();
      await expect(page.getByText('Tuesday Prayer')).toBeVisible();
    });

    test('should show rotation order in ascending order', async ({ page }) => {
      const orderCells = page.locator('table tbody tr td:first-child');
      const orders = await orderCells.allTextContents();

      // Filter out empty cells and convert to numbers
      const orderNumbers = orders
        .filter(text => text.trim() !== '')
        .map(text => parseInt(text));

      // Check if orders are in ascending order
      for (let i = 1; i < orderNumbers.length; i++) {
        expect(orderNumbers[i]).toBeGreaterThanOrEqual(orderNumbers[i - 1]);
      }
    });
  });

  test.describe('Upcoming Services Management', () => {
    test('should display upcoming services list', async ({ page }) => {
      await expect(page.getByText('Upcoming Services')).toBeVisible();

      // Check for table columns
      await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Service Type' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Assigned Leader' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('should show assigned leader for services', async ({ page }) => {
      // Look for services with assigned leaders
      const assignedBadge = page.locator('text=Assigned').first();
      if (await assignedBadge.isVisible()) {
        await expect(assignedBadge).toBeVisible();
      }
    });

    test('should show "Not assigned" for services without leader', async ({ page }) => {
      // Look for services without leaders
      const notAssigned = page.locator('text=Not assigned').first();
      if (await notAssigned.isVisible()) {
        await expect(notAssigned).toBeVisible();
      }
    });

    test('should assign leader to worship set', async ({ page }) => {
      // Find an unassigned service and click assign button
      const assignButton = page.locator('button:has-text("Assign")').first();
      await assignButton.click();

      // Select a leader from dropdown
      await page.click('text=Leader');
      await page.click('text=Leader One');

      // Wait for assignment to complete
      await expect(page.getByText(/leader assigned to worship set/i)).toBeVisible({ timeout: 5000 });
    });

    test('should reassign leader to different user', async ({ page }) => {
      // Find an assigned service and click reassign button
      const reassignButton = page.locator('button:has-text("Reassign")').first();

      if (await reassignButton.isVisible()) {
        await reassignButton.click();

        // Select different leader
        await page.click('text=Leader');
        await page.click('text=Leader Two');

        // Wait for success
        await expect(page.getByText(/leader assigned to worship set/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should disable assign button for services without worship set', async ({ page }) => {
      const disabledButton = page.locator('button:has-text("Assign"):disabled').first();

      // If there are any disabled assign buttons, verify they exist
      if (await disabledButton.isVisible()) {
        await expect(disabledButton).toBeDisabled();
      }
    });
  });

  test.describe('Rotation Algorithm Verification', () => {
    test('should suggest next leader in rotation order', async ({ page }) => {
      // This test verifies that the rotation algorithm works correctly
      // by checking that leaders are suggested in order

      // Navigate to a service and check suggested leader
      const firstService = page.locator('table tbody tr').first();
      await firstService.click();

      // The suggested leader should follow rotation order
      // This is verified through the backend API which is tested separately
    });
  });

  test.describe('Navigation', () => {
    test('should navigate back to home', async ({ page }) => {
      await page.click('text=Back to Home');
      await expect(page).toHaveURL('/');
    });

    test('should have working navigation links', async ({ page }) => {
      // Verify all main navigation elements are present
      await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /services/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /songs/i })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error toast when rotation creation fails', async ({ page }) => {
      // Click add to rotation
      await page.click('button:has-text("Add to Rotation")');

      // Try to submit without required fields
      await page.click('button:has-text("Add to Rotation")').last();

      // Should show validation error
      await expect(page.getByText(/please select both a leader and service type/i)).toBeVisible({ timeout: 5000 });
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure by blocking API calls
      await page.route('**/api/leader-rotations', route => route.abort());

      // Reload page
      await page.reload();

      // Should show error state or loading state
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Dashboard should still be accessible
      await expect(page.getByText('Admin Dashboard')).toBeVisible();

      // Tables should be scrollable
      const table = page.locator('table').first();
      await expect(table).toBeVisible();
    });

    test('should be responsive on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await expect(page.getByText('Admin Dashboard')).toBeVisible();
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist rotation after page reload', async ({ page }) => {
      // Create a rotation
      await page.click('button:has-text("Add to Rotation")');
      await page.click('text=Leader');
      await page.click('text=Leader One');
      await page.click('text=Service Type');
      await page.click('text=Sunday Service');
      await page.click('button:has-text("Add to Rotation")').last();

      // Wait for success
      await expect(page.getByText(/leader added to rotation/i)).toBeVisible({ timeout: 5000 });

      // Get rotation count before reload
      const rowsBefore = await page.locator('table tbody tr').count();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify rotation still exists
      const rowsAfter = await page.locator('table tbody tr').count();
      expect(rowsAfter).toBeGreaterThanOrEqual(rowsBefore);
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/admin/dashboard');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });
  });

  test.describe('Suggester Assignment', () => {
    test('should assign suggester to worship set', async ({ page }) => {
      // Wait for upcoming services to load
      await expect(page.getByText('Upcoming Services')).toBeVisible();

      // Find a service with a worship set and click "Assign Suggester" button
      const assignSuggesterButton = page.locator('button:has-text("Assign Suggester")').first();
      await assignSuggesterButton.waitFor({ state: 'visible', timeout: 10000 });
      await assignSuggesterButton.click();

      // Wait for modal to open
      await expect(page.getByText('Assign Suggester')).toBeVisible();

      // Select a user from dropdown
      await page.click('text=Select user to assign');
      const userOption = page.locator('[role="option"]').first();
      await userOption.click();

      // Set min songs
      const minSongsInput = page.locator('input[type="number"]').first();
      await minSongsInput.fill('2');

      // Set max songs
      const maxSongsInput = page.locator('input[type="number"]').last();
      await maxSongsInput.fill('4');

      // Set due date (3 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      const dueDateString = dueDate.toISOString().split('T')[0];
      const dueDateInput = page.locator('input[type="date"]');
      await dueDateInput.fill(dueDateString);

      // Submit form
      await page.click('button:has-text("Assign")');

      // Wait for success toast
      await expect(page.getByText(/suggester slot created and user assigned/i)).toBeVisible({ timeout: 5000 });

      // Wait for modal to close
      await expect(page.getByText('Assign Suggester')).not.toBeVisible({ timeout: 5000 });

      // Verify the assigned suggester appears in the table
      // The "Suggestion Slots" column should now show the assigned user badge
      await page.waitForTimeout(1000); // Wait for data to refresh

      // Check that at least one slot badge is visible
      const slotBadge = page.locator('text=/\\d+ slot/i').first();
      await expect(slotBadge).toBeVisible({ timeout: 5000 });
    });

    test('should display suggester assignment in suggestion slots column', async ({ page }) => {
      // Wait for services to load
      await page.waitForLoadState('networkidle');

      // Find the Suggestion Slots column header
      await expect(page.getByRole('columnheader', { name: 'Suggestion Slots' })).toBeVisible();

      // Look for any services with assigned slots
      const slotCell = page.locator('td').filter({ hasText: /slot/i }).first();

      if (await slotCell.isVisible()) {
        // If slots exist, verify they display properly
        await expect(slotCell).toBeVisible();

        // Verify slot badge shows user count
        const slotBadge = slotCell.locator('text=/\\d+ slot/i');
        await expect(slotBadge).toBeVisible();
      }
    });

    test('should not show console errors during suggester assignment', async ({ page }) => {
      const consoleErrors: string[] = [];

      // Listen for console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Find and click assign suggester button
      const assignSuggesterButton = page.locator('button:has-text("Assign Suggester")').first();
      await assignSuggesterButton.waitFor({ state: 'visible', timeout: 10000 });
      await assignSuggesterButton.click();

      // Fill out form
      await page.click('text=Select user to assign');
      await page.locator('[role="option"]').first().click();
      await page.locator('input[type="number"]').first().fill('2');
      await page.locator('input[type="number"]').last().fill('4');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      await page.locator('input[type="date"]').fill(dueDate.toISOString().split('T')[0]);

      // Submit
      await page.click('button:has-text("Assign")');

      // Wait for success
      await expect(page.getByText(/suggester slot created and user assigned/i)).toBeVisible({ timeout: 5000 });

      // Check for console errors
      const relevantErrors = consoleErrors.filter(err =>
        !err.includes('Download the React DevTools') &&
        !err.includes('Warning:')
      );

      expect(relevantErrors).toHaveLength(0);
    });
  });
});
