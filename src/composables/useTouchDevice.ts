import { onMounted, onUnmounted, ref } from 'vue'

// Matches devices where touch is the primary input (no hover, coarse pointer) — phones and
// tablets without a mouse/trackpad attached. Deliberately excludes touchscreen laptops and
// tablets with an attached pointer device (e.g. iPadOS reports pointer:fine/hover:hover once
// a trackpad is active), since those users have a working mouse-equivalent.
const QUERY = '(hover: none) and (pointer: coarse)'

export function useTouchDevice() {
  const isTouchPrimaryDevice = ref(false)
  let mql: MediaQueryList | null = null

  const handleChange = (event: MediaQueryListEvent) => {
    isTouchPrimaryDevice.value = event.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    mql = window.matchMedia(QUERY)
    isTouchPrimaryDevice.value = mql.matches
    mql.addEventListener('change', handleChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', handleChange)
    mql = null
  })

  return { isTouchPrimaryDevice }
}
