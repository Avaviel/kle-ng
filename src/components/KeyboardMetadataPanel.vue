<template>
  <div class="keyboard-metadata-panel">
    <div class="row g-3">
      <!-- Left Column: Standard Metadata (with internal 2-column split) -->
      <div class="col-lg-6 col-md-12">
        <div class="property-group">
          <h6 class="property-group-title">Keyboard Metadata</h6>
          <div class="row g-3">
            <!-- Left sub-column -->
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label small mb-1">Name</label>
                <input
                  v-model="currentName"
                  @input="updateMetadata('name', currentName)"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="My Keyboard Layout"
                />
              </div>
              <div class="mb-3">
                <label class="form-label small mb-1">Author</label>
                <input
                  v-model="currentAuthor"
                  @input="updateMetadata('author', currentAuthor)"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Your Name"
                />
              </div>
              <div class="mb-3">
                <label class="form-label small mb-1">Background Color</label>
                <div class="input-group input-group-sm">
                  <ColorPicker
                    v-model="currentBackcolor"
                    @change="updateBackcolor"
                    @input="updateBackcolorPreview"
                    :show-alpha="true"
                    class="form-control form-control-color key-color-input"
                    style="width: 24px; flex: none; border-radius: 0"
                    title="Background Color"
                  />
                  <input
                    v-model="currentBackcolor"
                    @change="updateBackcolor"
                    type="text"
                    class="form-control form-control-sm"
                    style="font-size: 0.65rem"
                  />
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label small mb-1">Border Radii</label>
                <input
                  v-model="currentRadii"
                  @input="updateMetadata('radii', currentRadii)"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="6px (default)"
                  title="CSS border-radius (e.g., '10px', '5px 10px', '10px 20px 30px 40px', '10px / 20px'). Defaults to 6px when empty. Supports separate corners and elliptical radii. Affects both canvas display and PNG export."
                />
              </div>
              <div class="mb-3">
                <label class="form-label small mb-1">Spacing (mm/U)</label>
                <div class="row g-2">
                  <div class="col-6">
                    <label class="spacing-label">X</label>
                    <CustomNumberInput
                      v-model="currentSpacingX"
                      @change="updateSpacing('spacing_x', currentSpacingX, 19.05)"
                      @commit="keyboardStore.saveState()"
                      :value-on-clear="19.05"
                      :step="0.05"
                      :min="1"
                      title="Horizontal spacing in millimeters per U. Default: 19.05mm (Cherry MX standard)"
                      size="compact"
                    />
                  </div>
                  <div class="col-6">
                    <label class="spacing-label">Y</label>
                    <CustomNumberInput
                      v-model="currentSpacingY"
                      @change="updateSpacing('spacing_y', currentSpacingY, 19.05)"
                      @commit="keyboardStore.saveState()"
                      :value-on-clear="19.05"
                      :step="0.05"
                      :min="1"
                      title="Vertical spacing in millimeters per U. Default: 19.05mm (Cherry MX standard)"
                      size="compact"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Right sub-column: Notes and CSS -->
            <div class="col-md-6">
              <div class="h-100 d-flex flex-column">
                <div class="mb-2">
                  <label class="form-label small mb-1">Notes</label>
                  <textarea
                    v-model="currentNotes"
                    @input="updateMetadata('notes', currentNotes)"
                    class="form-control form-control-sm"
                    placeholder="Add notes about your keyboard layout..."
                    style="min-height: 60px; resize: none"
                  ></textarea>
                </div>
                <div class="flex-grow-1 d-flex flex-column">
                  <div class="d-flex align-items-center justify-content-between mb-1">
                    <label class="form-label small mb-0">CSS</label>
                    <button
                      @click="showCssHelp"
                      class="btn btn-sm btn-outline-secondary help-btn"
                      title="Help"
                      type="button"
                    >
                      <BiQuestionCircle />
                    </button>
                  </div>
                  <textarea
                    v-model="currentCss"
                    @input="updateCssInput"
                    @blur="updateCssBlur"
                    class="form-control form-control-sm font-monospace flex-grow-1"
                    placeholder="Custom CSS (only fonts impact render, see help)..."
                    style="min-height: 0; resize: none; font-size: 0.65rem"
                    spellcheck="false"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: QMK Metadata + VIA Metadata stacked -->
      <div class="col-lg-6 col-md-12 d-flex flex-column gap-3">
        <!-- QMK Metadata -->
        <div class="property-group d-flex flex-column" style="flex: 1 1 0">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="property-group-title mb-0">QMK Metadata</h6>
            <div class="d-flex align-items-center gap-1">
              <div v-if="qmkJsonError" class="text-danger small">
                <BiExclamationTriangle /> Invalid JSON
              </div>
              <div v-else-if="qmkMetadataJson.trim()" class="text-success small">
                <BiCheck /> Valid JSON
              </div>
              <button
                @click="showQmkHelp"
                class="btn btn-sm btn-outline-secondary help-btn"
                title="Help"
              >
                <BiQuestionCircle />
              </button>
            </div>
          </div>
          <div class="json-field-wrapper flex-grow-1">
            <div
              ref="qmkEditorContainer"
              class="json-editor-cm"
              :class="{ 'is-invalid': qmkJsonError }"
            ></div>
            <button
              class="expand-field-btn"
              @click.stop="openExpandModal('qmk')"
              type="button"
              title="Expand editor"
            >
              <BiArrowsFullscreen />
            </button>
          </div>
          <div v-if="qmkJsonError" class="invalid-feedback d-block mt-1">
            {{ qmkJsonErrorMessage }}
          </div>
        </div>

        <!-- VIA Metadata -->
        <div class="property-group d-flex flex-column" style="flex: 1 1 0">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="property-group-title mb-0">VIA Metadata</h6>
            <div class="d-flex align-items-center gap-1">
              <div v-if="viaJsonError" class="text-danger small">
                <BiExclamationTriangle /> Invalid JSON
              </div>
              <div v-else-if="viaMetadataJson.trim()" class="text-success small">
                <BiCheck /> Valid JSON
              </div>
              <button
                @click="showViaHelp"
                class="btn btn-sm btn-outline-secondary help-btn"
                title="Help"
              >
                <BiQuestionCircle />
              </button>
            </div>
          </div>
          <div class="json-field-wrapper flex-grow-1">
            <div
              ref="viaEditorContainer"
              class="json-editor-cm"
              :class="{ 'is-invalid': viaJsonError }"
            ></div>
            <button
              class="expand-field-btn"
              @click.stop="openExpandModal('via')"
              type="button"
              title="Expand editor"
            >
              <BiArrowsFullscreen />
            </button>
          </div>
          <div v-if="viaJsonError" class="invalid-feedback d-block mt-1">
            {{ viaJsonErrorMessage }}
          </div>
        </div>
      </div>
    </div>

    <!-- CSS Help Modal -->
    <CssHelpModal :is-visible="isCssHelpVisible" @close="closeCssHelp" />

    <!-- QMK Help Modal -->
    <QmkHelpModal :is-visible="isQmkHelpVisible" @close="closeQmkHelp" />

    <!-- VIA Help Modal -->
    <ViaHelpModal :is-visible="isViaHelpVisible" @close="closeViaHelp" />

    <!-- JSON Expand Modal -->
    <JsonExpandModal
      v-if="isExpandModalOpen"
      :title="expandModalTitle"
      :initial-value="expandModalValue"
      @close="closeExpandModal"
      @apply="applyExpandModal"
    />
  </div>
</template>

<style scoped>
/* Improved placeholder styling for better visual distinction */
.form-control::placeholder {
  font-style: italic;
  opacity: 0.6;
  color: var(--bs-secondary-color);
}

.form-control:focus::placeholder {
  opacity: 0.4;
}
</style>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getCodeMirror, getLoadedCodeMirror } from '@/utils/codemirror-loader'
import type { EditorView } from '@codemirror/view'
import { useKeyboardStore } from '@/stores/keyboard'
import { useFontStore } from '@/stores/font'
import ColorPicker from './ColorPicker.vue'
import CustomNumberInput from './CustomNumberInput.vue'
import CssHelpModal from './CssHelpModal.vue'
import ViaHelpModal from './ViaHelpModal.vue'
import QmkHelpModal from './QmkHelpModal.vue'
import JsonExpandModal from './JsonExpandModal.vue'
import LZString from 'lz-string'
import BiQuestionCircle from 'bootstrap-icons/icons/question-circle.svg'
import BiExclamationTriangle from 'bootstrap-icons/icons/exclamation-triangle.svg'
import BiCheck from 'bootstrap-icons/icons/check.svg'
import BiArrowsFullscreen from 'bootstrap-icons/icons/arrows-fullscreen.svg'

const keyboardStore = useKeyboardStore()
const fontStore = useFontStore()

// Help modals state
const isCssHelpVisible = ref(false)
const isViaHelpVisible = ref(false)
const isQmkHelpVisible = ref(false)

const showCssHelp = () => {
  isCssHelpVisible.value = true
}

const closeCssHelp = () => {
  isCssHelpVisible.value = false
}

const showViaHelp = () => {
  isViaHelpVisible.value = true
}

const closeViaHelp = () => {
  isViaHelpVisible.value = false
}

const showQmkHelp = () => {
  isQmkHelpVisible.value = true
}

const closeQmkHelp = () => {
  isQmkHelpVisible.value = false
}

// Expand modal state
const isExpandModalOpen = ref(false)
const expandModalTitle = ref('')
const expandModalValue = ref('')
const expandModalTarget = ref<'qmk' | 'via' | null>(null)

const openExpandModal = (target: 'qmk' | 'via') => {
  expandModalTarget.value = target
  expandModalTitle.value = target === 'qmk' ? 'QMK Metadata' : 'VIA Metadata'
  expandModalValue.value = target === 'qmk' ? qmkMetadataJson.value : viaMetadataJson.value
  isExpandModalOpen.value = true
}

const closeExpandModal = () => {
  isExpandModalOpen.value = false
}

const applyExpandModal = (value: string) => {
  if (expandModalTarget.value === 'qmk') {
    qmkMetadataJson.value = value
    updateQmkMetadata()
  } else if (expandModalTarget.value === 'via') {
    viaMetadataJson.value = value
    updateViaMetadata()
  }
  isExpandModalOpen.value = false
}

// Reactive property values
const currentName = ref('')
const currentAuthor = ref('')
const currentNotes = ref('')
const currentCss = ref('')
const currentBackcolor = ref('#ffffff')
const currentRadii = ref('')
const currentSpacingX = ref<number>(19.05)
const currentSpacingY = ref<number>(19.05)

// QMK metadata state
const qmkMetadataJson = ref('')
const qmkJsonError = ref(false)
const qmkJsonErrorMessage = ref('')

// VIA metadata state
const viaMetadataJson = ref('')
const viaJsonError = ref(false)
const viaJsonErrorMessage = ref('')

// Extended metadata interface
interface ExtendedMetadata {
  _kleng_qmk_data?: string
  _kleng_via_data?: string
  [key: string]: unknown
}

// Parse QMK metadata from compressed string
const parseQmkMetadata = () => {
  try {
    const metadata = keyboardStore.metadata as unknown as ExtendedMetadata
    if (metadata._kleng_qmk_data) {
      const decompressed = LZString.decompressFromBase64(metadata._kleng_qmk_data)
      if (decompressed) {
        qmkMetadataJson.value = JSON.stringify(JSON.parse(decompressed), null, 2)
      } else {
        qmkMetadataJson.value = ''
      }
    } else {
      qmkMetadataJson.value = ''
    }
  } catch (error) {
    console.error('Error parsing QMK metadata:', error)
    qmkMetadataJson.value = ''
  }
}

const validateQmkJson = (): boolean => {
  try {
    if (!qmkMetadataJson.value.trim()) {
      qmkJsonError.value = false
      qmkJsonErrorMessage.value = ''
      return true
    }
    JSON.parse(qmkMetadataJson.value)
    qmkJsonError.value = false
    qmkJsonErrorMessage.value = ''
    return true
  } catch (error) {
    qmkJsonError.value = true
    qmkJsonErrorMessage.value = error instanceof Error ? error.message : 'Invalid JSON format'
    return false
  }
}

const updateQmkMetadata = () => {
  if (!validateQmkJson()) return
  try {
    const metadata = keyboardStore.metadata as unknown as ExtendedMetadata
    if (!qmkMetadataJson.value.trim()) {
      delete metadata._kleng_qmk_data
      keyboardStore.saveState()
      return
    }
    metadata._kleng_qmk_data = LZString.compressToBase64(qmkMetadataJson.value)
    keyboardStore.saveState()
  } catch (error) {
    console.error('Error saving QMK metadata:', error)
  }
}

// Parse VIA metadata from compressed string
const parseViaMetadata = () => {
  try {
    const metadata = keyboardStore.metadata as unknown as ExtendedMetadata
    if (metadata._kleng_via_data) {
      const decompressed = LZString.decompressFromBase64(metadata._kleng_via_data)
      if (decompressed) {
        viaMetadataJson.value = JSON.stringify(JSON.parse(decompressed), null, 2)
      } else {
        viaMetadataJson.value = ''
      }
    } else {
      viaMetadataJson.value = ''
    }
  } catch (error) {
    console.error('Error parsing VIA metadata:', error)
    viaMetadataJson.value = ''
  }
}

// Validate VIA JSON
const validateViaJson = (): boolean => {
  try {
    if (!viaMetadataJson.value.trim()) {
      // Empty is valid
      viaJsonError.value = false
      viaJsonErrorMessage.value = ''
      return true
    }

    JSON.parse(viaMetadataJson.value)
    viaJsonError.value = false
    viaJsonErrorMessage.value = ''
    return true
  } catch (error) {
    viaJsonError.value = true
    viaJsonErrorMessage.value = error instanceof Error ? error.message : 'Invalid JSON format'
    return false
  }
}

// Update VIA metadata when editing
const updateViaMetadata = () => {
  // First validate
  if (!validateViaJson()) {
    return
  }

  try {
    const metadata = keyboardStore.metadata as unknown as ExtendedMetadata

    if (!viaMetadataJson.value.trim()) {
      // Empty field - clear VIA metadata
      delete metadata._kleng_via_data
      keyboardStore.saveState()
      return
    }

    // Compress and save
    const compressed = LZString.compressToBase64(viaMetadataJson.value)
    metadata._kleng_via_data = compressed

    keyboardStore.saveState()
  } catch (error) {
    console.error('Error saving VIA metadata:', error)
  }
}

// Update current values from store
const updateCurrentValues = () => {
  const metadata = keyboardStore.metadata
  currentName.value = metadata.name || ''
  currentAuthor.value = metadata.author || ''
  currentNotes.value = metadata.notes || ''
  currentCss.value = metadata.css || ''
  currentBackcolor.value = metadata.backcolor || '#ffffff'
  currentRadii.value = metadata.radii || ''
  currentSpacingX.value = metadata.spacing_x || 19.05
  currentSpacingY.value = metadata.spacing_y || 19.05

  // Parse QMK and VIA metadata
  parseQmkMetadata()
  parseViaMetadata()
}

// Watch for metadata changes from store
watch(
  () => keyboardStore.metadata,
  () => {
    updateCurrentValues()
  },
  { deep: true, immediate: true },
)

// Update metadata in store
const updateMetadata = (field: string, value: string | number | undefined) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(keyboardStore.metadata as any)[field] = value
  keyboardStore.saveState()
}

const updateSpacing = (field: string, value: number, defaultval: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(keyboardStore.metadata as any)[field] = value !== defaultval ? value : undefined
}

// Update CSS input (while typing) - save to store but don't reload fonts
const updateCssInput = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(keyboardStore.metadata as any).css = currentCss.value
  keyboardStore.saveState()
}

// Update CSS on blur (when field loses focus) - apply font settings
const updateCssBlur = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(keyboardStore.metadata as any).css = currentCss.value
  keyboardStore.saveState()

  // Apply font settings when user finishes editing (with notification)
  fontStore.applyFromCssMetadata(currentCss.value, true)
}

// Live preview background color update (no state save)
const updateBackcolorPreview = () => {
  // Force reactivity by reassigning the entire metadata object
  keyboardStore.metadata = {
    ...keyboardStore.metadata,
    backcolor: currentBackcolor.value,
  }
}

const updateBackcolor = () => {
  // Force reactivity by reassigning the entire metadata object
  keyboardStore.metadata = {
    ...keyboardStore.metadata,
    backcolor: currentBackcolor.value,
  }
  keyboardStore.saveState()
}

// ── CodeMirror editors for QMK and VIA fields ─────────────────────────────

const qmkEditorContainer = ref<HTMLElement | null>(null)
const viaEditorContainer = ref<HTMLElement | null>(null)
let qmkEditorView: EditorView | null = null
let viaEditorView: EditorView | null = null
let isQmkProgrammaticUpdate = false
let isViaProgrammaticUpdate = false
let themeObserver: MutationObserver | null = null

function getTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light'
}

async function rebuildQmkEditor(): Promise<void> {
  if (!qmkEditorContainer.value) return
  const cm = await getCodeMirror()
  if (!qmkEditorContainer.value) return

  if (qmkEditorView) {
    cm.destroyEditor(qmkEditorView)
    qmkEditorView = null
    qmkEditorContainer.value.innerHTML = ''
  }

  qmkEditorView = cm.createJsonEditor(qmkEditorContainer.value, qmkMetadataJson.value, getTheme(), {
    onChange: (content) => {
      if (isQmkProgrammaticUpdate) return
      qmkMetadataJson.value = content
      updateQmkMetadata()
    },
  })
}

async function rebuildViaEditor(): Promise<void> {
  if (!viaEditorContainer.value) return
  const cm = await getCodeMirror()
  if (!viaEditorContainer.value) return

  if (viaEditorView) {
    cm.destroyEditor(viaEditorView)
    viaEditorView = null
    viaEditorContainer.value.innerHTML = ''
  }

  viaEditorView = cm.createJsonEditor(viaEditorContainer.value, viaMetadataJson.value, getTheme(), {
    onChange: (content) => {
      if (isViaProgrammaticUpdate) return
      viaMetadataJson.value = content
      updateViaMetadata()
    },
  })
}

// Push external changes (store watcher, undo/redo) into the CodeMirror editors
watch(qmkMetadataJson, (newVal) => {
  if (!qmkEditorView) return
  getCodeMirror().then((cm) => {
    isQmkProgrammaticUpdate = true
    cm.updateContent(qmkEditorView!, newVal)
    isQmkProgrammaticUpdate = false
  })
})

watch(viaMetadataJson, (newVal) => {
  if (!viaEditorView) return
  getCodeMirror().then((cm) => {
    isViaProgrammaticUpdate = true
    cm.updateContent(viaEditorView!, newVal)
    isViaProgrammaticUpdate = false
  })
})

onMounted(async () => {
  try {
    await Promise.all([rebuildQmkEditor(), rebuildViaEditor()])
  } catch (err) {
    console.error('Failed to load CodeMirror for metadata editors:', err)
  }

  themeObserver = new MutationObserver(() => {
    rebuildQmkEditor().catch(console.error)
    rebuildViaEditor().catch(console.error)
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme'],
  })
})

onUnmounted(() => {
  themeObserver?.disconnect()
  themeObserver = null

  const cm = getLoadedCodeMirror()
  if (qmkEditorView) {
    if (cm) cm.destroyEditor(qmkEditorView)
    qmkEditorView = null
  }
  if (viaEditorView) {
    if (cm) cm.destroyEditor(viaEditorView)
    viaEditorView = null
  }
})
</script>

<style scoped>
/* Override Bootstrap's responsive column behavior - use flexbox for responsive wrapping */
.keyboard-metadata-panel .col-lg-6.col-md-12 {
  flex: 1 1 340px;
  max-width: 500px;
}

/* On very small screens, allow property groups to be full width and remove padding */
@media (max-width: 575.98px) {
  .keyboard-metadata-panel .col-lg-6.col-md-12 {
    padding-left: 0px;
    padding-right: 0px;
  }
}

@media (max-width: 767.98px) {
  .keyboard-metadata-panel .col-lg-6.col-md-12 {
    max-width: 100%;
  }
}

/* Property groups styling */
.property-group {
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 6px;
  padding: 12px;
  height: 100%;
}

.property-group-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: 4px;
}

.form-control-sm {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.form-control-color {
  padding: 0.125rem;
  border: 1px solid var(--bs-border-color);
}

.form-label.small {
  font-size: 0.7rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.spacing-label {
  font-size: 0.65rem;
  color: var(--bs-body-color);
  font-weight: 500;
  display: block;
  margin-bottom: 1px;
  line-height: 1;
}

.invalid-feedback {
  font-size: 0.65rem;
}

/* Help button styling */
.help-btn {
  font-size: 0.875rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 4px;
}

/* JSON field wrapper with expand button */
.json-field-wrapper {
  position: relative;
  min-height: 80px;
}

/* Absolute fill so CodeMirror doesn't inflate the wrapper's layout height */
.json-editor-cm {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-sm);
  transition: border-color 0.15s ease;
}

.json-editor-cm.is-invalid {
  border-color: var(--bs-danger);
}

.json-editor-cm :deep(.cm-editor) {
  height: 100%;
}

.json-editor-cm :deep(.cm-scroller) {
  height: 100%;
  overflow: auto;
}

.expand-field-btn {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bs-secondary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 3px;
  opacity: 0.4;
  cursor: pointer;
  padding: 2px;
  font-size: 0.65rem;
  color: var(--bs-secondary-color);
  z-index: 2;
  transition: opacity 0.15s;
}

.expand-field-btn:hover {
  opacity: 1;
  color: var(--bs-body-color);
}
</style>
