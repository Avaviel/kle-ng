<template>
  <div
    v-if="visible"
    class="move-exactly-panel"
    ref="panelRef"
    :style="{ transform: `translate(${position.x}px, ${position.y}px)` }"
    @mousedown="handleMouseDown"
  >
    <div class="panel-content">
      <div class="panel-header" @mousedown="handleHeaderMouseDown">
        <div class="panel-title">
          <BiGripVertical class="me-2 drag-handle" />
          <BiArrowsMove class="me-2" />
          Move Exactly
        </div>
        <button
          type="button"
          class="btn-close"
          @click="handleCancel"
          @mousedown.stop
          aria-label="Close"
        ></button>
      </div>

      <div class="panel-body">
        <!-- Unit selection -->
        <div class="unit-selection mb-3">
          <div class="d-flex align-items-center gap-3">
            <label class="form-label small mb-0 text-nowrap">Unit:</label>
            <div class="btn-group" role="group">
              <input
                type="radio"
                class="btn-check"
                id="unit-u"
                value="U"
                v-model="selectedUnit"
                autocomplete="off"
                @change="handleUnitChange"
              />
              <label class="btn btn-outline-primary btn-sm" for="unit-u">U</label>

              <input
                type="radio"
                class="btn-check"
                id="unit-mm"
                value="mm"
                v-model="selectedUnit"
                autocomplete="off"
                @change="handleUnitChange"
              />
              <label class="btn btn-outline-primary btn-sm" for="unit-mm">mm</label>
            </div>
          </div>
        </div>

        <!-- Spacing configuration (only for mm mode) -->
        <div v-if="selectedUnit === 'mm'" class="spacing-config mb-3">
          <div class="row g-2">
            <div class="col-6">
              <label class="form-label small mb-1">X Spacing:</label>
              <CustomNumberInput
                :model-value="uSpacing.x"
                @change="updateUSpacingX"
                :step="0.05"
                :min="10"
                :max="30"
                :value-on-clear="19.05"
              >
                <template #suffix>mm/U</template>
              </CustomNumberInput>
            </div>
            <div class="col-6">
              <label class="form-label small mb-1">Y Spacing:</label>
              <CustomNumberInput
                :model-value="uSpacing.y"
                @change="updateUSpacingY"
                :step="0.05"
                :min="10"
                :max="30"
                :value-on-clear="19.05"
              >
                <template #suffix>mm/U</template>
              </CustomNumberInput>
            </div>
          </div>
          <small class="form-text text-muted"> Configure mm-to-U conversion </small>
        </div>

        <!-- X/Y movement inputs -->
        <div class="movement-inputs mb-3">
          <div class="row g-2">
            <div class="col-6">
              <label class="form-label small mb-1">X Movement:</label>
              <CustomNumberInput
                :model-value="movementX"
                @change="updateMovementX"
                :step="0.1"
                :value-on-clear="0"
              >
                <template #suffix>{{ selectedUnit }}</template>
              </CustomNumberInput>
            </div>
            <div class="col-6">
              <label class="form-label small mb-1">Y Movement:</label>
              <CustomNumberInput
                :model-value="movementY"
                @change="updateMovementY"
                :step="0.1"
                :value-on-clear="0"
              >
                <template #suffix>{{ selectedUnit }}</template>
              </CustomNumberInput>
            </div>
          </div>
          <small class="form-text text-muted">
            <span>
              Focus and scroll: ±0.1{{ selectedUnit }}, Ctrl+scroll: ±1.0{{ selectedUnit }}
            </span>
          </small>
        </div>
      </div>

      <div class="panel-footer">
        <button
          type="button"
          class="btn btn-secondary btn-sm d-flex align-items-center gap-1"
          @mousedown.prevent.stop="handleCancel"
        >
          <BiXCircle />
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm d-flex align-items-center gap-1"
          @mousedown.prevent.stop="handleApply"
        >
          <BiCheckCircle />
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDraggablePanel } from '@/composables/useDraggablePanel'
import { useKeyboardStore } from '@/stores/keyboard'
import CustomNumberInput from './CustomNumberInput.vue'
import BiGripVertical from 'bootstrap-icons/icons/grip-vertical.svg'
import BiArrowsMove from 'bootstrap-icons/icons/arrows-move.svg'
import BiXCircle from 'bootstrap-icons/icons/x-circle.svg'
import BiCheckCircle from 'bootstrap-icons/icons/check-circle.svg'

// Props
interface Props {
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
})

// Emits
interface Emits {
  (e: 'apply', deltaX: number, deltaY: number): void
  (e: 'cancel'): void
  (e: 'movementChange', deltaX: number, deltaY: number): void
}

const emit = defineEmits<Emits>()

const keyboardStore = useKeyboardStore()

// Helper to get current spacing from keyboard metadata
const getMetadataSpacing = () => ({
  x: keyboardStore.metadata.spacing_x || 19.05,
  y: keyboardStore.metadata.spacing_y || 19.05,
})

// Local state
const movementX = ref(0)
const movementY = ref(0)
const selectedUnit = ref<'U' | 'mm'>('U')
const uSpacing = ref(getMetadataSpacing())

// Persistent state for last used values (survives modal close/open cycles)
const lastUsedValues = ref({
  movementX: 0,
  movementY: 0,
  selectedUnit: 'U' as 'U' | 'mm',
})

// Dragging functionality with viewport bounds checking
const { position, panelRef, handleMouseDown, handleHeaderMouseDown, initializePosition } =
  useDraggablePanel({
    defaultPosition: { x: 100, y: 100 },
    margin: 10,
    headerHeight: 45, // Approximate height of the panel header
  })

// Watch for modal visibility - restore last used values and auto-focus
watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      // Restore last used values for better UX
      movementX.value = lastUsedValues.value.movementX
      movementY.value = lastUsedValues.value.movementY
      selectedUnit.value = lastUsedValues.value.selectedUnit
      // Always sync spacing from keyboard metadata (user can still override in-modal)
      uSpacing.value = getMetadataSpacing()
      initializePosition({ x: window.innerWidth - 400, y: 100 })

      // Note: the prefilled values are not previewed on open (parity with old behavior) -
      // the live preview only kicks in once the user edits a field. Apply still uses the
      // prefilled values even untouched (see handleApply).

      // Modal is now visible and ready for interaction
      await nextTick()

      // Auto-focus the X input for better UX
      const xInput = document.querySelector(
        '.move-exactly-panel .custom-number-input input',
      ) as HTMLInputElement
      if (xInput) {
        xInput.focus()
        xInput.select() // Select the text for easy replacement
      }
    }
  },
)

// Methods
const convertXToInternalUnits = (xValue: number): number => {
  if (selectedUnit.value === 'U') {
    return xValue
  } else {
    return xValue / uSpacing.value.x
  }
}

const convertYToInternalUnits = (yValue: number): number => {
  if (selectedUnit.value === 'U') {
    return yValue
  } else {
    return yValue / uSpacing.value.y
  }
}

// Recompute the delta from the current field values (in whichever unit/spacing is
// currently selected) and emit it for immediate preview
const emitMovementPreview = () => {
  const deltaX = convertXToInternalUnits(movementX.value)
  const deltaY = convertYToInternalUnits(movementY.value)
  emit('movementChange', deltaX, deltaY)
}

// Update spacing values
const updateUSpacingX = (value: number | undefined) => {
  if (value !== undefined) {
    uSpacing.value.x = value
    emitMovementPreview()
  }
}

const updateUSpacingY = (value: number | undefined) => {
  if (value !== undefined) {
    uSpacing.value.y = value
    emitMovementPreview()
  }
}

// Update movement values and emit changes
const updateMovementX = (value: number | undefined) => {
  // Treat undefined (cleared input) as 0 for natural no-movement behavior
  movementX.value = value ?? 0
  emitMovementPreview()
}

const updateMovementY = (value: number | undefined) => {
  // Treat undefined (cleared input) as 0 for natural no-movement behavior
  movementY.value = value ?? 0
  emitMovementPreview()
}

// Re-preview when the user toggles U/mm — the field values are reinterpreted under the
// new unit (not converted), so the resulting canvas delta changes even though the
// displayed numbers don't. Bound to the radios' native `change` event (not a watcher on
// selectedUnit) so it only fires on an actual user click, not the programmatic restore
// of lastUsedValues.selectedUnit when the modal opens.
const handleUnitChange = () => {
  emitMovementPreview()
}

const handleApply = () => {
  // Convert the movement values to internal units
  const deltaX = convertXToInternalUnits(movementX.value)
  const deltaY = convertYToInternalUnits(movementY.value)

  // Save current values for future use (only when applied, not cancelled)
  // Note: uSpacing is not saved here - it always syncs from keyboard metadata on open
  lastUsedValues.value = {
    movementX: movementX.value,
    movementY: movementY.value,
    selectedUnit: selectedUnit.value,
  }

  emit('apply', deltaX, deltaY)
}

const handleCancel = () => {
  emit('cancel')
}

// Dragging functionality is now handled by the useDraggablePanel composable

// Watch for keyboard escape key
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.visible) {
    handleCancel()
  } else if (event.key === 'Enter' && props.visible) {
    handleApply()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.move-exactly-panel {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  width: 360px;
  user-select: none;
}

/* Mobile anchoring - similar to Key Properties panel */
@media (max-width: 767.98px) {
  .move-exactly-panel {
    position: fixed !important;
    top: auto !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: auto !important;
    max-height: 50vh !important;
    transform: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    border-left: none !important;
    border-right: none !important;
    border-bottom: none !important;
  }

  .move-exactly-panel .panel-content {
    border-radius: 0 !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
  }

  .move-exactly-panel .panel-body {
    flex: 1 !important;
    overflow-y: auto !important;
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
  max-height: 500px;
  overflow-y: auto;
}

.panel-footer {
  border-top: 1px solid var(--bs-border-color);
  padding: 8px 12px;
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  background-color: var(--bs-tertiary-bg);
}

.unit-selection {
  background: var(--bs-tertiary-bg);
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid var(--bs-primary);
}

.spacing-config {
  background-color: var(--bs-warning-bg-subtle);
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid var(--bs-warning);
}

/* Responsive adjustments */
@media (max-width: 575.98px) {
  .move-exactly-panel {
    width: 320px;
  }

  .panel-body {
    padding: 10px;
  }
}
</style>
