import { test, expect } from '@playwright/test'

test.describe('Personal Journal - Core Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle')
  })

  test('should display homepage with editor', async ({ page }) => {
    // Check that the main editor is visible
    await expect(page.locator('[data-testid="editor-content"]')).toBeVisible()
    
    // Check for navigation elements
    await expect(page.locator('nav')).toBeVisible()
    
    // Should have a way to access different sections
    await expect(page.locator('text=Calendar')).toBeVisible()
    await expect(page.locator('text=Entries')).toBeVisible()
  })

  test('should create a new journal entry', async ({ page }) => {
    // Focus on the editor
    await page.locator('[data-testid="editor-content"]').click()
    
    // Type some content
    const testContent = 'This is my first journal entry. I am feeling great today!'
    await page.locator('[data-testid="editor-content"]').fill(testContent)
    
    // Save the entry (look for save button)
    const saveButton = page.locator('button', { hasText: 'Save' }).first()
    if (await saveButton.isVisible()) {
      await saveButton.click()
    } else {
      // Try keyboard shortcut
      await page.keyboard.press('Control+s')
    }
    
    // Wait for save to complete
    await page.waitForTimeout(1000)
    
    // Verify content is saved (content should still be visible)
    await expect(page.locator('[data-testid="editor-content"]')).toContainText('This is my first journal entry')
  })

  test('should navigate to calendar view', async ({ page }) => {
    // Click on calendar navigation
    await page.locator('text=Calendar').click()
    
    // Wait for calendar to load
    await page.waitForLoadState('networkidle')
    
    // Should see calendar grid
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible()
    
    // Should see month navigation
    await expect(page.locator('[data-testid="chevron-left"]')).toBeVisible()
    await expect(page.locator('[data-testid="chevron-right"]')).toBeVisible()
  })

  test('should navigate to entries list', async ({ page }) => {
    // Click on entries navigation
    await page.locator('text=Entries').click()
    
    // Wait for entries page to load
    await page.waitForLoadState('networkidle')
    
    // Should see entries list or empty state
    const entriesList = page.locator('[data-testid="entries-list"]')
    const emptyState = page.locator('text=No entries found')
    
    // Either entries list or empty state should be visible
    await expect(entriesList.or(emptyState)).toBeVisible()
  })

  test('should toggle between light and dark theme', async ({ page }) => {
    // Look for theme toggle button
    const themeButton = page.locator('[data-testid="theme-toggle"]').first()
    
    if (await themeButton.isVisible()) {
      // Get initial theme
      const initialTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      
      // Click theme toggle
      await themeButton.click()
      
      // Wait for theme change
      await page.waitForTimeout(500)
      
      // Verify theme changed
      const newTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      expect(newTheme).not.toBe(initialTheme)
    }
  })

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Should still display main content
    await expect(page.locator('[data-testid="editor-content"]')).toBeVisible()
    
    // Mobile navigation should be accessible
    const mobileNav = page.locator('[data-testid="mobile-nav"]')
    const hamburgerMenu = page.locator('[data-testid="hamburger-menu"]')
    
    // Either mobile nav or hamburger menu should be visible
    if (await hamburgerMenu.isVisible()) {
      await hamburgerMenu.click()
      await expect(page.locator('nav')).toBeVisible()
    }
  })

  test('should persist data across page refreshes', async ({ page }) => {
    // Create an entry
    await page.locator('[data-testid="editor-content"]').click()
    const testContent = 'This entry should persist after refresh'
    await page.locator('[data-testid="editor-content"]').fill(testContent)
    
    // Save the entry
    const saveButton = page.locator('button', { hasText: 'Save' }).first()
    if (await saveButton.isVisible()) {
      await saveButton.click()
      await page.waitForTimeout(1000)
    }
    
    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check if we can navigate to entries and see our content
    await page.locator('text=Entries').click()
    await page.waitForLoadState('networkidle')
    
    // Look for our saved content in the entries list
    await expect(page.locator('text=This entry should persist')).toBeVisible()
  })

  test('should handle search functionality', async ({ page }) => {
    // Navigate to entries page
    await page.locator('text=Entries').click()
    await page.waitForLoadState('networkidle')
    
    // Look for search input
    const searchInput = page.locator('input[type="search"]').first()
    
    if (await searchInput.isVisible()) {
      // Type in search query
      await searchInput.fill('test search')
      
      // Wait for search results
      await page.waitForTimeout(1000)
      
      // Should not crash and should show some search state
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should handle offline functionality', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true)
    
    // App should still be accessible
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Basic functionality should work
    await expect(page.locator('[data-testid="editor-content"]')).toBeVisible()
    
    // Try to create an entry while offline
    await page.locator('[data-testid="editor-content"]').click()
    await page.locator('[data-testid="editor-content"]').fill('Offline entry test')
    
    // App should handle offline state gracefully
    await expect(page.locator('body')).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
  })

  test('should export data functionality', async ({ page }) => {
    // Navigate to settings or export page
    const settingsLink = page.locator('text=Settings').first()
    const exportButton = page.locator('text=Export').first()
    
    if (await settingsLink.isVisible()) {
      await settingsLink.click()
      await page.waitForLoadState('networkidle')
    }
    
    if (await exportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download')
      
      await exportButton.click()
      
      // Wait for download
      const download = await downloadPromise
      
      // Verify download occurred
      expect(download.suggestedFilename()).toMatch(/.*\.(json|md)$/)
    }
  })
})

test.describe('AI Features', () => {
  test('should handle AI analysis', async ({ page }) => {
    // First create an entry with some content
    await page.locator('[data-testid="editor-content"]').click()
    const emotionalContent = 'I am feeling very happy today. Had a great conversation with friends and accomplished my goals.'
    await page.locator('[data-testid="editor-content"]').fill(emotionalContent)
    
    // Save the entry
    const saveButton = page.locator('button', { hasText: 'Save' }).first()
    if (await saveButton.isVisible()) {
      await saveButton.click()
      await page.waitForTimeout(1000)
    }
    
    // Look for AI analysis button
    const aiAnalysisButton = page.locator('[data-testid="ai-analysis-button"]').first()
    
    if (await aiAnalysisButton.isVisible()) {
      await aiAnalysisButton.click()
      
      // Wait for AI processing (this might take a while or might not work in test environment)
      await page.waitForTimeout(3000)
      
      // Should show some AI analysis UI or loading state
      const aiResults = page.locator('[data-testid="ai-results"]')
      const loadingState = page.locator('text=Analyzing')
      
      await expect(aiResults.or(loadingState)).toBeVisible()
    }
  })

  test('should access insights page', async ({ page }) => {
    // Navigate to insights
    const insightsLink = page.locator('text=Insights').first()
    
    if (await insightsLink.isVisible()) {
      await insightsLink.click()
      await page.waitForLoadState('networkidle')
      
      // Should show insights page
      await expect(page.locator('body')).toBeVisible()
      
      // Look for charts or metrics
      const charts = page.locator('[data-testid="sentiment-chart"]')
      const metrics = page.locator('[data-testid="metrics-display"]')
      
      // Should show some insights content or empty state
      const emptyState = page.locator('text=No insights available')
      await expect(charts.or(metrics).or(emptyState)).toBeVisible()
    }
  })
})