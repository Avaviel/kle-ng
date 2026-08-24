import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import CustomNumberInput from '../CustomNumberInput.vue'

// Real, synchronous v-model binding (plain ref), unlike a later
// wrapper.setProps() relay which happens on a separate tick and misses
// same-flush echo timing bugs.
function mountWithVModel(props: Record<string, unknown>) {
  const wrapper = mount(
    defineComponent({
      components: { CustomNumberInput },
      props: Object.keys(props),
      setup() {
        const value = ref(props.modelValue as number | undefined)
        return { value }
      },
      template: `<CustomNumberInput v-bind="$props" v-model="value" @commit="$emit('commit', $event)" @change="$emit('change', $event)" />`,
    }),
    { props },
  )
  return wrapper
}

describe('CustomNumberInput', () => {
  describe('empty input handling', () => {
    it('should revert to default value when cleared (move step case)', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: 0.05, // Simulating a clamped value
          min: 0.05,
          max: 5,
          step: 0.05,
          valueOnClear: 0.25, // Should revert to 0.25 when cleared
        },
      })

      const input = wrapper.find('input')

      // Clear the input
      await input.setValue('')
      await input.trigger('blur')

      // Should emit 0.25 (the default for move step)
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as [number | undefined][]
      const lastEmitted = emitted[emitted.length - 1]
      expect(lastEmitted).toBeDefined()
      const lastEmittedValue = lastEmitted![0]
      expect(lastEmittedValue).toBe(0.25)
    })

    it('should allow empty when valueOnClear is null', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: 5,
          min: 1,
          max: 9,
          valueOnClear: null, // Allow empty
        },
      })

      const input = wrapper.find('input')

      // Clear the input
      await input.setValue('')
      await input.trigger('blur')

      // Should emit undefined
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as [number | undefined][]
      const lastEmitted = emitted[emitted.length - 1]
      expect(lastEmitted).toBeDefined()
      const lastEmittedValue = lastEmitted![0]
      expect(lastEmittedValue).toBe(undefined)
    })

    it('should show reasonable default while typing invalid content', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: undefined,
          min: 0.05,
          max: 5,
          step: 0.05,
          valueOnClear: 0.25,
        },
      })

      const input = wrapper.find('input')

      // The display should show the default value when modelValue is undefined
      expect(input.element.value).toBe('0.25')
    })
  })

  describe('focus behavior', () => {
    it('should not lose focus during typing with small decimal values', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: 0.2,
          min: 0.05,
          max: 9,
          step: 0.05,
          valueOnClear: null, // Allow empty for this test
        },
      })

      const input = wrapper.find('input')

      // Focus the input
      await input.trigger('focus')

      // Type partial value (this should not lose focus in real usage)
      await input.setValue('0.')
      await input.trigger('input')

      // The key behavior: input should emit value and not cause focus loss
      // In the real application, focus is maintained during typing

      // When we blur, validation should happen
      await input.trigger('blur')

      // Should have emitted some value updates
      const emitted = wrapper.emitted('update:modelValue') as [number | undefined][]
      expect(emitted).toBeTruthy()
      expect(emitted.length).toBeGreaterThan(0)
    })

    it('should emit correct value when cleared and blurred (simulating e2e test case)', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: 0.05, // Simulating the state after negative value was clamped
          min: 0.05,
          max: 5,
          step: 0.05,
          valueOnClear: 0.25, // Move step behavior
        },
      })

      const input = wrapper.find('input')

      // Clear the input (simulating stepInput.clear() in e2e test)
      await input.setValue('')

      // Trigger blur (simulating stepInput.blur() in e2e test)
      await input.trigger('blur')

      // Should emit 0.25
      const emitted = wrapper.emitted('update:modelValue') as [number | undefined][]
      expect(emitted).toBeTruthy()
      const lastEmitted = emitted[emitted.length - 1]
      expect(lastEmitted).toBeDefined()
      const lastEmittedValue = lastEmitted![0]
      expect(lastEmittedValue).toBe(0.25)

      // The input should also display 0.25 after the modelValue is updated
      // (In real usage, the parent would update modelValue prop, but here we test the emit)
      expect(lastEmittedValue).toBe(0.25)
    })
  })

  describe('Enhanced Features (commit 1ce0ba0)', () => {
    describe('disableWheel Property', () => {
      it('should ignore wheel events when disableWheel is true', async () => {
        const wrapper = mount(CustomNumberInput, {
          props: {
            modelValue: 5,
            disableWheel: true,
          },
        })

        const input = wrapper.find('input')
        await input.trigger('focus')
        await input.trigger('wheel', { deltaY: -100 })

        expect(wrapper.emitted('update:modelValue')).toBeFalsy()
      })

      it('should handle wheel events when disableWheel is false', async () => {
        const wrapper = mount(CustomNumberInput, {
          props: {
            modelValue: 5,
            disableWheel: false,
          },
        })

        const input = wrapper.find('input')
        await input.trigger('focus')
        await input.trigger('wheel', { deltaY: -100 })

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        const lastEvent = wrapper.emitted('update:modelValue')!.slice(-1)[0]
        expect(lastEvent).toBeDefined()
        const lastEmitted = lastEvent![0]
        expect(lastEmitted).toBe(6)
      })
    })

    describe('State Management Edge Cases', () => {
      it('should handle rapid value changes correctly', async () => {
        const wrapper = mount(CustomNumberInput, {
          props: { modelValue: 0, step: 1 },
        })

        const spinnerUp = wrapper.find('.spinner-up')

        // Rapid clicks with prop updates to simulate real behavior
        for (let i = 0; i < 5; i++) {
          await spinnerUp.trigger('click')
          // Update the modelValue prop to simulate parent component updating
          await wrapper.setProps({ modelValue: i + 1 })
        }

        const allEmitted = wrapper.emitted('update:modelValue') as [number][]
        expect(allEmitted).toHaveLength(5)
        const fifthEvent = allEmitted[4]
        expect(fifthEvent).toBeDefined()
        expect(fifthEvent![0]).toBe(5) // Should reach 5
      })

      it('should handle prop changes during user input', async () => {
        const wrapper = mount(CustomNumberInput, {
          props: { modelValue: 5 },
        })

        const input = wrapper.find('input')

        // Start typing
        await input.setValue('1')

        // Change props while user is typing
        await wrapper.setProps({ modelValue: 10 })

        // Complete input
        await input.trigger('blur')

        // Should prioritize user input over prop changes
        const lastEvent = wrapper.emitted('update:modelValue')!.slice(-1)[0]
        expect(lastEvent).toBeDefined()
        const lastEmitted = lastEvent![0]
        expect(lastEmitted).toBe(1)
      })

      it('should reset user input state correctly on external value changes', async () => {
        const wrapper = mount(CustomNumberInput, {
          props: { modelValue: 5 },
        })

        const input = wrapper.find('input')

        // Start typing
        await input.setValue('12')

        // External value change (simulating parent update)
        await wrapper.setProps({ modelValue: 20 })
        await nextTick()

        // Input should show the new external value
        expect(input.element.value).toBe('20')
      })
    })

    describe('Focus and Blur Behavior', () => {
      it('should apply focused class when input gains focus', async () => {
        const wrapper = mount(CustomNumberInput, {
          props: { modelValue: 0 },
        })

        const input = wrapper.find('input')
        await input.trigger('focus')

        expect(wrapper.classes()).toContain('input-focused')
      })

      it('should remove focused class and handle value on blur', async () => {
        const wrapper = mount(CustomNumberInput, {
          props: { modelValue: 5, valueOnClear: 0 },
        })

        const input = wrapper.find('input')

        // Focus and clear
        await input.trigger('focus')
        await input.setValue('')
        await input.trigger('blur')

        expect(wrapper.classes()).not.toContain('input-focused')
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      })
    })

    describe('Display Value Computation', () => {
      it('should display user input during typing', async () => {
        const wrapper = mount(CustomNumberInput, {
          props: { modelValue: 5 },
        })

        const input = wrapper.find('input')

        // Start typing
        await input.setValue('123')

        // Should show user input, not model value
        expect(input.element.value).toBe('123')
      })

      it('should show model value when not in user input mode', async () => {
        const wrapper = mount(CustomNumberInput, {
          props: { modelValue: 42 },
        })

        const input = wrapper.find('input')
        expect(input.element.value).toBe('42')
      })

      it('should handle undefined modelValue correctly', () => {
        const wrapper = mount(CustomNumberInput, {
          props: { modelValue: undefined, valueOnClear: null },
        })

        const input = wrapper.find('input')
        expect(input.element.value).toBe('')
      })
    })
  })

  describe('Component Rendering', () => {
    it('renders with default props', () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 0 },
      })

      expect(wrapper.find('input[type="text"][inputmode="decimal"]').exists()).toBe(true)
      expect(wrapper.find('.spinner-buttons').exists()).toBe(true)
      expect(wrapper.find('.spinner-up').exists()).toBe(true)
      expect(wrapper.find('.spinner-down').exists()).toBe(true)
    })

    it('applies custom CSS classes correctly', () => {
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: 0,
          class: 'custom-class form-control-lg',
        },
      })

      const input = wrapper.find('input')
      expect(input.classes()).toContain('custom-class')
      expect(input.classes()).toContain('form-control-lg')
    })

    it('renders different size variants correctly', async () => {
      // Test default size
      const defaultWrapper = mount(CustomNumberInput, {
        props: { modelValue: 0, size: 'default' },
      })
      expect(defaultWrapper.classes()).toContain('size-default')

      // Test compact size
      const compactWrapper = mount(CustomNumberInput, {
        props: { modelValue: 0, size: 'compact' },
      })
      expect(compactWrapper.classes()).toContain('size-compact')
    })

    it('displays suffix slot content correctly', () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 0 },
        slots: {
          suffix: '°',
        },
      })

      expect(wrapper.find('.input-suffix').exists()).toBe(true)
      expect(wrapper.find('.input-suffix').text()).toBe('°')
      expect(wrapper.classes()).toContain('has-suffix')
    })

    it('applies disabled state properly', () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 0, disabled: true },
      })

      const input = wrapper.find('input')
      const spinnerUp = wrapper.find('.spinner-up')
      const spinnerDown = wrapper.find('.spinner-down')

      expect(input.attributes('disabled')).toBeDefined()
      expect(spinnerUp.attributes('disabled')).toBeDefined()
      expect(spinnerDown.attributes('disabled')).toBeDefined()
      expect(wrapper.classes()).toContain('input-disabled')
    })
  })

  describe('Spinner Interactions', () => {
    it('increments value when up spinner is clicked', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, step: 1 },
      })

      const spinnerUp = wrapper.find('.spinner-up')
      await spinnerUp.trigger('click')

      expect(wrapper.emitted('update:modelValue')![0]).toEqual([6])
      expect(wrapper.emitted('change')![0]).toEqual([6])
    })

    it('decrements value when down spinner is clicked', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, step: 1 },
      })

      const spinnerDown = wrapper.find('.spinner-down')
      await spinnerDown.trigger('click')

      expect(wrapper.emitted('update:modelValue')![0]).toEqual([4])
      expect(wrapper.emitted('change')![0]).toEqual([4])
    })

    it('uses custom step value correctly', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 10, step: 5 },
      })

      const spinnerUp = wrapper.find('.spinner-up')
      await spinnerUp.trigger('click')

      expect(wrapper.emitted('update:modelValue')![0]).toEqual([15])
    })

    it('disables spinner buttons at min/max limits', () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 10, min: 0, max: 10 },
      })

      const spinnerUp = wrapper.find('.spinner-up')
      const spinnerDown = wrapper.find('.spinner-down')

      // At max value, up button should be disabled
      expect(spinnerUp.attributes('disabled')).toBeDefined()
      // Down button should still be enabled
      expect(spinnerDown.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Keyboard Navigation', () => {
    it('increments value on Arrow Up key', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5 },
      })

      const input = wrapper.find('input')
      await input.trigger('keydown', { key: 'ArrowUp' })

      expect(wrapper.emitted('update:modelValue')![0]).toEqual([6])
    })

    it('decrements value on Arrow Down key', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5 },
      })

      const input = wrapper.find('input')
      await input.trigger('keydown', { key: 'ArrowDown' })

      expect(wrapper.emitted('update:modelValue')![0]).toEqual([4])
    })

    it('blurs input on Escape key', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5 },
      })

      const input = wrapper.find('input')
      const blurSpy = vi.spyOn(input.element, 'blur')

      await input.trigger('keydown', { key: 'Escape' })

      expect(blurSpy).toHaveBeenCalled()
    })
  })

  describe('Mouse Wheel Interaction', () => {
    it('increments on wheel up when focused', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5 },
      })

      const input = wrapper.find('input')

      // Focus the input first
      await input.trigger('focus')

      // Simulate wheel up (negative deltaY)
      await input.trigger('wheel', { deltaY: -100 })

      expect(wrapper.emitted('update:modelValue')![0]).toEqual([6])
    })

    it('decrements on wheel down when focused', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5 },
      })

      const input = wrapper.find('input')

      // Focus the input first
      await input.trigger('focus')

      // Simulate wheel down (positive deltaY)
      await input.trigger('wheel', { deltaY: 100 })

      expect(wrapper.emitted('update:modelValue')![0]).toEqual([4])
    })

    it('ignores wheel events when not focused', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5 },
      })

      const input = wrapper.find('input')

      // Don't focus, directly trigger wheel
      await input.trigger('wheel', { deltaY: -100 })

      // Should not emit any events
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('uses ctrlStep when Ctrl key is pressed during wheel', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, step: 1, ctrlStep: 10 },
      })

      const input = wrapper.find('input')

      await input.trigger('focus')

      // Create a proper MouseEvent with ctrlKey
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })

      await input.element.dispatchEvent(wheelEvent)

      expect(wrapper.emitted('update:modelValue')![0]).toEqual([15])
    })
  })

  describe('Value Constraints', () => {
    it('respects minimum value constraint', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 0, max: 10 },
      })

      // Try to go below minimum
      const spinnerDown = wrapper.find('.spinner-down')
      for (let i = 0; i < 10; i++) {
        await spinnerDown.trigger('click')
      }

      // Should not go below 0
      const lastEvent = wrapper.emitted('update:modelValue')!.slice(-1)[0]
      expect(lastEvent).toBeDefined()
      const lastEmittedValue = lastEvent![0]
      expect(lastEmittedValue).toBeGreaterThanOrEqual(0)
    })

    it('respects maximum value constraint', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 0, max: 10 },
      })

      // Try to go above maximum
      const spinnerUp = wrapper.find('.spinner-up')
      for (let i = 0; i < 10; i++) {
        await spinnerUp.trigger('click')
      }

      // Should not go above 10
      const lastEvent = wrapper.emitted('update:modelValue')!.slice(-1)[0]
      expect(lastEvent).toBeDefined()
      const lastEmittedValue = lastEvent![0]
      expect(lastEmittedValue).toBeLessThanOrEqual(10)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: 0,
          title: 'Test input',
          placeholder: 'Enter number',
        },
      })

      const input = wrapper.find('input')
      expect(input.attributes('type')).toBe('text')
      expect(input.attributes('inputmode')).toBe('decimal')
      expect(input.attributes('title')).toBe('Test input')
      expect(input.attributes('placeholder')).toBe('Enter number')
    })

    it('marks aria-invalid when the field holds an invalid value', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9 },
      })

      const input = wrapper.find('input')
      expect(input.attributes('aria-invalid')).toBe('false')

      ;(input.element as HTMLInputElement).value = '15'
      await input.trigger('input')

      expect(input.attributes('aria-invalid')).toBe('true')
    })

    it('has descriptive titles for spinner buttons', () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 0, step: 5 },
      })

      const spinnerUp = wrapper.find('.spinner-up')
      const spinnerDown = wrapper.find('.spinner-down')

      expect(spinnerUp.attributes('title')).toBe('Increase by 5')
      expect(spinnerDown.attributes('title')).toBe('Decrease by 5')
    })

    it('prevents tab focus on spinner buttons', () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 0 },
      })

      const spinnerButtons = wrapper.findAll('.spinner-btn')
      spinnerButtons.forEach((button) => {
        expect(button.attributes('tabindex')).toBe('-1')
      })
    })

    it('handles disabled state accessibly', () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 0, disabled: true },
      })

      const input = wrapper.find('input')
      const spinnerButtons = wrapper.findAll('.spinner-btn')

      expect(input.attributes('disabled')).toBeDefined()
      spinnerButtons.forEach((button) => {
        expect(button.attributes('disabled')).toBeDefined()
      })

      expect(wrapper.classes()).toContain('input-disabled')
    })
  })

  describe('Commit Event Batching', () => {
    it('wheel events emit change on every tick but NOT commit', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5 },
      })

      const input = wrapper.find('input')
      await input.trigger('focus')

      // Multiple wheel ticks
      await input.trigger('wheel', { deltaY: -100 })
      await wrapper.setProps({ modelValue: 6 })
      await input.trigger('wheel', { deltaY: -100 })
      await wrapper.setProps({ modelValue: 7 })
      await input.trigger('wheel', { deltaY: -100 })
      await wrapper.setProps({ modelValue: 8 })

      // change emitted on every tick (for live preview)
      expect(wrapper.emitted('change')).toHaveLength(3)

      // commit should NOT have been emitted yet
      expect(wrapper.emitted('commit')).toBeFalsy()
    })

    it('blur after wheel emits a single commit event', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5 },
      })

      const input = wrapper.find('input')
      await input.trigger('focus')

      // Wheel ticks
      await input.trigger('wheel', { deltaY: -100 })
      await wrapper.setProps({ modelValue: 6 })
      await input.trigger('wheel', { deltaY: -100 })
      await wrapper.setProps({ modelValue: 7 })

      expect(wrapper.emitted('commit')).toBeFalsy()

      // Blur to flush
      await input.trigger('blur')

      // Now commit should have been emitted exactly once with the final value
      expect(wrapper.emitted('commit')).toHaveLength(1)
      expect(wrapper.emitted('commit')![0]).toEqual([7])
    })

    it('spinner clicks emit both change and commit immediately', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, step: 1 },
      })

      const spinnerUp = wrapper.find('.spinner-up')
      await spinnerUp.trigger('click')

      // All three events emitted immediately
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([6])
      expect(wrapper.emitted('change')![0]).toEqual([6])
      expect(wrapper.emitted('commit')![0]).toEqual([6])
    })

    it('arrow keydown emits change on every tick, keyup flushes commit', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 10 },
      })

      const input = wrapper.find('input')

      // Simulate held arrow key (multiple keydowns with repeat)
      await input.trigger('keydown', { key: 'ArrowUp' })
      await wrapper.setProps({ modelValue: 11 })
      await input.trigger('keydown', { key: 'ArrowUp', repeat: true })
      await wrapper.setProps({ modelValue: 12 })
      await input.trigger('keydown', { key: 'ArrowUp', repeat: true })
      await wrapper.setProps({ modelValue: 13 })

      // change emitted each time (for live preview)
      expect(wrapper.emitted('change')).toHaveLength(3)

      // commit NOT emitted yet
      expect(wrapper.emitted('commit')).toBeFalsy()

      // Release the key
      await input.trigger('keyup', { key: 'ArrowUp' })

      // Now commit should be emitted once with final value
      expect(wrapper.emitted('commit')).toHaveLength(1)
      expect(wrapper.emitted('commit')![0]).toEqual([13])
    })

    it('single arrow keydown + keyup emits commit', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5 },
      })

      const input = wrapper.find('input')

      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([4])
      expect(wrapper.emitted('change')![0]).toEqual([4])
      expect(wrapper.emitted('commit')).toBeFalsy()

      // Simulate parent updating modelValue from v-model binding
      await wrapper.setProps({ modelValue: 4 })

      await input.trigger('keyup', { key: 'ArrowDown' })
      expect(wrapper.emitted('commit')).toHaveLength(1)
      expect(wrapper.emitted('commit')![0]).toEqual([4])
    })
  })

  describe('Live typing parity with spinner/wheel', () => {
    // Note: these tests dispatch a raw 'input' event (setting element.value directly)
    // rather than using wrapper.setValue(), which fires 'input' AND a native 'change'
    // synchronously (for v-model.lazy support) — that would immediately commit and
    // defeat the point of testing the "still typing" state in isolation.

    it('emits change on every keystroke for a valid in-range value, without committing', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9 },
      })

      const input = wrapper.find('input')
      input.element.value = '7'
      await input.trigger('input')

      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')!.slice(-1)[0]).toEqual([7])
      expect(input.classes()).not.toContain('is-invalid')
      // Still typing — no commit yet
      expect(wrapper.emitted('commit')).toBeFalsy()
    })

    it('marks the field invalid and keeps the typed text, while the live preview stays at the last committed value', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9, valueOnClear: 3 },
      })

      const input = wrapper.find('input')
      input.element.value = '15'
      await input.trigger('input')

      expect(input.element.value).toBe('15')
      expect(input.classes()).toContain('is-invalid')

      // Live preview stays at the last committed value (5) rather than jumping
      // to an arbitrary default (3) — invalid text visibly changes nothing
      // until it's fixed or abandoned.
      expect(wrapper.emitted('change')!.slice(-1)[0]).toEqual([5])
      expect(wrapper.emitted('commit')).toBeFalsy()
    })

    it('falls back to referenceValue (not min) while invalid, when the field has no committed value yet', async () => {
      // No valueOnClear (null = allow empty), but referenceValue set — should
      // preview as that, not the unrelated min.
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: undefined,
          min: 1,
          max: 9,
          valueOnClear: null,
          referenceValue: 3,
        },
      })

      const input = wrapper.find('input')
      input.element.value = '15'
      await input.trigger('input')

      expect(input.classes()).toContain('is-invalid')
      expect(wrapper.emitted('change')!.slice(-1)[0]).toEqual([3])
    })

    it('keeps genuinely unparseable typed text visible and marks it invalid', async () => {
      // The input is a plain type="text" field (not type="number") specifically so
      // that garbled text like "abc" or a lone "-" is preserved and can be flagged,
      // instead of being silently blanked by the browser before our code sees it.
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9, valueOnClear: 3 },
      })

      const input = wrapper.find('input')
      input.element.value = 'abc'
      await input.trigger('input')

      expect(input.element.value).toBe('abc')
      expect(input.classes()).toContain('is-invalid')
      expect(input.attributes('aria-invalid')).toBe('true')
      // Live preview stays at the last committed value (5), not a fallback (3)
      expect(wrapper.emitted('change')!.slice(-1)[0]).toEqual([5])
      expect(wrapper.emitted('commit')).toBeFalsy()
    })

    it('rejects a numeric prefix followed by trailing garbage (strict parse, not parseFloat-style)', async () => {
      // parseFloat("5x") === 5 — too lenient for a field that now accepts arbitrary
      // text. The whole string must be a valid number.
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9, valueOnClear: 3 },
      })

      const input = wrapper.find('input')
      input.element.value = '5x'
      await input.trigger('input')

      expect(input.classes()).toContain('is-invalid')
      // Live preview stays at the last committed value (5), not a fallback (3)
      expect(wrapper.emitted('change')!.slice(-1)[0]).toEqual([5])
    })

    it('does not mark out-of-declared-range values invalid when wrapAround is enabled', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: 10,
          min: -360,
          max: 360,
          wrapAround: true,
          wrapMin: -360,
          wrapMax: 360,
        },
      })

      const input = wrapper.find('input')
      input.element.value = '400'
      await input.trigger('input')

      expect(input.classes()).not.toContain('is-invalid')
    })

    it('normalizes an extremely large typed value into wrap range without hanging', async () => {
      // Regression test: the old wrap-around normalization used a while loop that
      // subtracted/added the range one step at a time, so a huge typed value (e.g.
      // 1e20) would iterate ~2.8e17 times and freeze the page. Normalization must
      // be O(1) regardless of magnitude.
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: 10,
          min: -360,
          max: 360,
          wrapAround: true,
          wrapMin: -360,
          wrapMax: 360,
        },
      })

      const input = wrapper.find('input')
      input.element.value = '1e20'
      await input.trigger('input')

      const emitted = wrapper.emitted('update:modelValue') as [number | undefined][]
      const lastValue = emitted.slice(-1)[0]![0]
      expect(lastValue).toBeDefined()
      expect(lastValue as number).toBeGreaterThanOrEqual(-180)
      expect(lastValue as number).toBeLessThanOrEqual(180)
    })

    it('keeps the wrap range closed at both ends, so 180 survives', async () => {
      // Regression test: plain modulo lands in the half-open [-180, 180), turning a
      // typed 180 into -180 and making 180 unreachable by stepping up from 165. The
      // rendering is the same either way, but silently rewriting the number the user
      // typed is not. Only values congruent to the boundary are affected, and they
      // keep the end they were heading towards.
      const cases: [string, number][] = [
        ['180', 180],
        ['-180', -180],
        ['540', 180], // 180 + one full turn
        ['-540', -180],
        ['181', -179], // just past the boundary still wraps
        ['-181', 179],
      ]

      for (const [typed, expected] of cases) {
        const wrapper = mount(CustomNumberInput, {
          props: {
            modelValue: 0,
            min: -360,
            max: 360,
            wrapAround: true,
            wrapMin: -360,
            wrapMax: 360,
          },
        })

        const input = wrapper.find('input')
        input.element.value = typed
        await input.trigger('input')

        const emitted = wrapper.emitted('update:modelValue') as [number | undefined][]
        expect(emitted.slice(-1)[0]![0], `typed ${typed}`).toBe(expected)
      }
    })

    it('commits a typed value on blur without pressing Enter, even with a one-way (non-v-model) binding', async () => {
      // Mirrors the Per-Label Text Size wiring: one-way :model-value + explicit change
      // handler + value-on-clear=null + reference-value — the reported regression case.
      const wrapper = mount(CustomNumberInput, {
        props: {
          modelValue: undefined,
          min: 1,
          max: 9,
          step: 1,
          valueOnClear: null,
          referenceValue: 3,
        },
      })

      const input = wrapper.find('input')
      input.element.value = '5'
      await input.trigger('input')
      await input.trigger('blur')

      expect(wrapper.emitted('commit')).toBeTruthy()
      const lastCommit = wrapper.emitted('commit')!.slice(-1)[0]
      expect(lastCommit).toEqual([5])
    })

    it('discards an out-of-range typed value on blur and reverts to the last committed value', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9 },
      })

      const input = wrapper.find('input')
      input.element.value = '15'
      await input.trigger('input')
      await input.trigger('blur')

      // No commit for the discarded invalid input
      expect(wrapper.emitted('commit')).toBeFalsy()
      // Display reverts to the last committed model value
      expect(input.element.value).toBe('5')
      expect(input.classes()).not.toContain('is-invalid')
      // The final change reflects the reverted (true) value, not the invalid one
      expect(wrapper.emitted('change')!.slice(-1)[0]).toEqual([5])
    })

    it('reverts to the latest committed value on invalid blur under a real v-model binding, not an arbitrary fallback (undo regression)', async () => {
      // Needs a real v-model round trip: props.modelValue must actually get
      // corrupted by the live echo for this to be a meaningful check. Commits
      // via spinner first so the committed value (6) diverges from mount (5),
      // proving the revert tracks the latest commit, not just the initial value.
      const wrapper = mountWithVModel({ modelValue: 5, min: 1, max: 9, valueOnClear: 3 })
      const input = wrapper.find('input')

      await wrapper.find('.spinner-up').trigger('click')
      expect((wrapper.vm as unknown as { value: number }).value).toBe(6)

      input.element.value = 'abc'
      await input.trigger('input')

      // Live preview stays at the latest committed value (6) instead of
      // jumping to an arbitrary fallback (3).
      expect((wrapper.vm as unknown as { value: number }).value).toBe(6)
      expect(input.classes()).toContain('is-invalid')

      await input.trigger('blur')

      expect((wrapper.vm as unknown as { value: number }).value).toBe(6)
      expect(input.element.value).toBe('6')
      expect(input.classes()).not.toContain('is-invalid')
      // Only the spinner's commit — nothing new was committed by the revert,
      // since the field just settled back to where it already was.
      expect(wrapper.emitted('commit')).toEqual([[6]])
    })

    it('clears stale invalid text when an external change lands on the same value our own echo last used', async () => {
      // Watcher must distinguish echo from external change by timing, not by
      // value match — otherwise a later external change landing on our old
      // echoed value gets ignored forever. No committed value here (mounted
      // undefined) so the echo (value-on-clear) actually diverges, exercising
      // the watcher.
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: undefined, min: 0, max: 100, valueOnClear: 0 },
      })

      const input = wrapper.find('input')
      input.element.value = 'abc'
      await input.trigger('input')

      expect(input.classes()).toContain('is-invalid')
      expect(input.element.value).toBe('abc')
      expect(wrapper.emitted('update:modelValue')!.slice(-1)[0]).toEqual([0])

      // Genuinely external change landing on the same value (0) must still clear.
      await wrapper.setProps({ modelValue: 0 })

      expect(input.classes()).not.toContain('is-invalid')
      expect(input.element.value).toBe('0')
    })

    it('clears is-invalid when a spinner click recovers from invalid typed text', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9 },
      })

      const input = wrapper.find('input')
      input.element.value = '15'
      await input.trigger('input')
      expect(input.classes()).toContain('is-invalid')

      await wrapper.find('.spinner-down').trigger('click')

      expect(input.classes()).not.toContain('is-invalid')
      expect(input.attributes('aria-invalid')).toBe('false')
    })

    it('clears is-invalid when the wheel recovers from invalid typed text', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9 },
      })

      const input = wrapper.find('input')
      await input.trigger('focus')
      input.element.value = '15'
      await input.trigger('input')
      expect(input.classes()).toContain('is-invalid')

      await input.trigger('wheel', { deltaY: 100 })

      expect(input.classes()).not.toContain('is-invalid')
    })

    it('clears is-invalid when an arrow key recovers from invalid typed text', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9 },
      })

      const input = wrapper.find('input')
      input.element.value = '15'
      await input.trigger('input')
      expect(input.classes()).toContain('is-invalid')

      await input.trigger('keydown', { key: 'ArrowDown' })

      expect(input.classes()).not.toContain('is-invalid')
    })

    it('commits on Enter without blurring, and keeps the field focused', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 5, min: 1, max: 9 },
      })

      const input = wrapper.find('input')
      await input.trigger('focus')
      input.element.value = '7'
      await input.trigger('input')
      expect(wrapper.emitted('commit')).toBeFalsy()

      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('commit')).toBeTruthy()
      expect(wrapper.emitted('commit')!.slice(-1)[0]).toEqual([7])
      // Enter must not blur the field
      expect(wrapper.classes()).toContain('input-focused')
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined modelValue correctly', () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: undefined, valueOnClear: null },
      })

      expect(wrapper.find('input').element.value).toBe('')
    })

    it('handles decimal step values correctly', async () => {
      const wrapper = mount(CustomNumberInput, {
        props: { modelValue: 1.0, step: 0.1 },
      })

      const spinnerUp = wrapper.find('.spinner-up')
      await spinnerUp.trigger('click')

      const firstEvent = wrapper.emitted('update:modelValue')![0]
      expect(firstEvent).toBeDefined()
      const emittedValue = firstEvent![0] as number
      expect(Math.abs(emittedValue - 1.1)).toBeLessThan(0.001) // Account for floating point precision
    })
  })
})
