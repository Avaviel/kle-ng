<script setup lang="ts">
import { computed } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import CustomNumberInput from './CustomNumberInput.vue'

const plateStore = usePlateGeneratorStore()
const { settings } = storeToRefs(plateStore)

const snapNotchFeature = computed(() =>
  settings.value.backsideFeatures.find((f) => f.type === 'cherry-mx-snap-notch'),
)

const backsideDepthMax = computed(() => Math.max(0, settings.value.thickness - 1))
const outlineEnabled = computed(() => settings.value.outline.outlineType !== 'none')
</script>

<template>
  <div class="plate-3d-settings">
    <div class="settings-section">
      <!-- Plate Thickness -->
      <div class="mb-3">
        <label for="plateThickness" class="form-label form-label-sm">Plate Thickness</label>
        <CustomNumberInput
          id="plateThickness"
          v-model="settings.thickness"
          :step="0.1"
          :min="0.1"
          :max="20"
          :value-on-clear="1.5"
          :disabled="!outlineEnabled"
          class="form-control form-control-sm"
          size="default"
          title="Plate thickness for 3D export in millimeters"
        >
          <template #suffix>mm</template>
        </CustomNumberInput>
        <div class="form-text small">Used for 3D export (requires outline)</div>
      </div>

      <!-- Backside Features -->
      <div class="section-divider mb-2" />

      <div class="mb-1">
        <span class="form-label form-label-sm d-block">Backside Features</span>
        <div class="form-text small mb-2">
          Cuts applied to the back face of the plate during 3D export only. Has no effect on SVG or
          DXF output.
        </div>
      </div>

      <!-- Shared cut depth -->
      <div class="mb-2">
        <label for="backsideDepth" class="form-label form-label-sm">Cut Depth</label>
        <CustomNumberInput
          id="backsideDepth"
          v-model="settings.backsideDepth"
          :step="0.1"
          :min="0"
          :max="backsideDepthMax"
          :disabled="!outlineEnabled"
          class="form-control form-control-sm"
          size="default"
          title="Depth of all backside cuts from the back face in millimeters"
        >
          <template #suffix>mm</template>
        </CustomNumberInput>
        <div class="form-text small">
          Applies to all backside features (max: thickness − 1 mm). Set to 0 to disable.
        </div>
      </div>

      <!-- Cherry MX Snap Notch -->
      <div v-if="snapNotchFeature" class="feature-card mb-2">
        <div class="feature-header">
          <div class="form-check mb-0">
            <input
              id="snapNotchEnabled"
              v-model="snapNotchFeature.enabled"
              class="form-check-input"
              type="checkbox"
              :disabled="!outlineEnabled"
            />
            <label class="form-check-label form-label-sm fw-semibold" for="snapNotchEnabled">
              Cherry MX Snap Notch
            </label>
          </div>
        </div>
        <div class="form-text small">
          Rectangular notch centered on each switch cutout. Allows Cherry MX switches to snap into
          the thick plate.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plate-3d-settings {
  padding: 0;
}

.form-label-sm {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.settings-section {
  padding-top: 0;
  padding-bottom: 0;
}

.section-divider {
  border-top: 1px solid var(--bs-border-color);
}

.feature-card {
  border: 1px solid var(--bs-border-color);
  border-radius: 4px;
  padding: 0.5rem 0.625rem;
  background: var(--bs-body-bg);
}

.feature-header {
  margin-bottom: 0.25rem;
}

.mb-3:last-child {
  margin-bottom: 0 !important;
}
</style>
