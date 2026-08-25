import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TouchWarningBanner from '../TouchWarningBanner.vue'

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('TouchWarningBanner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not render on a non-touch-primary device', () => {
    mockMatchMedia(false)
    const wrapper = mount(TouchWarningBanner)
    expect(wrapper.find('.touch-warning-banner').exists()).toBe(false)
  })

  it('renders on a touch-primary device', async () => {
    mockMatchMedia(true)
    const wrapper = mount(TouchWarningBanner)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.touch-warning-banner').exists()).toBe(true)
  })

  it('does not render if previously dismissed', () => {
    mockMatchMedia(true)
    localStorage.setItem('kle-ng-touch-warning-dismissed', 'true')
    const wrapper = mount(TouchWarningBanner)
    expect(wrapper.find('.touch-warning-banner').exists()).toBe(false)
  })

  it('hides and persists dismissal when closed', async () => {
    mockMatchMedia(true)
    const wrapper = mount(TouchWarningBanner)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.touch-warning-banner').exists()).toBe(true)

    await wrapper.find('.btn-close').trigger('click')

    expect(wrapper.find('.touch-warning-banner').exists()).toBe(false)
    expect(localStorage.getItem('kle-ng-touch-warning-dismissed')).toBe('true')
  })
})
