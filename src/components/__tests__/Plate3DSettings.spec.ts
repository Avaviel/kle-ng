import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Plate3DSettings from '../Plate3DSettings.vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'

describe('Plate3DSettings', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  describe('Plate Thickness invalid/clear default', () => {
    it('falls back to 1.5, not the field minimum, when Plate Thickness is cleared or invalid', async () => {
      const store = usePlateGeneratorStore()
      store.settings.outline.outlineType = 'rectangular'
      store.settings.thickness = 5

      const wrapper = mount(Plate3DSettings, {
        global: { plugins: [pinia] },
      })
      await wrapper.vm.$nextTick()

      const input = wrapper.find('input[title="Plate thickness for 3D export in millimeters"]')
      expect(input.exists()).toBe(true)

      ;(input.element as HTMLInputElement).value = ''
      await input.trigger('input')
      await input.trigger('blur')
      await wrapper.vm.$nextTick()

      // Should default to 1.5, not the field's min (0.1)
      expect(store.settings.thickness).toBe(1.5)
    })
  })
})
