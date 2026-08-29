<template>
  <div
    v-if="visible"
    class="character-picker-panel"
    ref="panelRef"
    :style="{ transform: `translate(${position.x}px, ${position.y}px)` }"
    @mousedown="handleMouseDown"
  >
    <div class="panel-content">
      <div class="panel-header" @mousedown="handleHeaderMouseDown">
        <div class="panel-title">
          <BiGripVertical class="me-2 drag-handle" />
          <BiFonts class="me-2" />
          Character Picker
        </div>
        <button
          type="button"
          class="btn-close"
          @click="handleClose"
          @mousedown.stop
          aria-label="Close"
        ></button>
      </div>

      <div class="panel-body">
        <div class="picker-controls">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="form-control form-control-sm mb-1"
            placeholder="Search characters (e.g. copy, heart, alpha)…"
            autocomplete="off"
            @keydown.down.prevent="focusFirstTile"
          />

          <div v-if="hasNoSelection" class="alert alert-warning py-1 px-2 small mb-1">
            Select a key to insert characters
          </div>

          <ScrollableTabs
            class="mb-0"
            :model-value="displayedActiveCategory"
            @update:model-value="handleTabClick"
            :tabs="TABS"
            variable-width
            testid-prefix="char-picker-tab"
          />
        </div>

        <div class="picker-scroll-area">
          <div
            v-if="recentlyUsedEntities.length && !searchQuery.trim() && activeCategory === 'All'"
            class="recently-used mb-2"
          >
            <div class="text-muted small mb-1">Recently used</div>
            <div class="char-grid">
              <button
                v-for="entity in recentlyUsedEntities"
                :key="`recent-${entity.char}`"
                type="button"
                class="char-tile"
                :class="{ 'char-tile-flash': flashedChar === entity.char }"
                :disabled="hasNoSelection"
                :title="tileTitle(entity)"
                @click="handleTileClick(entity)"
              >
                {{ entity.char }}
              </button>
            </div>
          </div>

          <div class="char-grid" ref="gridRef">
            <button
              v-for="(entity, index) in filteredEntities"
              :key="entity.name"
              type="button"
              class="char-tile"
              :class="{ 'char-tile-flash': flashedChar === entity.char }"
              :disabled="hasNoSelection"
              :title="tileTitle(entity)"
              @click="handleTileClick(entity)"
              @keydown="handleGridKeydown($event, index)"
            >
              {{ entity.char }}
            </button>
          </div>
          <p v-if="!filteredEntities.length" class="text-muted fst-italic text-center py-3 mb-0">
            No characters found
          </p>
        </div>

        <div class="form-text picker-footer">
          {{
            searchQuery.trim() || activeCategory !== 'All'
              ? `${filteredEntities.length} result(s)`
              : `${CHARACTER_ENTITIES.length} characters available`
          }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Fuse from 'fuse.js'
import { useDraggablePanel } from '@/composables/useDraggablePanel'
import { useKeyboardStore } from '@/stores/keyboard'
import { useCharacterPickerStore } from '@/stores/characterPicker'
import {
  CHARACTER_ENTITIES,
  type CharacterEntity,
  type CharacterCategory,
} from '@/data/characterEntities'
import { recentlyUsedCharactersManager } from '@/utils/recently-used-characters'
import ScrollableTabs from './ScrollableTabs.vue'
import BiGripVertical from 'bootstrap-icons/icons/grip-vertical.svg'
import BiFonts from 'bootstrap-icons/icons/fonts.svg'

interface Props {
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
})

interface Emits {
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

const keyboardStore = useKeyboardStore()
const characterPickerStore = useCharacterPickerStore()

const searchInputRef = ref<HTMLInputElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const flashedChar = ref<string | null>(null)
let flashTimeoutId: ReturnType<typeof setTimeout> | undefined

const hasNoSelection = computed(() => keyboardStore.selectedKeys.length === 0)

// Fixed display order, independent of dataset regeneration order — 'All' is
// the default browsing tab, matching the flat-list behavior before tabs existed.
const CATEGORY_ORDER: CharacterCategory[] = [
  'Latin',
  'Greek',
  'Cyrillic',
  'Symbols',
  'Math',
  'Arrows',
  'Punctuation',
  'Shapes',
  'Technical',
  'Diacritics',
]
const TABS = ['All', ...CATEGORY_ORDER].map((id) => ({ id, label: id }))
const activeCategory = ref<'All' | CharacterCategory>('All')

// While the user is searching, the category filter is bypassed (see
// filteredEntities below) — show "All" as the active tab rather than
// whichever category was selected before, since search spans everything.
// This is a display-only override: it never writes to `activeCategory`
// itself, so the real selection is preserved for when the search clears.
const displayedActiveCategory = computed(() =>
  searchQuery.value.trim() ? 'All' : activeCategory.value,
)

// ScrollableTabs is bound via explicit props/emit (not v-model sugar) so this
// only fires for genuine user clicks, not our own displayedActiveCategory
// override above — a plain v-model tie would otherwise fight that override.
function handleTabClick(id: string) {
  activeCategory.value = id as 'All' | CharacterCategory
  searchQuery.value = ''
}

const charToEntity = new Map(CHARACTER_ENTITIES.map((entity) => [entity.char, entity]))
const recentlyUsedChars = ref<string[]>([])
const recentlyUsedEntities = computed<CharacterEntity[]>(() =>
  recentlyUsedChars.value
    .map((char) => charToEntity.get(char))
    .filter((entity): entity is CharacterEntity => entity !== undefined),
)

// CHARACTER_ENTITIES is a static import, so a single Fuse instance built once
// is sufficient — unlike search modals backed by fetched/async data.
const fuse = new Fuse(CHARACTER_ENTITIES, {
  keys: ['name'],
  includeScore: true,
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 2,
  distance: 200,
})

// Searching intentionally overrides the active tab and searches every entity —
// a typed query is a stronger signal of intent than whichever tab happened to
// be selected, matching common tabbed-picker UX (e.g. emoji pickers).
const filteredEntities = computed<CharacterEntity[]>(() => {
  const query = searchQuery.value.trim()
  if (query) return fuse.search(query).map((result) => result.item)
  if (activeCategory.value === 'All') return CHARACTER_ENTITIES
  return CHARACTER_ENTITIES.filter((entity) => entity.category === activeCategory.value)
})

function tileTitle(entity: CharacterEntity): string {
  return `${entity.name} (U+${entity.codepoint.toString(16).toUpperCase()})`
}

const { position, panelRef, handleMouseDown, handleHeaderMouseDown, initializePosition } =
  useDraggablePanel({
    defaultPosition: { x: 100, y: 100 },
    margin: 10,
    headerHeight: 45,
  })

watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      const anchor = characterPickerStore.anchorPosition
      if (anchor) {
        initializePosition(anchor)
      } else {
        const panelWidth = 360
        const margin = 20
        initializePosition({ x: window.innerWidth - panelWidth - margin, y: 100 })
      }
      recentlyUsedChars.value = recentlyUsedCharactersManager.getRecentlyUsedCharacters()

      await nextTick()
      searchInputRef.value?.focus()
    }
  },
)

function handleClose() {
  searchQuery.value = ''
  activeCategory.value = 'All'
  emit('close')
}

function handleTileClick(entity: CharacterEntity) {
  characterPickerStore.insertCharacter(entity.char)
  recentlyUsedChars.value = recentlyUsedCharactersManager.getRecentlyUsedCharacters()

  flashedChar.value = entity.char
  if (flashTimeoutId) clearTimeout(flashTimeoutId)
  flashTimeoutId = setTimeout(() => {
    flashedChar.value = null
  }, 300)
}

function gridTiles(): HTMLButtonElement[] {
  return Array.from(gridRef.value?.querySelectorAll<HTMLButtonElement>('.char-tile') ?? [])
}

function focusTile(index: number) {
  gridTiles()[index]?.focus()
}

function focusFirstTile() {
  focusTile(0)
}

function getColumnCount(): number {
  if (!gridRef.value) return 1
  const columns = getComputedStyle(gridRef.value).gridTemplateColumns.split(' ').filter(Boolean)
  return columns.length || 1
}

function handleGridKeydown(event: KeyboardEvent, index: number) {
  const columns = getColumnCount()
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault()
      focusTile(index + 1)
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (index === 0) {
        searchInputRef.value?.focus()
      } else {
        focusTile(index - 1)
      }
      break
    case 'ArrowDown':
      event.preventDefault()
      focusTile(index + columns)
      break
    case 'ArrowUp':
      event.preventDefault()
      if (index - columns < 0) {
        searchInputRef.value?.focus()
      } else {
        focusTile(index - columns)
      }
      break
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.visible) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (flashTimeoutId) clearTimeout(flashTimeoutId)
})
</script>

<style scoped>
.character-picker-panel {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  width: 360px;
  user-select: none;
}

@media (max-width: 767.98px) {
  .character-picker-panel {
    position: fixed !important;
    top: auto !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: auto !important;
    max-height: 60vh !important;
    transform: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    border-left: none !important;
    border-right: none !important;
    border-bottom: none !important;
  }

  .character-picker-panel .panel-content {
    border-radius: 0 !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
  }

  .character-picker-panel .panel-body {
    flex: 1 !important;
    max-height: none !important;
  }
}

.panel-content {
  background-color: var(--bs-body-bg);
  border-radius: 8px;
  box-shadow: var(--bs-box-shadow-lg);
  border: 1px solid var(--bs-border-color);
  overflow: hidden;
}

.panel-header {
  background-color: var(--bs-tertiary-bg);
  border-bottom: 1px solid var(--bs-border-color);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
}

.panel-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: var(--bs-text-primary);
  display: flex;
  align-items: center;
}

.drag-handle {
  color: #6c757d;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.panel-body {
  padding: 12px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Search, warning, and tabs stay pinned above the scrollable character grid. */
.picker-controls {
  flex-shrink: 0;
}

.picker-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.picker-footer {
  flex-shrink: 0;
  margin-top: 8px;
  margin-bottom: 0;
}

.recently-used {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--bs-border-color);
}

.char-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.1rem, 1fr));
  gap: 4px;
}

.char-tile {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  padding: 0;
  background-color: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 4px;
  color: var(--bs-body-color);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.char-tile:hover:not(:disabled) {
  background-color: var(--bs-primary-bg-subtle);
  border-color: var(--bs-primary);
}

.char-tile:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.char-tile-flash {
  background-color: var(--bs-success-bg-subtle);
  border-color: var(--bs-success);
}
</style>
