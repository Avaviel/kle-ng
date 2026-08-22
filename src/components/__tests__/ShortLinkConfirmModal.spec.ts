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

  it('does not persist the checkbox unless the user actually confirms', async () => {
    const wrapper = mount(ShortLinkConfirmModal, { props: { isVisible: false } })

    await wrapper.setProps({ isVisible: true })
    await wrapper.find('[data-testid="short-link-dont-show-again"]').setValue(true)
    await wrapper.find('[data-testid="short-link-cancel"]').trigger('click')

    expect(useShortLinksStore().skipWarning).toBe(false)
  })
})
