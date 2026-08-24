import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PlateOutlineSettings from '../PlateOutlineSettings.vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'

describe('PlateOutlineSettings', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  describe('Margin invalid/clear default', () => {
    it('falls back to 5, not the field minimum, when the Top margin is cleared or invalid', async () => {
      const store = usePlateGeneratorStore()
      store.settings.outline.outlineType = 'rectangular'
      store.settings.outline.marginTop = 10

      const wrapper = mount(PlateOutlineSettings, {
        global: { plugins: [pinia] },
      })
      await wrapper.vm.$nextTick()

      const input = wrapper.find('input[title="Top margin in millimeters"]')
      expect(input.exists()).toBe(true)

      ;(input.element as HTMLInputElement).value = ''
      await input.trigger('input')
      await input.trigger('blur')
      await wrapper.vm.$nextTick()

      // Should default to 5, not the field's min (0)
      expect(store.settings.outline.marginTop).toBe(5)
    })
  })

  describe('Outline fillet radius invalid/clear default', () => {
    it('falls back to 1, not the field minimum, when the Fillet Radius is cleared or invalid', async () => {
      const store = usePlateGeneratorStore()
      store.settings.outline.outlineType = 'rectangular'
      store.settings.outline.filletRadius = 3

      const wrapper = mount(PlateOutlineSettings, {
        global: { plugins: [pinia] },
      })
      await wrapper.vm.$nextTick()

      const input = wrapper.find('input[title="Corner rounding radius for outline in millimeters"]')
      expect(input.exists()).toBe(true)

      ;(input.element as HTMLInputElement).value = ''
      await input.trigger('input')
      await input.trigger('blur')
      await wrapper.vm.$nextTick()

      // Should default to 1, not the field's min (0)
      expect(store.settings.outline.filletRadius).toBe(1)
    })
  })
})
