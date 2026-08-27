const RECENTLY_USED_CHARACTERS_KEY = 'kle-ng-recently-used-characters'
const MAX_RECENTLY_USED_CHARACTERS = 24

export interface RecentlyUsedCharactersManager {
  getRecentlyUsedCharacters(): string[]
  addCharacter(char: string): void
  clear(): void
}

class RecentlyUsedCharactersManagerImpl implements RecentlyUsedCharactersManager {
  getRecentlyUsedCharacters(): string[] {
    try {
      const stored = localStorage.getItem(RECENTLY_USED_CHARACTERS_KEY)
      if (stored) {
        const characters = JSON.parse(stored)
        return Array.isArray(characters) ? characters.slice(0, MAX_RECENTLY_USED_CHARACTERS) : []
      }
    } catch (error) {
      console.warn('Failed to load recently used characters from localStorage:', error)
    }
    return []
  }

  addCharacter(char: string): void {
    if (!char) {
      return
    }

    const characters = this.getRecentlyUsedCharacters()

    // Remove character if it already exists
    const filteredCharacters = characters.filter((c) => c !== char)

    // Add to beginning and limit to MAX_RECENTLY_USED_CHARACTERS
    const updatedCharacters = [char, ...filteredCharacters].slice(0, MAX_RECENTLY_USED_CHARACTERS)

    try {
      localStorage.setItem(RECENTLY_USED_CHARACTERS_KEY, JSON.stringify(updatedCharacters))
    } catch (error) {
      console.warn('Failed to save recently used characters to localStorage:', error)
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(RECENTLY_USED_CHARACTERS_KEY)
    } catch (error) {
      console.warn('Failed to clear recently used characters from localStorage:', error)
    }
  }
}

// Create singleton instance
export const recentlyUsedCharactersManager: RecentlyUsedCharactersManager =
  new RecentlyUsedCharactersManagerImpl()
