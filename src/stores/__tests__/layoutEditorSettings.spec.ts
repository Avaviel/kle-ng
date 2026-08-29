import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLayoutEditorSettingsStore } from '../layoutEditorSettings'

const STORAGE_KEY = 'kle-ng-layout-editor-settings'

describe('layoutEditorSettings store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('defaults showGrid to false when no saved data', () => {
    const store = useLayoutEditorSettingsStore()
    expect(store.showGrid).toBe(false)
  })

  it('loads showGrid true from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ showGrid: true }))
    setActivePinia(createPinia())
    const store = useLayoutEditorSettingsStore()
    expect(store.showGrid).toBe(true)
  })

  it('persists showGrid change to localStorage', async () => {
    const store = useLayoutEditorSettingsStore()
    store.showGrid = true

    // watcher is sync (no flush option), but give Vue one tick
    await Promise.resolve()

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(saved.showGrid).toBe(true)
  })

  it('persists showGrid false to localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ showGrid: true }))
    setActivePinia(createPinia())
    const store = useLayoutEditorSettingsStore()

    store.showGrid = false
    await Promise.resolve()

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(saved.showGrid).toBe(false)
  })

  it('ignores corrupted localStorage data and uses defaults', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json')
    setActivePinia(createPinia())
    const store = useLayoutEditorSettingsStore()
    expect(store.showGrid).toBe(false)
  })

  it('defaults allowLabelOverflow to false when no saved data', () => {
    const store = useLayoutEditorSettingsStore()
    expect(store.allowLabelOverflow).toBe(false)
  })

  it('loads allowLabelOverflow true from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ allowLabelOverflow: true }))
    setActivePinia(createPinia())
    const store = useLayoutEditorSettingsStore()
    expect(store.allowLabelOverflow).toBe(true)
  })

  it('persists allowLabelOverflow change to localStorage', async () => {
    const store = useLayoutEditorSettingsStore()
    store.allowLabelOverflow = true

    await Promise.resolve()

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(saved.allowLabelOverflow).toBe(true)
  })
})
