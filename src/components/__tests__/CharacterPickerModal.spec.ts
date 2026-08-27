import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CharacterPickerModal from '../CharacterPickerModal.vue'
import { useKeyboardStore } from '@/stores/keyboard'
import { useCharacterPickerStore } from '@/stores/characterPicker'
import * as recentlyUsedCharactersModule from '@/utils/recently-used-characters'

vi.mock('@/utils/recently-used-characters', () => ({
  recentlyUsedCharactersManager: {
    getRecentlyUsedCharacters: vi.fn(() => []),
    addCharacter: vi.fn(),
    clear: vi.fn(),
  },
}))

const mockRecentlyUsedCharactersManager = vi.mocked(
  recentlyUsedCharactersModule.recentlyUsedCharactersManager,
)

describe('CharacterPickerModal', () => {
  let wrapper: VueWrapper
  let keyboardStore: ReturnType<typeof useKeyboardStore>
  let characterPickerStore: ReturnType<typeof useCharacterPickerStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockRecentlyUsedCharactersManager.getRecentlyUsedCharacters.mockReturnValue([])

    keyboardStore = useKeyboardStore()
    characterPickerStore = useCharacterPickerStore()

    wrapper = mount(CharacterPickerModal, {
      props: { visible: true },
      attachTo: document.body,
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('shows a disabled-selection warning and grays out tiles when nothing is selected', () => {
    expect(wrapper.find('.alert-warning').exists()).toBe(true)
    const firstTile = wrapper.find('.char-tile')
    expect(firstTile.attributes('disabled')).toBeDefined()
  })

  it('enables the grid once a key is selected', async () => {
    keyboardStore.addKey()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert-warning').exists()).toBe(false)
    const firstTile = wrapper.find('.char-tile')
    expect(firstTile.attributes('disabled')).toBeUndefined()
  })

  it('filters the grid by search query', async () => {
    const search = wrapper.find('input[type="text"]')
    await search.setValue('copy')
    await wrapper.vm.$nextTick()

    const tiles = wrapper.findAll('.char-tile')
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.some((tile) => tile.text() === '©')).toBe(true)
  })

  it('shows an empty state for a query matching nothing', async () => {
    const search = wrapper.find('input[type="text"]')
    await search.setValue('zzzzzznotarealname')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No characters found')
  })

  it('inserts the clicked character into the selected key label and tracks it as recently used', async () => {
    keyboardStore.addKey()
    characterPickerStore.setActiveLabel(0, null)
    await wrapper.vm.$nextTick()

    const search = wrapper.find('input[type="text"]')
    await search.setValue('copy')
    await wrapper.vm.$nextTick()

    const tile = wrapper.findAll('.char-tile').find((t) => t.text() === '©')
    expect(tile).toBeDefined()
    await tile!.trigger('click')

    expect(keyboardStore.selectedKeys[0]?.labels[0]).toBe('©')
    expect(mockRecentlyUsedCharactersManager.addCharacter).toHaveBeenCalledWith('©')
  })

  it('does not insert when clicking a tile with no key selected', async () => {
    const search = wrapper.find('input[type="text"]')
    await search.setValue('copy')
    await wrapper.vm.$nextTick()

    const tile = wrapper.findAll('.char-tile').find((t) => t.text() === '©')
    expect(tile).toBeDefined()
    // The button is `disabled`, so a real click wouldn't fire — trigger anyway to
    // confirm the store-level guard (not just the DOM disabled attribute) holds.
    await tile!.trigger('click')

    expect(keyboardStore.selectedKeys).toHaveLength(0)
  })

  describe('category tabs', () => {
    const findTab = (label: string) =>
      wrapper.findAll('.tab-bar-item').find((tab) => tab.text() === label)

    it('renders an "All" tab plus one per category, with "All" active by default', () => {
      const allTab = findTab('All')
      expect(allTab).toBeDefined()
      expect(allTab!.classes()).toContain('active')

      const greekTab = findTab('Greek')
      expect(greekTab).toBeDefined()
      expect(greekTab!.classes()).not.toContain('active')
    })

    it('filters the grid to the selected category', async () => {
      const greekTab = findTab('Greek')
      expect(greekTab).toBeDefined()
      await greekTab!.trigger('click')
      await wrapper.vm.$nextTick()

      expect(greekTab!.classes()).toContain('active')
      // No recently-used chars are mocked in this suite, so the only `.char-grid` is the main one.
      const tiles = wrapper.find('.char-grid').findAll('.char-tile')
      expect(tiles.length).toBeGreaterThan(0)
      expect(tiles.some((tile) => tile.text() === 'α')).toBe(true)
      // '©' is categorized under Latin, not Greek
      expect(tiles.some((tile) => tile.text() === '©')).toBe(false)
    })

    it('clears the search query when switching tabs', async () => {
      const search = wrapper.find('input[type="text"]')
      await search.setValue('copy')
      await wrapper.vm.$nextTick()

      const greekTab = findTab('Greek')
      await greekTab!.trigger('click')
      await wrapper.vm.$nextTick()

      expect((search.element as HTMLInputElement).value).toBe('')
    })

    it('overrides the active tab while searching (search spans all categories)', async () => {
      const greekTab = findTab('Greek')
      await greekTab!.trigger('click')
      await wrapper.vm.$nextTick()

      const search = wrapper.find('input[type="text"]')
      await search.setValue('copy')
      await wrapper.vm.$nextTick()

      // "All" displays as active while searching (search spans every category),
      // without discarding the real Greek selection underneath.
      expect(findTab('All')!.classes()).toContain('active')
      expect(findTab('Greek')!.classes()).not.toContain('active')
      const tiles = wrapper.findAll('.char-tile')
      expect(tiles.some((tile) => tile.text() === '©')).toBe(true)

      // Clearing the search restores the Greek selection rather than resetting to All.
      await search.setValue('')
      await wrapper.vm.$nextTick()
      expect(findTab('Greek')!.classes()).toContain('active')
      const greekTiles = wrapper.find('.char-grid').findAll('.char-tile')
      expect(greekTiles.some((tile) => tile.text() === 'α')).toBe(true)
    })

    it('only shows the recently-used row on the "All" tab', async () => {
      mockRecentlyUsedCharactersManager.getRecentlyUsedCharacters.mockReturnValue(['©'])
      wrapper.unmount()
      // recentlyUsedChars is populated by the `visible` watcher (fires on false -> true),
      // so mount hidden first and then flip it on, matching real CanvasToolbar usage.
      wrapper = mount(CharacterPickerModal, {
        props: { visible: false },
        attachTo: document.body,
      })
      await wrapper.setProps({ visible: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.recently-used').exists()).toBe(true)

      const greekTab = findTab('Greek')
      await greekTab!.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.recently-used').exists()).toBe(false)
    })
  })
})
