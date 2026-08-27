import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCharacterPickerStore } from '../characterPicker'
import { useKeyboardStore } from '../keyboard'

// Mock localStorage for recentlyUsedCharactersManager, invoked internally by insertCharacter
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Character Picker Store', () => {
  let store: ReturnType<typeof useCharacterPickerStore>
  let keyboardStore: ReturnType<typeof useKeyboardStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCharacterPickerStore()
    keyboardStore = useKeyboardStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('defaults to hidden, top-left label, no known cursor position', () => {
      expect(store.isVisible).toBe(false)
      expect(store.activeLabelIndex).toBe(0)
      expect(store.activeCursorPos).toBeNull()
    })
  })

  describe('open/close', () => {
    it('toggles visibility', () => {
      store.open()
      expect(store.isVisible).toBe(true)

      store.close()
      expect(store.isVisible).toBe(false)
    })
  })

  describe('setActiveLabel', () => {
    it('updates the active label index and cursor position', () => {
      store.setActiveLabel(4, 2)

      expect(store.activeLabelIndex).toBe(4)
      expect(store.activeCursorPos).toBe(2)
    })
  })

  describe('insertCharacter', () => {
    it('no-ops when there is no selection', () => {
      const historyIndexBefore = keyboardStore.historyIndex

      store.insertCharacter('©')

      expect(keyboardStore.historyIndex).toBe(historyIndexBefore)
    })

    it('inserts into the active label of the selected key and saves state', () => {
      keyboardStore.addKey({ labels: ['', '', '', '', '', '', '', '', '', '', '', ''] })
      const historyIndexBefore = keyboardStore.historyIndex
      store.setActiveLabel(0, null)

      store.insertCharacter('©')

      expect(keyboardStore.selectedKeys[0]?.labels[0]).toBe('©')
      expect(keyboardStore.historyIndex).toBe(historyIndexBefore + 1)
    })

    it('applies the insert to every selected key at the same label index', () => {
      keyboardStore.addKey({ labels: ['', '', '', '', '', '', '', '', '', '', '', ''] })
      keyboardStore.addKey({ labels: ['', '', '', '', '', '', '', '', '', '', '', ''] })
      keyboardStore.selectAll()
      store.setActiveLabel(4, null)

      store.insertCharacter('★')

      expect(keyboardStore.selectedKeys).toHaveLength(2)
      for (const key of keyboardStore.selectedKeys) {
        expect(key.labels[4]).toBe('★')
      }
    })

    it('advances the tracked cursor position so a second insert lands after the first', () => {
      keyboardStore.addKey({ labels: ['', '', '', '', '', '', '', '', '', '', '', ''] })
      store.setActiveLabel(0, 0)

      store.insertCharacter('a')
      expect(keyboardStore.selectedKeys[0]?.labels[0]).toBe('a')
      expect(store.activeCursorPos).toBe(1)

      store.insertCharacter('b')
      expect(keyboardStore.selectedKeys[0]?.labels[0]).toBe('ab')
      expect(store.activeCursorPos).toBe(2)
    })

    it('records the inserted character as recently used', () => {
      keyboardStore.addKey({ labels: ['', '', '', '', '', '', '', '', '', '', '', ''] })

      store.insertCharacter('©')

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kle-ng-recently-used-characters',
        JSON.stringify(['©']),
      )
    })
  })
})
