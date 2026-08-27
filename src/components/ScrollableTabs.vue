<script setup lang="ts">
import { computed, ref } from 'vue'
import BiChevronLeft from 'bootstrap-icons/icons/chevron-left.svg'
import BiChevronRight from 'bootstrap-icons/icons/chevron-right.svg'

interface Tab {
  id: string
  label: string
}

const props = withDefaults(
  defineProps<{
    tabs: readonly Tab[]
    /** Number of tabs visible at once before the track scrolls. Ignored when `variableWidth` is set. */
    visibleTabs?: number
    /**
     * Size each tab to its label instead of splitting the bar into equal
     * `visibleTabs` columns — for bars with many/long labels (e.g. Character
     * Picker categories) where equal-width columns would truncate text.
     */
    variableWidth?: boolean
    /** When set, each tab button gets data-testid="`${testidPrefix}-${tab.id}`". */
    testidPrefix?: string
  }>(),
  {
    visibleTabs: 3,
    variableWidth: false,
  },
)

// Active tab id, two-way bound via v-model.
const activeTab = defineModel<string>({ required: true })

const tabOffset = ref(0)
const tabTrackRef = ref<HTMLElement | null>(null)

const canGoPrev = computed(() => tabOffset.value > 0)
const canGoNext = computed(() =>
  props.variableWidth
    ? tabOffset.value < props.tabs.length - 1
    : tabOffset.value + props.visibleTabs < props.tabs.length,
)

function tabButtons(): HTMLButtonElement[] {
  return Array.from(tabTrackRef.value?.querySelectorAll<HTMLButtonElement>('.tab-bar-item') ?? [])
}

// Fixed-width mode: pages are a constant fraction of the track width, so the
// offset can be scrolled to directly via `offset * tabWidth`.
function scrollTrack(offset: number) {
  tabOffset.value = offset
  const el = tabTrackRef.value
  if (!el) return
  const tabWidth = el.offsetWidth / props.visibleTabs
  el.scrollTo({ left: offset * tabWidth, behavior: 'smooth' })
}

// Variable-width mode: tabs are sized to their label, so paging works in
// terms of "which tab index starts the view" rather than a fixed pixel/
// percentage step — each click reveals exactly one more real tab, however
// wide it is.
function scrollToIndex(index: number) {
  tabOffset.value = index
  const el = tabTrackRef.value
  const button = tabButtons()[index]
  if (!el || !button) return
  el.scrollTo({ left: button.offsetLeft, behavior: 'smooth' })
}

function selectTab(id: string) {
  activeTab.value = id
  const idx = props.tabs.findIndex((t) => t.id === id)
  if (idx < 0) return

  if (!props.variableWidth) {
    if (idx < tabOffset.value) {
      scrollTrack(idx)
    } else if (idx >= tabOffset.value + props.visibleTabs) {
      scrollTrack(idx - props.visibleTabs + 1)
    }
    return
  }

  const el = tabTrackRef.value
  const button = tabButtons()[idx]
  if (!el || !button) return

  // Only page the track if the clicked tab isn't already (at least partly)
  // visible — avoids re-scrolling to re-anchor a tab that's already in view.
  const buttonRight = button.offsetLeft + button.offsetWidth
  const viewRight = el.scrollLeft + el.clientWidth
  if (button.offsetLeft < el.scrollLeft) {
    scrollToIndex(idx)
  } else if (buttonRight > viewRight) {
    tabOffset.value = idx
    el.scrollTo({ left: buttonRight - el.clientWidth, behavior: 'smooth' })
  }
}

function goPrev() {
  if (props.variableWidth) {
    scrollToIndex(Math.max(0, tabOffset.value - 1))
  } else {
    scrollTrack(Math.max(0, tabOffset.value - 1))
  }
}

function goNext() {
  if (props.variableWidth) {
    scrollToIndex(Math.min(props.tabs.length - 1, tabOffset.value + 1))
  } else {
    scrollTrack(Math.min(props.tabs.length - props.visibleTabs, tabOffset.value + 1))
  }
}
</script>

<template>
  <div class="scrollable-tabs">
    <!-- Tab Bar -->
    <div class="tab-bar">
      <button
        class="tab-nav-btn"
        :class="{ 'tab-nav-btn--hidden': !canGoPrev }"
        :disabled="!canGoPrev"
        aria-label="Previous tabs"
        @click="goPrev"
      >
        <BiChevronLeft />
      </button>

      <div class="tab-track-wrapper">
        <div ref="tabTrackRef" class="tab-track" :class="{ 'tab-track--variable': variableWidth }">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-bar-item"
            :class="{ active: activeTab === tab.id, 'tab-bar-item--variable': variableWidth }"
            :data-testid="testidPrefix ? `${testidPrefix}-${tab.id}` : undefined"
            :title="variableWidth ? tab.label : undefined"
            @click="selectTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <button
        class="tab-nav-btn"
        :class="{ 'tab-nav-btn--hidden': !canGoNext }"
        :disabled="!canGoNext"
        aria-label="Next tabs"
        @click="goNext"
      >
        <BiChevronRight />
      </button>
    </div>

    <!-- Tab Content - Grid stacks all panes to maintain max height -->
    <div class="tab-content-grid">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-pane-content"
        :class="{ 'tab-pane-hidden': activeTab !== tab.id }"
      >
        <slot :name="tab.id" :active="activeTab === tab.id" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Segmented tab bar */
.tab-bar {
  display: flex;
  align-items: center;
  background-color: var(--bs-secondary-bg);
  border-radius: 6px;
  padding: 3px;
  gap: 2px;
  margin-bottom: 12px;
}

/* Scrollable track that clips overflow */
.tab-track-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* Inner scrollable row — overflow hidden, scrolled via JS */
.tab-track {
  display: flex;
  overflow: hidden;
}

.tab-bar-item {
  flex: 0 0 calc(100% / 3);
  min-width: 0;
  padding: 0.35rem 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  line-height: 1.2;
  color: var(--bs-secondary-color);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

/* Variable-width mode: size each tab to its label instead of splitting the
   bar into equal columns. */
.tab-bar-item--variable {
  flex: 0 0 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-bar-item:hover:not(.active) {
  color: var(--bs-body-color);
  background-color: color-mix(in srgb, var(--bs-tertiary-bg) 80%, var(--bs-body-color) 5%);
}

.tab-bar-item.active {
  color: var(--bs-body-color);
  background-color: var(--bs-body-bg);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.04);
}

/* Nav arrow buttons */
.tab-nav-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  color: var(--bs-secondary-color);
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    opacity 0.2s ease;
}

.tab-nav-btn :deep(svg) {
  width: 0.8rem;
  height: 0.8rem;
  display: block;
  fill: currentColor;
}

.tab-nav-btn:hover:not(:disabled) {
  color: var(--bs-body-color);
  background-color: var(--bs-body-bg);
  border-color: var(--bs-border-color-translucent);
}

.tab-nav-btn--hidden {
  opacity: 0;
  pointer-events: none;
}

/* CSS Grid stacks all tab panes in same cell - height is max of all panes */
.tab-content-grid {
  display: grid;
}

.tab-pane-content {
  grid-column: 1;
  grid-row: 1;
}

.tab-pane-hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
