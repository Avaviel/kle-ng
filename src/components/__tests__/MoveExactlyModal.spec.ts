import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MoveExactlyModal from '../MoveExactlyModal.vue'

describe('MoveExactlyModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('X/Y Spacing invalid/clear default', () => {
    it('falls back to 19.05 (Cherry MX standard), not the field minimum, when X Spacing is cleared or invalid', async () => {
      const wrapper = mount(MoveExactlyModal, {
        props: { visible: true },
      })
      await wrapper.vm.$nextTick()

      // Switch to mm units to reveal the spacing fields
      const mmRadio = wrapper.find('#unit-mm')
      await mmRadio.setValue(true)
      await wrapper.vm.$nextTick()

      const input = wrapper.find('.spacing-config .custom-number-input input')
      expect(input.exists()).toBe(true)

      ;(input.element as HTMLInputElement).value = 'abc'
      await input.trigger('input')
      await input.trigger('blur')
      await wrapper.vm.$nextTick()

      // Should default to 19.05, not the field's min (10)
      expect((input.element as HTMLInputElement).value).toBe('19.05')
    })
  })
})
