import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow user to login with valid credentials', async ({ page }) => {
    // Navigate to login
    await page.click('text=Login');
    
    // Fill in login form
    await page.fill('input[name="email"]', 'admin@ulasis.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Should show user menu
    await expect(page.locator('text=Admin User')).toBeVisible();
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    await page.click('text=Login');
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should allow user to register new account', async ({ page }) => {
    await page.click('text=Sign Up');
    
    // Fill in registration form
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="businessName"]', 'Test Business');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=Registration successful')).toBeVisible();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should validate registration form fields', async ({ page }) => {
    await page.click('text=Sign Up');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
  });

  test('should allow password reset', async ({ page }) => {
    await page.click('text=Login');
    await page.click('text=Forgot Password?');
    
    await page.fill('input[name="email"]', 'admin@ulasis.com');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@ulasis.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should display dashboard with analytics', async ({ page }) => {
    // Should show main dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('text=Total Responses')).toBeVisible();
    await expect(page.locator('text=Average Rating')).toBeVisible();
    await expect(page.locator('text=Response Rate')).toBeVisible();
  });

  test('should navigate between different sections', async ({ page }) => {
    // Navigate to questionnaires
    await page.click('text=Questionnaires');
    await expect(page).toHaveURL(/questionnaires/);
    
    // Navigate to analytics
    await page.click('text=Analytics');
    await expect(page).toHaveURL(/analytics/);
    
    // Navigate to settings
    await page.click('text=Settings');
    await expect(page).toHaveURL(/settings/);
  });

  test('should show responsive navigation on mobile', async ({ page }) => {
    // Simulate mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Should show hamburger menu
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Should show navigation items
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Questionnaires')).toBeVisible();
    await expect(page.locator('text=Analytics')).toBeVisible();
  });
});

test.describe('Questionnaire Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@ulasis.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should create new questionnaire', async ({ page }) => {
    await page.click('text=Questionnaires');
    await page.click('text=Create Questionnaire');
    
    // Fill in questionnaire details
    await page.fill('input[name="title"]', 'Customer Satisfaction Survey');
    await page.fill('textarea[name="description"]', 'A survey to measure customer satisfaction');
    
    // Add questions
    await page.click('text=Add Question');
    await page.fill('input[name="questionText"]', 'How satisfied are you with our service?');
    await page.selectOption('select[name="questionType"]', 'rating_5');
    
    // Save questionnaire
    await page.click('text=Save Questionnaire');
    
    // Should show success message
    await expect(page.locator('text=Questionnaire created successfully')).toBeVisible();
    
    // Should redirect to questionnaire list
    await expect(page).toHaveURL(/questionnaires/);
    
    // Should show new questionnaire in list
    await expect(page.locator('text=Customer Satisfaction Survey')).toBeVisible();
  });

  test('should edit existing questionnaire', async ({ page }) => {
    await page.click('text=Questionnaires');
    
    // Click edit button on first questionnaire
    await page.click('[data-testid="edit-questionnaire"]:first-child');
    
    // Edit title
    await page.fill('input[name="title"]', 'Updated Survey Title');
    
    // Save changes
    await page.click('text=Save Changes');
    
    // Should show success message
    await expect(page.locator('text=Questionnaire updated successfully')).toBeVisible();
    
    // Should show updated title in list
    await expect(page.locator('text=Updated Survey Title')).toBeVisible();
  });

  test('should delete questionnaire', async ({ page }) => {
    await page.click('text=Questionnaires');
    
    // Click delete button on first questionnaire
    await page.click('[data-testid="delete-questionnaire"]:first-child');
    
    // Confirm deletion
    await page.click('text=Delete');
    
    // Should show success message
    await expect(page.locator('text=Questionnaire deleted successfully')).toBeVisible();
    
    // Questionnaire should be removed from list
    const questionnaireCount = await page.locator('[data-testid="questionnaire-item"]').count();
    expect(questionnaireCount).toBe(0);
  });

  test('should validate questionnaire form', async ({ page }) => {
    await page.click('text=Questionnaires');
    await page.click('text=Create Questionnaire');
    
    // Try to save without title
    await page.click('text=Save Questionnaire');
    
    // Should show validation error
    await expect(page.locator('text=Title is required')).toBeVisible();
    
    // Fill in title but no questions
    await page.fill('input[name="title"]', 'Test Survey');
    await page.click('text=Save Questionnaire');
    
    // Should show validation error
    await expect(page.locator('text=At least one question is required')).toBeVisible();
  });
});

test.describe('Analytics and Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@ulasis.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should display analytics dashboard', async ({ page }) => {
    await page.click('text=Analytics');
    
    // Should show analytics components
    await expect(page.locator('text=Analytics Overview')).toBeVisible();
    await expect(page.locator('[data-testid="bubble-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-cards"]')).toBeVisible();
  });

  test('should filter analytics by date range', async ({ page }) => {
    await page.click('text=Analytics');
    
    // Select date range
    await page.click('[data-testid="date-range-selector"]');
    await page.click('text=Last 30 Days');
    
    // Should update analytics data
    await expect(page.locator('[data-testid="analytics-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-loading"]')).not.toBeVisible();
    
    // Should show filtered data
    await expect(page.locator('text=Last 30 Days')).toBeVisible();
  });

  test('should export analytics data', async ({ page }) => {
    await page.click('text=Analytics');
    
    // Click export button
    await page.click('[data-testid="export-analytics"]');
    await page.click('text=Export as CSV');
    
    // Should trigger download
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toMatch(/analytics.*\.csv$/);
  });

  test('should display real-time updates', async ({ page }) => {
    await page.click('text=Analytics');
    
    // Mock real-time data update
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: { totalResponses: 150 }
      }));
    });
    
    // Should show updated data
    await expect(page.locator('text=150')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network offline
    await page.context().setOffline(true);
    
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@ulasis.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show network error message
    await expect(page.locator('text=Network error')).toBeVisible();
    
    // Should show retry option
    await expect(page.locator('text=Retry')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/v1/auth/login', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@ulasis.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Something went wrong')).toBeVisible();
  });

  test('should handle 404 errors', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Should show 404 page
    await expect(page.locator('text=Page not found')).toBeVisible();
    await expect(page.locator('text=Go back home')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Should focus on first interactive element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'A']).toContain(focusedElement);
    
    // Should be able to navigate through all interactive elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper ARIA labels
    await expect(page.locator('[aria-label]')).toHaveCount({ min: 1 });
    
    // Check for proper heading structure
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);
    
    // Check for alt text on images
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // This would require a color contrast checking library
    // For now, just ensure high contrast mode works
    await page.click('[data-testid="high-contrast-toggle"]');
    
    // Should apply high contrast styles
    const hasHighContrast = await page.evaluate(() => {
      return document.body.classList.contains('high-contrast');
    });
    expect(hasHighContrast).toBe(true);
  });
});

test.describe('Performance', () => {
  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should not have layout shifts', async ({ page }) => {
    await page.goto('/');
    
    // Monitor for layout shifts
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => resolve(clsValue), 2000);
      });
    });
    
    // Should have CLS less than 0.1
    expect(cls).toBeLessThan(0.1);
  });
});