<template>
  <div class="layout-editor-settings-panel" @mousedown.stop @click.stop>
    <div class="panel-header">
      <span class="panel-title">Settings</span>
      <button
        type="button"
        class="panel-close-btn"
        title="Close settings"
        aria-label="Close settings"
        @click="$emit('close')"
      >
        <BiX />
      </button>
    </div>
    <div class="panel-body">
      <div class="settings-grid">
        <label class="setting-label" for="setting-show-grid">Show grid</label>
        <div class="setting-control">
          <input id="setting-show-grid" type="checkbox" v-model="settingsStore.showGrid" />
        </div>

        <label class="setting-label" for="setting-allow-label-overflow">Allow label overflow</label>
        <div class="setting-control">
          <input
            id="setting-allow-label-overflow"
            type="checkbox"
            v-model="settingsStore.allowLabelOverflow"
          />
        </div>

        <label class="setting-label">Highlight Color</label>
        <div class="setting-control">
          <ColorPicker
            v-model="settingsStore.highlightColor"
            placement="bottom-end"
            style="width: 20px; height: 20px; flex: none"
            title="Selection highlight color"
          />
          <button
            v-if="settingsStore.highlightColor !== DEFAULT_HIGHLIGHT_COLOR"
            class="reset-btn"
            title="Reset to default"
            @click="settingsStore.highlightColor = DEFAULT_HIGHLIGHT_COLOR"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BiX from 'bootstrap-icons/icons/x.svg'
import {
  useLayoutEditorSettingsStore,
  DEFAULT_HIGHLIGHT_COLOR,
} from '@/stores/layoutEditorSettings'
import ColorPicker from './ColorPicker.vue'

defineEmits<{
  close: []
}>()

const settingsStore = useLayoutEditorSettingsStore()
</script>

<style scoped>
.layout-editor-settings-panel {
  width: 240px;
  flex-shrink: 0;
  background: var(--bs-body-bg);
  border-left: 1px solid var(--bs-border-color);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bs-secondary-bg);
  border-bottom: 1px solid var(--bs-border-color);
  flex-shrink: 0;
}

.panel-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

.panel-close-btn {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--bs-secondary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  line-height: 1;
}

.panel-close-btn:hover {
  color: var(--bs-body-color);
  background: var(--bs-tertiary-bg);
}

.panel-body {
  flex: 1;
  padding: 10px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px 10px;
}

.setting-label {
  font-size: 0.8rem;
  color: var(--bs-body-color);
  cursor: pointer;
  user-select: none;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 5px;
  justify-content: flex-end;
}

.reset-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.7rem;
  cursor: pointer;
  color: var(--bs-secondary-color);
  text-decoration: underline;
}

.reset-btn:hover {
  color: var(--bs-body-color);
}
</style>
