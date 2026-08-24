import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RotationOriginsPanel from '../RotationOriginsPanel.vue'

describe('RotationOriginsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Manual X/Y Position invalid/clear default', () => {
    it('falls back to 0 when X Position is cleared or invalid', async () => {
      const wrapper = mount(RotationOriginsPanel, {
        props: { visible: true },
      })
      await wrapper.vm.$nextTick()

      // Uncheck "use key centers" to enable the manual position inputs
      const useKeyCentersCheckbox = wrapper.find('#useKeyCenters')
      await useKeyCentersCheckbox.setValue(false)
      await wrapper.vm.$nextTick()

      const input = wrapper.find('input[title="X Position"]')
      expect(input.exists()).toBe(true)

      ;(input.element as HTMLInputElement).value = 'abc'
      await input.trigger('input')
      await input.trigger('blur')
      await wrapper.vm.$nextTick()

      expect((input.element as HTMLInputElement).value).toBe('0')
    })
  })
})
