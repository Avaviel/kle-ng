import { describe, it, expect, beforeEach, vi } from 'vitest'
import { recentlyUsedCharactersManager } from '../recently-used-characters'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Recently Used Characters Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRecentlyUsedCharacters', () => {
    it('returns empty array when no characters are stored', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const characters = recentlyUsedCharactersManager.getRecentlyUsedCharacters()

      expect(characters).toEqual([])
      expect(localStorageMock.getItem).toHaveBeenCalledWith('kle-ng-recently-used-characters')
    })

    it('returns stored characters when available', () => {
      const stored = ['©', '™', '§']
      localStorageMock.getItem.mockReturnValue(JSON.stringify(stored))

      const characters = recentlyUsedCharactersManager.getRecentlyUsedCharacters()

      expect(characters).toEqual(stored)
    })

    it('limits returned characters to maximum of 24', () => {
      const stored = Array.from({ length: 30 }, (_, i) => String.fromCodePoint(0x2600 + i))
      localStorageMock.getItem.mockReturnValue(JSON.stringify(stored))

      const characters = recentlyUsedCharactersManager.getRecentlyUsedCharacters()

      expect(characters).toHaveLength(24)
      expect(characters).toEqual(stored.slice(0, 24))
    })

    it('handles invalid JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const characters = recentlyUsedCharactersManager.getRecentlyUsedCharacters()

      expect(characters).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load recently used characters from localStorage:',
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })

    it('handles non-array data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('"not-an-array"')

      const characters = recentlyUsedCharactersManager.getRecentlyUsedCharacters()

      expect(characters).toEqual([])
    })
  })

  describe('addCharacter', () => {
    it('adds a new character to the beginning of the list', () => {
      localStorageMock.getItem.mockReturnValue('[]')

      recentlyUsedCharactersManager.addCharacter('©')

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kle-ng-recently-used-characters',
        JSON.stringify(['©']),
      )
    })

    it('moves existing character to the beginning', () => {
      const existing = ['©', '™', '§']
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existing))

      recentlyUsedCharactersManager.addCharacter('™')

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kle-ng-recently-used-characters',
        JSON.stringify(['™', '©', '§']),
      )
    })

    it('limits stored characters to maximum of 24', () => {
      const existing = Array.from({ length: 24 }, (_, i) => String.fromCodePoint(0x2600 + i))
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existing))

      // U+2665 falls outside the 0x2600-0x2617 range used for `existing`, so this is
      // guaranteed to be a genuinely new character rather than a de-duplicated one.
      recentlyUsedCharactersManager.addCharacter('♥')

      const expected = ['♥', ...existing.slice(0, 23)]
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kle-ng-recently-used-characters',
        JSON.stringify(expected),
      )
    })

    it('ignores an empty character', () => {
      localStorageMock.getItem.mockReturnValue('[]')

      recentlyUsedCharactersManager.addCharacter('')

      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('[]')
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      recentlyUsedCharactersManager.addCharacter('©')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save recently used characters to localStorage:',
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })
  })

  describe('clear', () => {
    it('removes characters from localStorage', () => {
      recentlyUsedCharactersManager.clear()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('kle-ng-recently-used-characters')
    })

    it('handles localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      recentlyUsedCharactersManager.clear()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear recently used characters from localStorage:',
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })
  })

  describe('integration tests', () => {
    it('maintains character order correctly through multiple operations', () => {
      localStorageMock.getItem.mockReturnValue('[]')

      recentlyUsedCharactersManager.addCharacter('©')
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
        'kle-ng-recently-used-characters',
        JSON.stringify(['©']),
      )

      localStorageMock.getItem.mockReturnValue(JSON.stringify(['©']))
      recentlyUsedCharactersManager.addCharacter('™')
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
        'kle-ng-recently-used-characters',
        JSON.stringify(['™', '©']),
      )

      localStorageMock.getItem.mockReturnValue(JSON.stringify(['™', '©']))
      recentlyUsedCharactersManager.addCharacter('©')
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
        'kle-ng-recently-used-characters',
        JSON.stringify(['©', '™']),
      )
    })
  })
})
