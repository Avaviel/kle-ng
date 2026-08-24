import { test, expect } from '@playwright/test'
import { WaitHelpers } from './helpers'
import { ExtraToolsComponent } from './pages/components/ExtraToolsComponent'

/**
 * The Theme Tools panel closes itself on Escape via a `document` keydown
 * listener. Its inline editor is shielded from that listener by `@keydown.stop`
 * on `.json-editor-wrapper`, but the expand modal is `Teleport`ed to `<body>` —
 * outside that wrapper — so its Escape reaches the panel too. These tests pin
 * down that one Escape dismisses only the modal, and that the panel it came from
 * is still there with its contents intact.
 */
test.describe('Theme Tools expand modal', () => {
  let waitHelpers: WaitHelpers
  let extraTools: ExtraToolsComponent

  const panel = (page: import('@playwright/test').Page) => page.getByTestId('theme-tools-panel')
  const modal = (page: import('@playwright/test').Page) => page.locator('.modal-expand-json')

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    waitHelpers = new WaitHelpers(page)
    extraTools = new ExtraToolsComponent(page, waitHelpers)

    await extraTools.selectTool('Theme Tools')
    await expect(panel(page)).toBeVisible()
    // The editor loads asynchronously; the expand button lives beside it.
    await expect(page.getByTestId('theme-json-editor').locator('.expand-editor-btn')).toBeVisible()
  })

  test('Escape closes only the modal, leaving the panel open', async ({ page }) => {
    await page.getByTestId('theme-json-editor').locator('.expand-editor-btn').click()
    await expect(modal(page)).toBeVisible()

    await page.keyboard.press('Escape')
    await waitHelpers.waitForDoubleAnimationFrame()

    await expect(modal(page)).toBeHidden()
    // The regression: this Escape used to reach the panel's own document
    // listener as well and unmount it, discarding the editor along with it.
    await expect(panel(page)).toBeVisible()
  })

  test('a second Escape then closes the panel', async ({ page }) => {
    await page.getByTestId('theme-json-editor').locator('.expand-editor-btn').click()
    await expect(modal(page)).toBeVisible()

    await page.keyboard.press('Escape')
    await waitHelpers.waitForDoubleAnimationFrame()
    await expect(modal(page)).toBeHidden()

    // The guard is scoped to "the modal is open", not a permanent opt-out.
    await page.keyboard.press('Escape')
    await waitHelpers.waitForDoubleAnimationFrame()
    await expect(panel(page)).toBeHidden()
  })

  test('Escape still closes the panel when the modal was never opened', async ({ page }) => {
    await page.keyboard.press('Escape')
    await waitHelpers.waitForDoubleAnimationFrame()

    await expect(panel(page)).toBeHidden()
  })

  test('the modal Cancel button leaves the panel open too', async ({ page }) => {
    await page.getByTestId('theme-json-editor').locator('.expand-editor-btn').click()
    await expect(modal(page)).toBeVisible()

    await modal(page).getByRole('button', { name: 'Cancel' }).click()
    await waitHelpers.waitForDoubleAnimationFrame()

    await expect(modal(page)).toBeHidden()
    await expect(panel(page)).toBeVisible()
  })
})
