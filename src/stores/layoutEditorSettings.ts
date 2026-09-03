import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'kle-ng-layout-editor-settings'

interface PersistedSettings {
  showGrid?: boolean
  highlightColor?: string
  allowLabelOverflow?: boolean
  showCornerMarkers?: boolean
}

export const DEFAULT_HIGHLIGHT_COLOR = '#dc3545'

function loadFromStorage(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PersistedSettings
  } catch {
    // ignore
  }
  return {}
}

export const useLayoutEditorSettingsStore = defineStore('layoutEditorSettings', () => {
  const saved = loadFromStorage()

  const showGrid = ref<boolean>(saved.showGrid ?? false)
  const highlightColor = ref<string>(saved.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR)
  const allowLabelOverflow = ref<boolean>(saved.allowLabelOverflow ?? false)
  const showCornerMarkers = ref<boolean>(saved.showCornerMarkers ?? true)

  // Not persisted — just a shared toggle so panels/modals outside CanvasToolbar
  // (e.g. ShortLinkConfirmModal's sanitize-before-sharing nudge) can open the
  // Sanitize Layout panel without owning its visibility state themselves.
  const showSanitizeToolPanel = ref(false)

  watch(showGrid, (val) => {
    const current = loadFromStorage()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, showGrid: val }))
  })

  watch(highlightColor, (val) => {
    const current = loadFromStorage()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, highlightColor: val }))
  })

  watch(allowLabelOverflow, (val) => {
    const current = loadFromStorage()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, allowLabelOverflow: val }))
  })

  watch(showCornerMarkers, (val) => {
    const current = loadFromStorage()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, showCornerMarkers: val }))
  })

  const toggleCornerMarkers = () => {
    showCornerMarkers.value = !showCornerMarkers.value
  }

  return {
    showGrid,
    highlightColor,
    allowLabelOverflow,
    showCornerMarkers,
    toggleCornerMarkers,
    showSanitizeToolPanel,
  }
})
