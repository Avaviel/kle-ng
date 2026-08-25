<template>
  <div
    v-if="visible"
    class="sanitize-tool-panel"
    ref="panelRef"
    :style="{ transform: `translate(${position.x}px, ${position.y}px)` }"
    @mousedown="handleMouseDown"
  >
    <div class="panel-content">
      <div class="panel-header" @mousedown="handleHeaderMouseDown">
        <div class="panel-title">
          <BiGripVertical class="me-2 drag-handle" />
          <BiMagic class="me-2" />
          Sanitize Layout
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
        <!-- One status line at most: the result of the last Apply takes precedence,
             since an all-clean layout is already evident from the zeroed counts. -->
        <div v-if="lastAppliedMessage" class="status-banner" data-testid="sanitize-result">
          <BiCheckCircle class="me-2" />
          <span>{{ lastAppliedMessage }}</span>
        </div>
        <div v-else-if="isClean" class="status-banner clean-banner">
          <BiCheckCircle class="me-2" />
          <span>Nothing to clean up.</span>
        </div>

        <!-- Rule groups, one per kind -->
        <div
          v-for="group in groups"
          :key="group.kind"
          class="controls-section"
          :data-testid="`sanitize-group-${group.kind}`"
        >
          <h6 class="section-title">{{ group.title }}</h6>

          <div
            v-for="result in group.results"
            :key="result.ruleId"
            class="rule-row"
            :data-testid="`sanitize-rule-${result.ruleId}`"
          >
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                :id="`sanitize-${result.ruleId}`"
                :checked="selectedRuleIds.has(result.ruleId)"
                :disabled="result.count === 0"
                :data-testid="`sanitize-checkbox-${result.ruleId}`"
                @change="toggleRule(result.ruleId)"
              />
              <!-- Name and count on one line, a short description under it. -->
              <label class="form-check-label" :for="`sanitize-${result.ruleId}`">
                <span class="rule-heading">
                  <span class="rule-name">{{ result.name }}</span>
                  <span
                    class="count-badge"
                    :class="badgeClass(result)"
                    :data-testid="`sanitize-count-${result.ruleId}`"
                  >
                    {{ result.count }}
                  </span>
                </span>
                <span class="rule-description">{{ result.description }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="action-buttons">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            title="Scan the layout again"
            @click="handleRescan"
          >
            <span class="d-flex align-items-center justify-content-center gap-1">
              <BiArrowRepeat />
              Rescan
            </span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm flex-fill" @click="handleClose">
            <span class="d-flex align-items-center justify-content-center gap-1">
              <BiXCircle />
              Close
            </span>
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm flex-fill"
            data-testid="sanitize-apply"
            @click="handleApply"
            :disabled="!canApply"
          >
            <span class="d-flex align-items-center justify-content-center gap-1">
              <BiCheckCircle />
              Apply Fixes
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useKeyboardStore } from '@/stores/keyboard'
import { useDraggablePanel } from '@/composables/useDraggablePanel'
import { scanLayout, type SanitizeCategorySummary, type SanitizeRuleKind } from '@/utils/sanitize'
import BiGripVertical from 'bootstrap-icons/icons/grip-vertical.svg'
import BiMagic from 'bootstrap-icons/icons/magic.svg'
import BiArrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg'
import BiXCircle from 'bootstrap-icons/icons/x-circle.svg'
import BiCheckCircle from 'bootstrap-icons/icons/check-circle.svg'

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

// Local state only — the scan result list is transient, tied to "the panel is
// currently open", with nothing to reuse or persist across mounts.
const scanResults = ref<SanitizeCategorySummary[]>([])
const selectedRuleIds = ref<Set<string>>(new Set())
const lastApplied = ref<{ fields: number; normalizations: number } | null>(null)

const { position, panelRef, handleMouseDown, handleHeaderMouseDown, initializePosition } =
  useDraggablePanel({
    defaultPosition: { x: 100, y: 100 },
    margin: 10,
    headerHeight: 45,
  })

const GROUP_TITLES: Record<SanitizeRuleKind, string> = {
  redundancy: 'Redundant data',
  normalization: 'Normalization',
}

// Derived from scanResults rather than hardcoded, so a future rule lands in the
// right group automatically. Groups with no rules render nothing.
const groups = computed(() => {
  return (Object.keys(GROUP_TITLES) as SanitizeRuleKind[])
    .map((kind) => ({
      kind,
      title: GROUP_TITLES[kind],
      results: scanResults.value.filter((r) => r.kind === kind),
    }))
    .filter((group) => group.results.length > 0)
})

const isClean = computed(
  () => scanResults.value.length > 0 && scanResults.value.every((r) => r.count === 0),
)

const canApply = computed(() =>
  scanResults.value.some((r) => selectedRuleIds.value.has(r.ruleId) && r.count > 0),
)

// The two kinds are counted on different scales — per-field for redundancy, 0-or-1
// per whole-layout operation for normalization — so they are reported separately
// rather than summed into a meaningless total.
const lastAppliedMessage = computed(() => {
  const applied = lastApplied.value
  if (!applied) return ''

  const parts: string[] = []
  if (applied.fields > 0) {
    parts.push(
      `Cleared ${applied.fields} redundant ${applied.fields === 1 ? 'property' : 'properties'}`,
    )
  }
  if (applied.normalizations > 0) {
    parts.push('Normalized layout position')
  }
  return parts.join(' · ')
})

function badgeClass(result: SanitizeCategorySummary): string {
  if (result.count === 0) return 'text-bg-secondary'
  return result.kind === 'normalization' ? 'text-bg-info' : 'text-bg-warning'
}

function runScan(resetSelection: boolean) {
  scanResults.value = scanLayout(keyboardStore.keys)
  if (resetSelection) {
    selectedRuleIds.value = new Set(
      scanResults.value.filter((r) => r.count > 0).map((r) => r.ruleId),
    )
  }
}

function toggleRule(ruleId: string) {
  // Reassign — in-place Set mutation doesn't trigger reactivity on a ref.
  const next = new Set(selectedRuleIds.value)
  if (next.has(ruleId)) {
    next.delete(ruleId)
  } else {
    next.add(ruleId)
  }
  selectedRuleIds.value = next
}

function handleApply() {
  // Re-scan before acting. The panel is non-modal, so the layout can have moved
  // on since the last scan — a canvas edit, a Ctrl+Z, another tool — and the
  // Apply button's enabled state is derived from those same stale counts. Acting
  // on them would run a batch of no-op fixes, still push an undo entry for them,
  // and report properties that were never cleared. Selection is preserved, so a
  // category the user unchecked stays unchecked.
  runScan(false)

  const applied = scanResults.value.filter(
    (r) => selectedRuleIds.value.has(r.ruleId) && r.count > 0,
  )
  if (applied.length === 0) {
    // Nothing left to do: drop any earlier result rather than let it stand as a
    // claim about this click.
    lastApplied.value = null
    return
  }

  const tally = {
    fields: applied.filter((r) => r.kind === 'redundancy').reduce((sum, r) => sum + r.count, 0),
    normalizations: applied.filter((r) => r.kind === 'normalization').length,
  }

  keyboardStore.applySanitize(applied.map((r) => r.ruleId))

  lastApplied.value = tally
  // Keep the checkbox selection: a category the user deliberately left unchecked
  // stays unchecked rather than getting silently re-checked.
  runScan(false)
}

function handleRescan() {
  lastApplied.value = null
  runScan(true)
}

function handleClose() {
  emit('close')
}

watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      lastApplied.value = null
      runScan(true)
      initializePosition({ x: window.innerWidth - 460, y: 100 })
      await nextTick()
    }
  },
)

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.visible) {
    event.preventDefault()
    handleClose()
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
.sanitize-tool-panel {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  width: 440px;
  user-select: none;
}

/* Mobile anchoring */
@media (max-width: 767.98px) {
  .sanitize-tool-panel {
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

  .sanitize-tool-panel .panel-content {
    border-radius: 0 !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
  }

  .sanitize-tool-panel .panel-body {
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

/*
 * The body is sized to its content and never scrolls in practice: every rule is
 * two tight lines (name plus description), and there is at most one status line.
 * The viewport cap is only a safety net for a very short window (it engages
 * below roughly 400px of height), so content can never end up unreachable.
 */
.panel-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.status-banner {
  background: var(--bs-success-bg-subtle);
  border: 1px solid var(--bs-success-border-subtle);
  border-radius: 4px;
  padding: 5px 10px;
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
  color: var(--bs-emphasis-color);
}

.controls-section {
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 4px;
  padding: 8px 10px;
}

.section-title {
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--bs-secondary-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  /* Hugs its text rather than stretching to the panel width. */
  display: inline-block;
}

.rule-row + .rule-row {
  margin-top: 7px;
}

.form-check {
  padding-left: 1.5rem;
  margin-bottom: 0;
  min-height: auto;
}

.form-check-input {
  margin-top: 0.2rem;
}

/*
 * Two tight lines per rule: name + count, then a short description. Sized so all
 * five rules, both group headings and the buttons fit one window without
 * scrolling — anything added here has to stay within that budget.
 */
.form-check-label {
  display: block;
  width: 100%;
  color: var(--bs-emphasis-color);
  /* The label toggles its checkbox, so it reads as clickable. */
  cursor: pointer;
}

.form-check-input:disabled ~ .form-check-label {
  opacity: 0.65;
  cursor: default;
}

.rule-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.8125rem;
  line-height: 1.25;
}

.rule-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-description {
  display: block;
  font-size: 0.6875rem;
  line-height: 1.25;
  color: var(--bs-secondary-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/*
 * Bootstrap's `badge` partial is not imported (see bootstrap-custom.scss), so
 * `.badge` would render unstyled. The `text-bg-*` colour classes do work — those
 * come from `helpers`, which is imported — so only the box needs defining here.
 */
.count-badge {
  flex: none;
  min-width: 1.5em;
  padding: 0.2em 0.5em;
  border-radius: 50rem;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

@media (max-width: 575.98px) {
  .sanitize-tool-panel {
    width: 340px;
  }

  .panel-body {
    padding: 10px;
  }
}
</style>
