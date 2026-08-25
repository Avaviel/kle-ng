import { test, expect } from '@playwright/test'

const BANNER = '.touch-warning-banner'
const STORAGE_KEY = 'kle-ng-touch-warning-dismissed'

test.describe('Touch warning banner', () => {
  test('does not appear on a desktop (mouse) context', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(BANNER)).toHaveCount(0)
  })

  test.describe('touch-primary context', () => {
    // Firefox's CDP-less emulation doesn't propagate hasTouch/isMobile into the
    // (hover: none)/(pointer: coarse) media features the way Chromium/WebKit do.
    test.skip(
      ({ browserName }) => browserName === 'firefox',
      'touch media emulation only reliable on Chromium/WebKit',
    )

    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('appears for a touch-primary visitor', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator(BANNER)).toBeVisible()
    })

    test('dismiss hides it and persists across reload', async ({ page }) => {
      await page.goto('/')
      const banner = page.locator(BANNER)
      await expect(banner).toBeVisible()

      await banner.locator('.btn-close').click()
      await expect(banner).toHaveCount(0)

      const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
      expect(stored).toBe('true')

      await page.reload()
      await expect(page.locator(BANNER)).toHaveCount(0)
    })
  })
})
