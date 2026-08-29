import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useKeyboardStore } from './keyboard'
import { insertCharacterAtCursor } from '@/utils/insert-character-into-label'
import { recentlyUsedCharactersManager } from '@/utils/recently-used-characters'

export const useCharacterPickerStore = defineStore('characterPicker', () => {
  const isVisible = ref(false)

  // Which of the 12 label slots (see LABEL_POSITIONS) receives inserted
  // characters, and the last-known cursor offset within it. Set by
  // KeyPropertiesPanel's label inputs on focus/click/keyup/select.
  const activeLabelIndex = ref(0)
  const activeCursorPos = ref<number | null>(null)

  // Anchor point (e.g. a triggering button's position) for the panel to open
  // near. Left null to fall back to the default top-right placement, as used
  // by the "Extra tools" menu entry.
  const anchorPosition = ref<{ x: number; y: number } | null>(null)

  function open(anchor?: { x: number; y: number }) {
    isVisible.value = true
    anchorPosition.value = anchor ?? null
  }

  function close() {
    isVisible.value = false
  }

  function setActiveLabel(index: number, cursorPos: number | null) {
    activeLabelIndex.value = index
    activeCursorPos.value = cursorPos
  }

  function insertCharacter(char: string) {
    const keyboardStore = useKeyboardStore()
    if (keyboardStore.selectedKeys.length === 0) return

    const index = activeLabelIndex.value
    let newCursorPos = activeCursorPos.value

    keyboardStore.selectedKeys.forEach((key) => {
      const current = key.labels[index] || ''
      const result = insertCharacterAtCursor(current, char, activeCursorPos.value)
      key.labels[index] = result.text
      newCursorPos = result.cursorPos
    })

    activeCursorPos.value = newCursorPos
    keyboardStore.saveState()
    recentlyUsedCharactersManager.addCharacter(char)
  }

  return {
    isVisible,
    activeLabelIndex,
    activeCursorPos,
    anchorPosition,
    open,
    close,
    setActiveLabel,
    insertCharacter,
  }
})
