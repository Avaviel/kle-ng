import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const mocks = vi.hoisted(() => ({
  isAuthConfigured: vi.fn(() => true),
  getSupabaseClient: vi.fn(),
}))

vi.mock('@/config/supabase', () => ({
  AUTH_STORAGE_KEY: 'kle-ng-auth',
  isAuthConfigured: mocks.isAuthConfigured,
}))

vi.mock('@/utils/supabase-loader', () => ({
  getSupabaseClient: mocks.getSupabaseClient,
}))

import ShortLinkConfirmModal from '../ShortLinkConfirmModal.vue'
import { useKeyboardStore } from '@/stores/keyboard'
import { useShortLinksStore } from '@/stores/short-links'
import { useLayoutEditorSettingsStore } from '@/stores/layoutEditorSettings'

/** Minimal stand-in: create_short_link is the only call the store makes. */
function fakeClient(id = '7kQ2mBx9Lp') {
  return { rpc: vi.fn(async () => ({ data: id, error: null })) }
}

// The component is mounted once by KeyboardToolbar and toggled via the isVisible prop
// (its template gates on `v-if="isVisible"` internally) — it is never remounted per
// open. These tests mount it hidden and toggle the prop to match, since that toggle is
// what the consent-skip logic watches.
describe('ShortLinkConfirmModal', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.isAuthConfigured.mockReturnValue(true)
    mocks.getSupabaseClient.mockResolvedValue(fakeClient())
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('shows the consent stage the first time a layout is shared', async () => {
    const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })
    await wrapper.setProps({ isVisible: true })

    expect(wrapper.find('[data-testid="short-link-confirm"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(false)
  })

  it('skips the consent stage on a second share of the same layout in this session', async () => {
    const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })

    // First share: goes through consent, which is what actually calls the RPC and
    // populates the store's cache.
    await wrapper.setProps({ isVisible: true })
    await wrapper.find('[data-testid="short-link-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(true)

    // Close, then reopen for the same (unchanged) layout: the link appears
    // immediately, no consent screen and no second RPC call.
    await wrapper.setProps({ isVisible: false })
    await wrapper.setProps({ isVisible: true })

    expect(wrapper.find('[data-testid="short-link-confirm"]').exists()).toBe(false)
    const urlField = wrapper.find('[data-testid="short-link-url"]')
    expect(urlField.exists()).toBe(true)
    expect((urlField.element as HTMLInputElement).value).toContain('7kQ2mBx9Lp')
    expect(mocks.getSupabaseClient).toHaveBeenCalledTimes(1)
  })

  it('shows consent again once the layout has changed', async () => {
    const keyboardStore = useKeyboardStore()
    const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })

    await wrapper.setProps({ isVisible: true })
    await wrapper.find('[data-testid="short-link-confirm"]').trigger('click')
    await flushPromises()

    await wrapper.setProps({ isVisible: false })
    keyboardStore.metadata.name = 'changed'
    await wrapper.setProps({ isVisible: true })

    expect(wrapper.find('[data-testid="short-link-confirm"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(false)
  })

  it('checking "don\'t show again" and confirming skips consent for a later, different layout', async () => {
    const keyboardStore = useKeyboardStore()
    const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })

    await wrapper.setProps({ isVisible: true })
    await wrapper.find('[data-testid="short-link-dont-show-again"]').setValue(true)
    await wrapper.find('[data-testid="short-link-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(true)

    // A different layout, never shared before, so this can only skip via skipWarning
    // (the cache is keyed by payload and has no entry for it).
    await wrapper.setProps({ isVisible: false })
    keyboardStore.metadata.name = 'changed'
    await wrapper.setProps({ isVisible: true })
    await flushPromises()

    expect(wrapper.find('[data-testid="short-link-confirm"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(true)
    expect(mocks.getSupabaseClient).toHaveBeenCalledTimes(2)
  })

  it('does not show the warning text while a skipWarning create is still in flight', async () => {
    const keyboardStore = useKeyboardStore()
    const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })

    await wrapper.setProps({ isVisible: true })
    await wrapper.find('[data-testid="short-link-dont-show-again"]').setValue(true)
    await wrapper.find('[data-testid="short-link-confirm"]').trigger('click')
    await flushPromises()

    // A second, never-before-shared layout: skipWarning auto-confirms it, but this time
    // the RPC is held open so the in-flight DOM can be inspected before it settles.
    let resolveRpc!: (value: { data: string; error: null }) => void
    mocks.getSupabaseClient.mockResolvedValue({
      rpc: vi.fn(() => new Promise((resolve) => (resolveRpc = resolve))),
    })
    await wrapper.setProps({ isVisible: false })
    keyboardStore.metadata.name = 'changed'
    await wrapper.setProps({ isVisible: true })
    // Lets the chain (openForCurrentLayout -> confirm -> create -> client) run up to the
    // held-open rpc() call, without resolving it.
    await flushPromises()

    // Still creating: the consent warning and its buttons must not flash while waiting.
    expect(wrapper.text()).not.toContain('makes the design public')
    expect(wrapper.find('[data-testid="short-link-confirm"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="short-link-cancel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(false)

    resolveRpc({ data: 'newLinkId1', error: null })
    await flushPromises()

    expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(true)
    const urlField = wrapper.find('[data-testid="short-link-url"]')
    expect((urlField.element as HTMLInputElement).value).toContain('newLinkId1')
  })

  it('does not persist the checkbox unless the user actually confirms', async () => {
    const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })

    await wrapper.setProps({ isVisible: true })
    await wrapper.find('[data-testid="short-link-dont-show-again"]').setValue(true)
    await wrapper.find('[data-testid="short-link-cancel"]').trigger('click')

    expect(useShortLinksStore().skipWarning).toBe(false)
  })

  describe('sanitize nudge', () => {
    it('does not show a sanitize warning for a clean layout', async () => {
      const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })
      await wrapper.setProps({ isVisible: true })

      expect(wrapper.find('[data-testid="short-link-sanitize-warning"]').exists()).toBe(false)
    })

    it('warns when the layout has a sanitize issue, without blocking creation', async () => {
      const keyboardStore = useKeyboardStore()
      // Stale rotation origin: origin set on a key that isn't rotated.
      keyboardStore.addKey({ rotation_x: 5, rotation_y: 5, rotation_angle: 0 })

      const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })
      await wrapper.setProps({ isVisible: true })

      const warning = wrapper.find('[data-testid="short-link-sanitize-warning"]')
      expect(warning.exists()).toBe(true)
      expect(warning.text()).toContain('1 item')

      // Proceeding anyway still works — this is a nudge, not a gate.
      await wrapper.find('[data-testid="short-link-confirm"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(true)
    })

    it('opening the sanitize tool from the nudge closes the modal and raises the shared flag', async () => {
      const keyboardStore = useKeyboardStore()
      const layoutEditorSettingsStore = useLayoutEditorSettingsStore()
      keyboardStore.addKey({ rotation_x: 5, rotation_y: 5, rotation_angle: 0 })

      const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })
      await wrapper.setProps({ isVisible: true })

      expect(layoutEditorSettingsStore.showSanitizeToolPanel).toBe(false)
      await wrapper.find('[data-testid="short-link-open-sanitize"]').trigger('click')

      expect(layoutEditorSettingsStore.showSanitizeToolPanel).toBe(true)
      // Closing is delegated to the parent via the 'close' event, same as Cancel/X.
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    // Regression: skipWarning previously bypassed the whole consent screen via the
    // silent auto-confirm path, so a dirty layout could be shared with no warning at
    // all once the user had dismissed the privacy notice once.
    it('still surfaces the sanitize warning even when "don\'t show again" is on', async () => {
      const keyboardStore = useKeyboardStore()
      const shortLinksStore = useShortLinksStore()
      shortLinksStore.skipWarning = true
      keyboardStore.addKey({ rotation_x: 5, rotation_y: 5, rotation_angle: 0 })

      const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })
      await wrapper.setProps({ isVisible: true })
      await flushPromises()

      // Must not have silently created the link.
      expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(false)

      const warning = wrapper.find('[data-testid="short-link-sanitize-warning"]')
      expect(warning.exists()).toBe(true)

      // The already-dismissed privacy explanation and checkbox stay hidden.
      expect(wrapper.text()).not.toContain('makes the design public')
      expect(wrapper.find('[data-testid="short-link-dont-show-again"]').exists()).toBe(false)

      // Create anyway still works from here.
      await wrapper.find('[data-testid="short-link-confirm"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(true)
    })

    it('still goes silent when "don\'t show again" is on and the layout is clean', async () => {
      const shortLinksStore = useShortLinksStore()
      shortLinksStore.skipWarning = true

      const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })
      await wrapper.setProps({ isVisible: true })
      await flushPromises()

      expect(wrapper.find('[data-testid="short-link-url"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="short-link-sanitize-warning"]').exists()).toBe(false)
    })
  })

  it('flips the copy button to btn-primary (not the unthemed btn-success) once copied', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })
    await wrapper.setProps({ isVisible: true })
    await wrapper.find('[data-testid="short-link-confirm"]').trigger('click')
    await flushPromises()

    const copyBtn = wrapper.find('[data-testid="short-link-copy"]')
    expect(copyBtn.classes()).toContain('btn-outline-secondary')

    await copyBtn.trigger('click')
    await flushPromises()

    expect(copyBtn.classes()).toContain('btn-primary')
    expect(copyBtn.classes()).not.toContain('btn-success')
  })
})
