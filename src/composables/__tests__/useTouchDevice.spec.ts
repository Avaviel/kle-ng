import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useTouchDevice } from '../useTouchDevice'

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(event: MediaQueryListEvent) => void> = []
  const mql = {
    matches,
    media: '(hover: none) and (pointer: coarse)',
    onchange: null,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener)
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  })
  return { mql, listeners }
}

function mountHarness() {
  let result!: ReturnType<typeof useTouchDevice>
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useTouchDevice()
        return () => null
      },
    }),
  )
  return { wrapper, result }
}

describe('useTouchDevice', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reflects a non-matching media query as false', () => {
    mockMatchMedia(false)
    const { result } = mountHarness()
    expect(result.isTouchPrimaryDevice.value).toBe(false)
  })

  it('reflects a matching media query as true', () => {
    mockMatchMedia(true)
    const { result } = mountHarness()
    expect(result.isTouchPrimaryDevice.value).toBe(true)
  })

  it('updates when the media query change event fires', async () => {
    const { listeners } = mockMatchMedia(false)
    const { result } = mountHarness()
    expect(result.isTouchPrimaryDevice.value).toBe(false)

    listeners[0]({ matches: true } as MediaQueryListEvent)
    expect(result.isTouchPrimaryDevice.value).toBe(true)
  })

  it('removes the change listener on unmount', () => {
    const { mql } = mockMatchMedia(false)
    const { wrapper } = mountHarness()
    wrapper.unmount()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('defaults to false when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: undefined })
    const { result } = mountHarness()
    expect(result.isTouchPrimaryDevice.value).toBe(false)
  })
})
