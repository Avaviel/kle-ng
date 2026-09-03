import { test, expect } from '@playwright/test'
import { GitHubStarPopupHelper } from './helpers/github-star-popup-helpers'
import { WaitHelpers } from './helpers/wait-helpers'

test.describe.skip('GitHub Star Popup', () => {
  let popupHelper: GitHubStarPopupHelper
  let waitHelpers: WaitHelpers

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and navigate to app
    await context.clearCookies()
    await page.goto('/')

    // Initialize helpers
    waitHelpers = new WaitHelpers(page)
    popupHelper = new GitHubStarPopupHelper(page, waitHelpers)

    // Clear storage and set E2E flag in sessionStorage (persists across navigations)
    await popupHelper.initializeForTesting()
  })

  test('should handle popup timing correctly', async () => {
    // Wait for initial page load to complete
    await waitHelpers.waitForDoubleAnimationFrame()

    // Popup should not be visible immediately on first visit
    await popupHelper.expectPopupNotVisible()

    // Show popup after simulating 2 minutes delay
    await popupHelper.showPopupAfterDelay(120000)

    // Popup should now be visible (showPopupAfterDelay already waits for it)
    await popupHelper.expectPopupVisible()
  })

  test('should display popup with correct content and properties', async ({ page }) => {
    await waitHelpers.waitForDoubleAnimationFrame()

    // Show popup (this also waits for it to be visible)
    await popupHelper.showPopupAfterDelay(120000)
    await popupHelper.expectPopupVisible()

    // Validate content
    await popupHelper.expectPopupContent()

    // Validate link attributes
    await popupHelper.expectCorrectGitHubLink()

    // Validate close button and star button are visible
    await expect(popupHelper.getCloseIcon()).toBeVisible()
    await expect(popupHelper.getGitHubIcon()).toBeVisible()

    // Validate positioning (bottom right via toast container)
    const popup = popupHelper.getPopup()
    const box = await popup.boundingBox()

    expect(box).not.toBeNull()
    if (box) {
      const viewportSize = page.viewportSize()
      if (viewportSize) {
        // Toast should be in the right half of the viewport
        expect(box.x + box.width).toBeGreaterThan(viewportSize.width - 100)
        // Toast should be in the bottom half of the viewport
        expect(box.y + box.height).toBeGreaterThan(viewportSize.height / 2)
      }
    }

    // Test close functionality
    await popupHelper.closePopup()
    // Wait for Bootstrap fade-out animation
    await page.waitForTimeout(500)
    await popupHelper.expectPopupNotVisible()
  })

  test('should persist dismiss state and not show again', async ({ page }) => {
    await waitHelpers.waitForDoubleAnimationFrame()

    // Show popup (this also waits for it to be visible)
    await popupHelper.showPopupAfterDelay(120000)
    await popupHelper.expectPopupVisible()

    // Close popup
    await popupHelper.closePopup()
    // Wait for Bootstrap fade-out animation
    await page.waitForTimeout(500)
    await popupHelper.expectPopupNotVisible()

    // Verify localStorage was updated
    await popupHelper.expectDismissedStateStored()

    // Reload page (simulating returning user)
    await page.reload()
    await waitHelpers.waitForDoubleAnimationFrame()

    // Popup should not show again
    await popupHelper.expectPopupNotVisibleAfterWait()

    // Verify dismissed flag takes precedence even with time passed
    await popupHelper.setDismissedFlag()
    await popupHelper.simulateFirstVisit(120000)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await waitHelpers.waitForDoubleAnimationFrame()
    await popupHelper.expectPopupNotVisibleAfterWait()
  })

  test('should close popup and open new tab when star button is clicked', async ({ page }) => {
    await waitHelpers.waitForDoubleAnimationFrame()

    // Show popup (this also waits for it to be visible)
    await popupHelper.showPopupAfterDelay(120000)
    await popupHelper.expectPopupVisible()

    // Click star button (opens new tab)
    const newPage = await popupHelper.clickStarButton()

    // Close the new page
    await newPage.close()

    // Wait for Bootstrap fade-out animation
    await page.waitForTimeout(500)

    // Verify popup disappears
    await popupHelper.expectPopupNotVisible()
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await waitHelpers.waitForDoubleAnimationFrame()

    // Show popup (this also waits for it to be visible)
    await popupHelper.showPopupAfterDelay(120000)
    await popupHelper.expectPopupVisible()

    // Verify popup fits within mobile viewport
    const popup = popupHelper.getPopup()
    const box = await popup.boundingBox()

    expect(box).not.toBeNull()
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(380) // Allow small margin
    }
  })
})
