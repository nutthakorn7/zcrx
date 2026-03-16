import { test, expect } from '@playwright/test';

test.describe('zcrX Platform E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
    // Intercept all API calls to prevent 401 Unauthorized redirects and inject demo data
    await page.route('**/api/**', async (route: any) => {
      const url = route.request().url();
      let responseData: any = { data: [], success: true };

      if (url.includes('/api/projects')) {
        responseData.data = [
          {
            id: "demo1",
            name: "web-api",
            repoUrl: "https://github.com/acme/web-api",
            language: "TypeScript",
            description: "REST API backend service",
            lastScanAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
            critical: 2, high: 3, medium: 4, low: 3,
          }
        ];
        if (url.includes('/findings')) {
            responseData.data = [
                { id: "f1", title: "SQL Injection", severity: "critical", type: "sast", ruleId: "sql-inj", file: "src/db.ts", line: 42, status: "open", issueType: "vulnerability" }
            ];
        } else if (url.includes('/scans')) {
            responseData.data = [
                { id: "ds1", projectId: "demo1", type: "sast", status: "completed", findingsCount: 6, startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3500000).toISOString() }
            ];
        } else if (url.includes('/demo1')) {
             responseData.data = {
                id: "demo1",
                name: "web-api",
                repoUrl: "https://github.com/acme/web-api",
                language: "TypeScript",
                description: "REST API backend service",
                lastScanAt: new Date().toISOString(),
                createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
                critical: 2, high: 3, medium: 4, low: 3,
            };
        }
      } else if (url.includes('/api/scans')) {
        responseData.data = [
            { id: "ds1", projectId: "demo1", type: "sast",  status: "completed", findingsCount: 6, startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3500000).toISOString() }
        ];
      } else if (url.includes('/api/dashboard/stats')) {
         responseData.data = {
           totalProjects: 1,
           totalScans: 1,
           totalFindings: 12,
           openFindings: 12,
           recentScans: [],
           bySeverity: { critical: 2, high: 3, medium: 4, low: 3 }
         };
      } else if (url.includes('/api/sbom')) {
          responseData.data = { components: [] };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
    await page.goto('/login');
    
    // Inject fake token so frontend considers us logged in
    await page.evaluate(() => {
      localStorage.setItem("zcrx_token", "test-token");
      localStorage.setItem("zcrx_user", JSON.stringify({ id: "1", email: "admin@example.com", name: "Admin" }));
    });
    
    // Navigate to root (which bypasses login due to auth token and our mock API)
    await page.goto('/');
    
    // Ensure we are indeed on the Dashboard
    await expect(page.locator('h2').filter({ hasText: 'Dashboard' })).toBeVisible();
  });

  test('Dashboard loads with SonarQube-style Overview', async ({ page }) => {
    // Verify Platform Overview section exists
    await expect(page.locator('h3').filter({ hasText: 'Platform Overview' })).toBeVisible();
    
    // Verify the 4 dimensions are present
    await expect(page.locator('h4').filter({ hasText: 'Reliability' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Security', exact: true })).toBeVisible();
    await expect(page.locator('h4').filter({ hasText: 'Maintainability' })).toBeVisible();
    await expect(page.locator('h4').filter({ hasText: 'Security Review' })).toBeVisible();
    
    // Verify the Quality Gate summary widget exists
    await expect(page.locator('h3').filter({ hasText: 'Quality Gate Overview' })).toBeVisible();
    
    // Verify the detailed project list table exists
    await expect(page.locator('th').filter({ hasText: 'Project' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Quality Gate' })).toBeVisible();
  });

  test('Projects page displays list and tags correctly', async ({ page }) => {
    // Navigate to Projects page
    await page.click('a[href="/projects"]');
    await expect(page.locator('h2').filter({ hasText: 'Projects' })).toBeVisible();
    
    // Verify the "web-api" project is visible
    await expect(page.locator('h3').filter({ hasText: 'web-api' })).toBeVisible();
  });

  test('Project Detail page displays grades and dimensions', async ({ page }) => {
    await page.click('a[href="/projects"]');
    
    // Click on web-api project card inside the list
    await page.locator('h3', { hasText: 'web-api' }).click();
    
    // Verify header and Full Scan button
    await expect(page.locator('h2').filter({ hasText: 'web-api' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Full Scan' })).toBeVisible();
    
    // Verify Quality Gate section
    await expect(page.locator('div').filter({ hasText: /Quality Gate/ }).first()).toBeVisible();
  });

  test('Findings page filters by issue type and expands Clean Code attributes', async ({ page }) => {
    await page.click('a[href="/findings"]');
    await expect(page.locator('h2').filter({ hasText: 'Findings' })).toBeVisible();
    
    // Select the "Issue Type" filter (the 3rd select box) and change to "vulnerability"
    const dropdowns = page.locator('select');
    await dropdowns.nth(2).selectOption('vulnerability');

    // Click on the matching finding card to expand it
    const findingCard = page.locator('.card').filter({ hasText: 'SQL Injection' }).first();
    await findingCard.click();

    // Verify Clean Code attribute badges appear in the expanded details
    await expect(page.locator('span').filter({ hasText: /Clean Code:/ }).first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /Quality:/ }).first()).toBeVisible();
  });

  test('Scans page and SBOM page load correctly', async ({ page }) => {
    await page.click('a[href="/scans"]');
    await expect(page.locator('h2').filter({ hasText: 'Scans' })).toBeVisible();
    
    await page.click('a[href="/sbom"]');
    await expect(page.locator('h2').filter({ hasText: /Software Bill of Materials/ })).toBeVisible();
  });
});
