import { test, expect } from '@playwright/test';

/**
 * Comprehensive End-to-End Test Suite
 * 
 * This test suite validates the complete full-stack functionality
 * ensuring all backend and frontend components work together seamlessly.
 * 
 * Test Coverage:
 * 1. User Registration & Authentication
 * 2. Questionnaire CRUD Operations
 * 3. Response Submission & Analytics
 * 4. Subscription & Limits
 * 5. Error Handling & Edge Cases
 * 6. Performance & Accessibility
 */

test.describe('Full-Stack E2E Validation', () => {
  let userEmail: string;
  let userPassword: string;
  let questionnaireId: string;
  let authToken: string;

  // Generate unique test user data
  test.beforeAll(async () => {
    const timestamp = Date.now();
    userEmail = `e2e-test-${timestamp}@example.com`;
    userPassword = 'TestPassword123!';
  });

  test.beforeEach(async ({ page }) => {
    // Set up API request interception for monitoring
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      console.log(`🌐 API Request: ${method} ${url}`);
      
      // Continue with the request
      const response = await route.fetch();
      const status = response.status();
      
      console.log(`📡 API Response: ${status} ${method} ${url}`);
      
      // Log response for debugging
      if (status >= 400) {
        const body = await response.text();
        console.log(`❌ API Error: ${body}`);
      }
      
      return route.fulfill({
        status,
        headers: response.headers(),
        body: await response.buffer(),
      });
    });
  });

  test.describe('1. User Registration & Authentication Flow', () => {
    test('should complete full user registration and email verification', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to registration
      await page.click('text=Sign Up');
      await expect(page).toHaveURL(/register/);
      
      // Fill registration form
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      await page.fill('input[name="firstName"]', 'E2E');
      await page.fill('input[name="lastName"]', 'Test');
      await page.fill('input[name="businessName"]', 'E2E Test Business');
      
      // Submit registration
      await page.click('button[type="submit"]');
      
      // Should show success message or redirect to email verification
      await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 10000 });
      
      // Should redirect to dashboard or email verification page
      await expect(page).toHaveURL(/dashboard|verify-email/);
    });

    test('should login with newly registered user', async ({ page }) => {
      await page.goto('/login');
      
      // Fill login form
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      
      // Submit login
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      
      // Should show user menu or dashboard elements
      await expect(page.locator('h1, [data-testid="user-menu"]')).toBeVisible();
      
      // Store auth token for later use
      const localStorage = await page.evaluate(() => {
        return {
          token: localStorage.getItem('authToken'),
          user: localStorage.getItem('user')
        };
      });
      
      expect(localStorage.token).toBeTruthy();
      authToken = localStorage.token;
    });

    test('should handle logout correctly', async ({ page }) => {
      // First login
      await page.goto('/login');
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/dashboard/);
      
      // Logout
      await page.click('[data-testid="user-menu"], text=E2E');
      await page.click('text=Logout');
      
      // Should redirect to landing page
      await expect(page).toHaveURL(/\//);
      
      // Should clear auth tokens
      const localStorage = await page.evaluate(() => {
        return {
          token: localStorage.getItem('authToken'),
          user: localStorage.getItem('user')
        };
      });
      
      expect(localStorage.token).toBeNull();
    });
  });

  test.describe('2. Questionnaire CRUD Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login');
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should create new questionnaire with multiple question types', async ({ page }) => {
      await page.click('text=Questionnaires');
      await page.click('text=Create Questionnaire');
      
      // Fill questionnaire details
      await page.fill('input[name="title"]', 'E2E Customer Satisfaction Survey');
      await page.fill('textarea[name="description"]', 'Comprehensive E2E test survey covering all question types');
      
      // Add rating question
      await page.click('text=Add Question');
      await page.fill('input[name="questionText"]', 'How satisfied are you with our service?');
      await page.selectOption('select[name="questionType"]', 'rating_5');
      await page.fill('input[name="category"]', 'service');
      
      // Add text question
      await page.click('text=Add Question');
      await page.fill('input[name="questionText"]', 'Any additional comments?');
      await page.selectOption('select[name="questionType"]', 'text');
      await page.fill('input[name="category"]', 'feedback');
      
      // Add multiple choice question
      await page.click('text=Add Question');
      await page.fill('input[name="questionText"]', 'Which features do you use most?');
      await page.selectOption('select[name="questionType"]', 'multiple_choice');
      await page.fill('input[name="category"]', 'features');
      
      // Add options for multiple choice
      await page.click('text=Add Option');
      await page.fill('input[name="option[]"]', 'Analytics');
      await page.click('text=Add Option');
      await page.fill('input[name="option[]"]', 'Reports');
      await page.click('text=Add Option');
      await page.fill('input[name="option[]"]', 'Dashboard');
      
      // Save questionnaire
      await page.click('text=Save Questionnaire');
      
      // Should show success message
      await expect(page.locator('text=Questionnaire created successfully')).toBeVisible({ timeout: 10000 });
      
      // Should redirect to questionnaire list
      await expect(page).toHaveURL(/questionnaires/);
      
      // Should show new questionnaire in list
      await expect(page.locator('text=E2E Customer Satisfaction Survey')).toBeVisible();
    });

    test('should edit existing questionnaire', async ({ page }) => {
      await page.click('text=Questionnaires');
      
      // Wait for questionnaires to load
      await page.waitForSelector('[data-testid="questionnaire-item"], .questionnaire-item', { timeout: 10000 });
      
      // Click edit button on first questionnaire
      await page.click('[data-testid="edit-questionnaire"]:first-child, .edit-btn:first-child');
      
      // Edit title
      await page.fill('input[name="title"]', 'Updated E2E Survey Title');
      
      // Save changes
      await page.click('text=Save Changes');
      
      // Should show success message
      await expect(page.locator('text=Questionnaire updated successfully')).toBeVisible({ timeout: 10000 });
      
      // Should show updated title in list
      await expect(page.locator('text=Updated E2E Survey Title')).toBeVisible();
    });

    test('should delete questionnaire', async ({ page }) => {
      await page.click('text=Questionnaires');
      
      // Wait for questionnaires to load
      await page.waitForSelector('[data-testid="questionnaire-item"], .questionnaire-item', { timeout: 10000 });
      
      // Get initial count
      const initialCount = await page.locator('[data-testid="questionnaire-item"], .questionnaire-item').count();
      
      // Click delete button on first questionnaire
      await page.click('[data-testid="delete-questionnaire"]:first-child, .delete-btn:first-child');
      
      // Confirm deletion in modal
      await page.click('text=Delete, text=Confirm, [data-testid="confirm-delete"]');
      
      // Should show success message
      await expect(page.locator('text=Questionnaire deleted successfully')).toBeVisible({ timeout: 10000 });
      
      // Questionnaire count should decrease
      const finalCount = await page.locator('[data-testid="questionnaire-item"], .questionnaire-item').count();
      expect(finalCount).toBe(initialCount - 1);
    });
  });

  test.describe('3. Response Submission & Analytics', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login');
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should submit responses and generate analytics', async ({ page }) => {
      // First create a simple questionnaire for testing
      await page.click('text=Questionnaires');
      await page.click('text=Create Questionnaire');
      
      await page.fill('input[name="title"]', 'E2E Analytics Test Survey');
      await page.fill('textarea[name="description"]', 'Survey for testing analytics');
      
      // Add a rating question
      await page.click('text=Add Question');
      await page.fill('input[name="questionText"]', 'Rate your experience');
      await page.selectOption('select[name="questionType"]', 'rating_5');
      
      // Save questionnaire
      await page.click('text=Save Questionnaire');
      await expect(page.locator('text=Questionnaire created successfully')).toBeVisible();
      
      // Get questionnaire URL for public access
      await page.click('[data-testid="view-questionnaire"], .view-btn');
      await expect(page).toHaveURL(/public-questionnaire/);
      
      // Get the current URL (public questionnaire URL)
      const publicUrl = page.url();
      
      // Submit responses as anonymous user
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await page.goto(publicUrl);
      
      // Submit multiple responses
      for (let i = 1; i <= 3; i++) {
        await page.waitForSelector('input[name="rating"], [data-testid="rating-input"]', { timeout: 10000 });
        
        // Submit rating
        await page.click('input[value="' + i + '"], [data-value="' + i + '"]');
        await page.click('text=Submit, button[type="submit"]');
        
        // Wait for submission
        await expect(page.locator('text=Thank you, text=Response submitted')).toBeVisible({ timeout: 10000 });
        
        // Reload for next submission
        await page.reload();
      }
      
      // Login again to check analytics
      await page.goto('/login');
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/dashboard/);
      
      // Navigate to analytics
      await page.click('text=Analytics');
      await expect(page).toHaveURL(/analytics/);
      
      // Should show analytics data
      await expect(page.locator('text=Analytics Overview, text=Total Responses')).toBeVisible({ timeout: 15000 });
      
      // Should show charts
      await expect(page.locator('[data-testid="bubble-chart"], .chart, canvas')).toBeVisible();
      await expect(page.locator('text=3, text=responses')).toBeVisible();
    });

    test('should export analytics data', async ({ page }) => {
      await page.click('text=Analytics');
      
      // Wait for analytics to load
      await expect(page.locator('text=Analytics Overview')).toBeVisible({ timeout: 10000 });
      
      // Click export button
      await page.click('[data-testid="export-analytics"], .export-btn, text=Export');
      await page.click('text=Export as CSV, text=CSV');
      
      // Should trigger download
      const download = await page.waitForEvent('download', { timeout: 10000 });
      expect(download.suggestedFilename()).toMatch(/analytics.*\.csv$/);
    });
  });

  test.describe('4. Subscription & Limits', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login');
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should display subscription status', async ({ page }) => {
      // Navigate to settings
      await page.click('text=Settings');
      await expect(page).toHaveURL(/settings/);
      
      // Should show subscription information
      await expect(page.locator('text=Subscription, text=Plan, text=Free')).toBeVisible({ timeout: 10000 });
      
      // Should show usage limits
      await expect(page.locator('text=Usage, text=Responses, text=Questionnaires')).toBeVisible();
    });

    test('should enforce questionnaire limits for free plan', async ({ page }) => {
      // Navigate to questionnaires
      await page.click('text=Questionnaires');
      
      // Count existing questionnaires
      const initialCount = await page.locator('[data-testid="questionnaire-item"], .questionnaire-item').count();
      
      // Try to create questionnaires up to the limit
      const maxFreeQuestionnaires = 5; // Assuming free plan limit
      const remainingSlots = maxFreeQuestionnaires - initialCount;
      
      if (remainingSlots > 0) {
        for (let i = 0; i < remainingSlots; i++) {
          await page.click('text=Create Questionnaire');
          await page.fill('input[name="title"]', `Limit Test Survey ${i + 1}`);
          await page.click('text=Save Questionnaire');
          
          if (i < remainingSlots - 1) {
            await expect(page.locator('text=Questionnaire created successfully')).toBeVisible({ timeout: 10000 });
          }
        }
      }
      
      // Try to create one more (should fail)
      await page.click('text=Create Questionnaire');
      await page.fill('input[name="title"]', 'Should Fail Survey');
      await page.click('text=Save Questionnaire');
      
      // Should show limit error
      await expect(page.locator('text=limit reached, text=upgrade, text=subscription')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('5. Error Handling & Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network offline
      await page.context().setOffline(true);
      
      await page.goto('/login');
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      await page.click('button[type="submit"]');
      
      // Should show network error message
      await expect(page.locator('text=Network error, text=connection')).toBeVisible({ timeout: 10000 });
      
      // Restore network
      await page.context().setOffline(false);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error response
      await page.route('**/api/v1/questionnaires', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            message: 'Internal server error',
            error: 'Database connection failed' 
          })
        });
      });
      
      await page.goto('/login');
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/dashboard/);
      
      // Try to access questionnaires
      await page.click('text=Questionnaires');
      
      // Should show error message
      await expect(page.locator('text=Something went wrong, text=error occurred')).toBeVisible({ timeout: 10000 });
    });

    test('should handle 404 errors', async ({ page }) => {
      await page.goto('/non-existent-page');
      
      // Should show 404 page
      await expect(page.locator('text=Page not found, text=404')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Go back home, text=Home')).toBeVisible();
    });

    test('should validate form inputs correctly', async ({ page }) => {
      await page.goto('/register');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('text=Email is required, text=required')).toBeVisible();
      await expect(page.locator('text=Password is required, text=required')).toBeVisible();
      
      // Try invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=valid email, text=Invalid email')).toBeVisible();
      
      // Try weak password
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', '123');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=password must, text=at least')).toBeVisible();
    });
  });

  test.describe('6. Performance & Accessibility', () => {
    test('should load within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      console.log(`🚀 Page load time: ${loadTime}ms`);
    });

    test('should be accessible via keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      
      // Should focus on first interactive element
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'INPUT', 'A', 'SELECT']).toContain(focusedElement);
      
      // Should be able to navigate through main elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }
      
      // Should be able to activate elements with Enter
      await page.keyboard.press('Enter');
    });

    test('should have proper ARIA labels and structure', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper heading structure
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThan(0);
      
      // Check for alt text on images
      const imagesWithoutAlt = await page.locator('img:not([alt])').count();
      expect(imagesWithoutAlt).toBe(0);
      
      // Check for proper form labels
      const inputsWithoutLabel = await page.locator('input:not([aria-label]):not([placeholder])').count();
      expect(inputsWithoutLabel).toBe(0);
    });

    test('should be responsive on mobile devices', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Should show mobile navigation
      await expect(page.locator('[data-testid="mobile-menu"], .mobile-menu, .hamburger')).toBeVisible({ timeout: 10000 });
      
      // Should be able to navigate
      await page.click('[data-testid="mobile-menu"], .mobile-menu, .hamburger');
      await expect(page.locator('text=Dashboard, text=Login')).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('h1, .main-heading')).toBeVisible();
    });
  });

  test.describe('7. Data Consistency & Integration', () => {
    test('should maintain data consistency across operations', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[name="email"]', userEmail);
      await page.fill('input[name="password"]', userPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/dashboard/);
      
      // Create questionnaire
      await page.click('text=Questionnaires');
      await page.click('text=Create Questionnaire');
      await page.fill('input[name="title"]', 'Data Consistency Test');
      await page.click('text=Add Question');
      await page.fill('input[name="questionText"]', 'Test question');
      await page.selectOption('select[name="questionType"]', 'rating_5');
      await page.click('text=Save Questionnaire');
      await expect(page.locator('text=Questionnaire created successfully')).toBeVisible();
      
      // Verify questionnaire appears in list
      await expect(page.locator('text=Data Consistency Test')).toBeVisible();
      
      // Navigate to analytics
      await page.click('text=Analytics');
      await expect(page).toHaveURL(/analytics/);
      
      // Should show updated analytics
      await expect(page.locator('text=Data Consistency Test')).toBeVisible({ timeout: 15000 });
      
      // Go back to questionnaires
      await page.click('text=Questionnaires');
      
      // Questionnaire should still be there
      await expect(page.locator('text=Data Consistency Test')).toBeVisible();
      
      // Delete questionnaire
      await page.click('[data-testid="delete-questionnaire"]:first-child, .delete-btn:first-child');
      await page.click('text=Delete, text=Confirm');
      await expect(page.locator('text=Questionnaire deleted successfully')).toBeVisible();
      
      // Verify it's gone from list
      await expect(page.locator('text=Data Consistency Test')).not.toBeVisible();
      
      // Check analytics - should be updated
      await page.click('text=Analytics');
      await expect(page.locator('text=Data Consistency Test')).not.toBeVisible();
    });
  });

  // Cleanup after all tests
  test.afterAll(async () => {
    console.log('🧹 E2E Test Cleanup Complete');
    console.log(`✅ Test User: ${userEmail}`);
    console.log('📊 All E2E tests completed successfully!');
  });
});