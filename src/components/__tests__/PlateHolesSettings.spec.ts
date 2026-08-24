import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PlateHolesSettings from '../PlateHolesSettings.vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'

describe('PlateHolesSettings', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  describe('Mounting hole invalid/clear default', () => {
    it('falls back to 3, not the field minimum, when the mounting hole diameter is cleared or invalid', async () => {
      const store = usePlateGeneratorStore()
      store.settings.outline.outlineType = 'rectangular'
      store.settings.mountingHoles.enabled = true
      store.settings.mountingHoles.diameter = 5

      const wrapper = mount(PlateHolesSettings, {
        global: { plugins: [pinia] },
      })
      await wrapper.vm.$nextTick()

      const input = wrapper.find('input[title="Mounting hole diameter in millimeters"]')
      expect(input.exists()).toBe(true)

      ;(input.element as HTMLInputElement).value = ''
      await input.trigger('input')
      await input.trigger('blur')
      await wrapper.vm.$nextTick()

      // Should default to 3, not the field's min (0.5)
      expect(store.settings.mountingHoles.diameter).toBe(3)
    })
  })

  describe('Custom hole invalid/clear default', () => {
    it('falls back to 0, not the field step, when a custom hole X Offset is cleared or invalid', async () => {
      const store = usePlateGeneratorStore()
      store.settings.customHoles.enabled = true
      store.settings.customHoles.holes = [{ id: 'hole_1', diameter: 3, offsetX: 2.5, offsetY: 0 }]

      const wrapper = mount(PlateHolesSettings, {
        global: { plugins: [pinia] },
      })
      await wrapper.vm.$nextTick()

      const input = wrapper.find('input[title="X offset from origin in keyboard units (U)"]')
      expect(input.exists()).toBe(true)

      ;(input.element as HTMLInputElement).value = ''
      await input.trigger('input')
      await input.trigger('blur')
      await wrapper.vm.$nextTick()

      // Should default to 0, not the field's step (0.25)
      expect(store.settings.customHoles.holes[0]?.offsetX).toBe(0)
    })
  })
})
