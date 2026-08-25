<template>
  <div
    v-if="isTouchPrimaryDevice && !dismissed"
    class="touch-warning-banner border-bottom px-3 py-2 text-center d-flex align-items-center justify-content-center gap-2"
  >
    <span>
      This editor is designed for mouse and keyboard. On touch devices some actions &mdash;
      dragging, resizing, and a few detail panels &mdash; may not work as expected.
    </span>
    <button type="button" class="btn-close flex-shrink-0" aria-label="Close" @click="dismiss" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTouchDevice } from '@/composables/useTouchDevice'

const STORAGE_KEY = 'kle-ng-touch-warning-dismissed'

const { isTouchPrimaryDevice } = useTouchDevice()
const dismissed = ref(localStorage.getItem(STORAGE_KEY) === 'true')

const dismiss = () => {
  dismissed.value = true
  localStorage.setItem(STORAGE_KEY, 'true')
}
</script>

<style scoped>
.touch-warning-banner {
  background-color: var(--bs-warning-bg-subtle);
  border-color: var(--bs-warning-border-subtle) !important;
  color: var(--bs-warning-text-emphasis);
  font-size: 0.875rem;
}
</style>
