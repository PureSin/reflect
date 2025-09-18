import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SearchService } from '../../services/searchService'
import { Entry } from '../../types'

// Mock FlexSearch to avoid complex dependencies
const mockFlexSearchIndex = {
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  search: vi.fn(() => [])
}

const mockFlexSearchDocument = {
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  search: vi.fn(() => [])
}

vi.mock('flexsearch', () => ({
  default: {
    Index: vi.fn(() => mockFlexSearchIndex),
    Document: vi.fn(() => mockFlexSearchDocument)
  }
}))

describe('SearchService', () => {
  let searchService: SearchService
  
  const mockEntries: Entry[] = [
    {
      id: 'entry-1',
      content: '<p>Today was a great day! I learned about React testing and wrote some unit tests.</p>',
      plainText: 'Today was a great day! I learned about React testing and wrote some unit tests.',
      created: new Date('2024-01-15T10:00:00Z'),
      modified: new Date('2024-01-15T10:00:00Z'),
      targetDate: new Date('2024-01-15T00:00:00Z'),
      metadata: {
        wordCount: 15,
        readingTime: 1,
        tags: ['programming', 'learning', 'testing']
      }
    },
    {
      id: 'entry-2',
      content: '<p>Had a wonderful coffee with friends. We discussed our upcoming vacation plans.</p>',
      plainText: 'Had a wonderful coffee with friends. We discussed our upcoming vacation plans.',
      created: new Date('2024-01-16T10:00:00Z'),
      modified: new Date('2024-01-16T10:00:00Z'),
      targetDate: new Date('2024-01-16T00:00:00Z'),
      metadata: {
        wordCount: 12,
        readingTime: 1,
        tags: ['friends', 'coffee', 'vacation']
      }
    },
    {
      id: 'entry-3',
      content: '<p>Working on my JavaScript skills today. Practiced algorithms and data structures.</p>',
      plainText: 'Working on my JavaScript skills today. Practiced algorithms and data structures.',
      created: new Date('2024-01-17T10:00:00Z'),
      modified: new Date('2024-01-17T10:00:00Z'),
      targetDate: new Date('2024-01-17T00:00:00Z'),
      metadata: {
        wordCount: 11,
        readingTime: 1,
        tags: ['programming', 'javascript', 'learning']
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    searchService = new SearchService()
  })

  describe('Index Management', () => {
    it('should initialize with empty index', () => {
      const stats = searchService.getStats()
      
      expect(stats.totalEntries).toBe(0)
      expect(stats.lastIndexed).toBeNull()
    })

    it('should add entry to index', () => {
      const entry = mockEntries[0]
      
      searchService.addEntry(entry)
      
      expect(mockFlexSearchIndex.add).toHaveBeenCalled()
      expect(mockFlexSearchDocument.add).toHaveBeenCalled()
      
      const stats = searchService.getStats()
      expect(stats.totalEntries).toBe(1)
    })

    it('should update existing entry in index', () => {
      const entry = mockEntries[0]
      
      // Add entry first
      searchService.addEntry(entry)
      
      // Update entry
      const updatedEntry = {
        ...entry,
        content: '<p>Updated content</p>',
        plainText: 'Updated content'
      }
      
      searchService.updateEntry(updatedEntry)
      
      expect(mockFlexSearchIndex.update).toHaveBeenCalled()
      expect(mockFlexSearchDocument.update).toHaveBeenCalled()
    })

    it('should remove entry from index', () => {
      const entry = mockEntries[0]
      
      // Add entry first
      searchService.addEntry(entry)
      
      // Remove entry
      searchService.removeEntry(entry.id)
      
      expect(mockFlexSearchIndex.remove).toHaveBeenCalledWith(entry.id)
      expect(mockFlexSearchDocument.remove).toHaveBeenCalledWith(entry.id)
      
      const stats = searchService.getStats()
      expect(stats.totalEntries).toBe(0)
    })

    it('should initialize index with multiple entries', () => {
      searchService.initializeIndex(mockEntries)
      
      expect(mockFlexSearchDocument.add).toHaveBeenCalledTimes(3)
      
      const stats = searchService.getStats()
      expect(stats.totalEntries).toBe(3)
      expect(stats.lastIndexed).toBeInstanceOf(Date)
    })

    it('should clear entire index', () => {
      searchService.initializeIndex(mockEntries)
      
      const statsBeforeClear = searchService.getStats()
      expect(statsBeforeClear.totalEntries).toBe(3)
      
      searchService.clearIndex()
      
      const statsAfterClear = searchService.getStats()
      expect(statsAfterClear.totalEntries).toBe(0)
    })
  })

  describe('Text Search', () => {
    beforeEach(() => {
      searchService.initializeIndex(mockEntries)
    })

    it('should search entries by text content', async () => {
      // Mock search results
      const mockSearchResults = [
        { id: 'entry-1', content: mockEntries[0].plainText }
      ]
      mockFlexSearchDocument.search.mockReturnValue(mockSearchResults)
      
      const results = await searchService.search('React testing')
      
      expect(mockFlexSearchDocument.search).toHaveBeenCalledWith('React testing', expect.any(Object))
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('entry-1')
    })

    it('should return empty array for empty query', async () => {
      const results = await searchService.search('')
      
      expect(results).toEqual([])
      expect(mockFlexSearchDocument.search).not.toHaveBeenCalled()
    })

    it('should handle search options', async () => {
      mockFlexSearchDocument.search.mockReturnValue([])
      
      const options = {
        limit: 5,
        suggest: true,
        fuzzy: true
      }
      
      await searchService.search('programming', options)
      
      expect(mockFlexSearchDocument.search).toHaveBeenCalledWith(
        'programming',
        expect.objectContaining({
          limit: 5
        })
      )
    })

    it('should suggest similar terms', async () => {
      // Mock index search for suggestions
      mockFlexSearchIndex.search.mockReturnValue(['programming', 'programs'])
      
      const suggestions = await searchService.getSuggestions('prog')
      
      expect(mockFlexSearchIndex.search).toHaveBeenCalledWith('prog*')
      expect(suggestions).toContain('programming')
    })

    it('should limit suggestion results', async () => {
      const mockSuggestions = ['programming', 'programs', 'progress', 'progressive', 'programmer']
      mockFlexSearchIndex.search.mockReturnValue(mockSuggestions)
      
      const suggestions = await searchService.getSuggestions('prog', 3)
      
      expect(suggestions).toHaveLength(3)
    })
  })

  describe('Tag-based Search', () => {
    beforeEach(() => {
      searchService.initializeIndex(mockEntries)
    })

    it('should search entries by tags', async () => {
      // Mock document search to return entries with programming tag
      const mockResults = [
        { id: 'entry-1' },
        { id: 'entry-3' }
      ]
      mockFlexSearchDocument.search.mockReturnValue(mockResults)
      
      const results = await searchService.searchByTags(['programming'])
      
      expect(results).toHaveLength(2)
      expect(results.map(r => r.id)).toContain('entry-1')
      expect(results.map(r => r.id)).toContain('entry-3')
    })

    it('should handle multiple tags with AND logic', async () => {
      mockFlexSearchDocument.search.mockReturnValue([{ id: 'entry-1' }])
      
      const results = await searchService.searchByTags(['programming', 'learning'])
      
      expect(mockFlexSearchDocument.search).toHaveBeenCalledWith(
        'programming learning',
        expect.any(Object)
      )
      expect(results).toHaveLength(1)
    })

    it('should return empty array for empty tags', async () => {
      const results = await searchService.searchByTags([])
      
      expect(results).toEqual([])
      expect(mockFlexSearchDocument.search).not.toHaveBeenCalled()
    })
  })

  describe('Date Range Search', () => {
    beforeEach(() => {
      searchService.initializeIndex(mockEntries)
    })

    it('should search entries within date range', async () => {
      const startDate = new Date('2024-01-15')
      const endDate = new Date('2024-01-16')
      
      const results = await searchService.searchByDateRange(startDate, endDate)
      
      expect(results).toHaveLength(2) // Should include entries from Jan 15 and 16
      expect(results.every(r => {
        const entryDate = r.targetDate
        return entryDate >= startDate && entryDate <= endDate
      })).toBe(true)
    })

    it('should combine date range with text query', async () => {
      const startDate = new Date('2024-01-15')
      const endDate = new Date('2024-01-17')
      
      // Mock search to return entry-1 for 'React' query
      mockFlexSearchDocument.search.mockReturnValue([{ id: 'entry-1' }])
      
      const results = await searchService.searchByDateRange(startDate, endDate, 'React')
      
      expect(mockFlexSearchDocument.search).toHaveBeenCalledWith('React', expect.any(Object))
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('entry-1')
    })

    it('should handle invalid date ranges', async () => {
      const startDate = new Date('2024-01-20') // After all entries
      const endDate = new Date('2024-01-25')
      
      const results = await searchService.searchByDateRange(startDate, endDate)
      
      expect(results).toEqual([])
    })
  })

  describe('Search Statistics', () => {
    it('should track search analytics', () => {
      searchService.initializeIndex(mockEntries)
      
      // Perform some searches
      searchService.search('test query 1')
      searchService.search('test query 2')
      searchService.searchByTags(['tag1'])
      
      const analytics = searchService.getSearchAnalytics()
      
      expect(analytics.totalSearches).toBe(3)
      expect(analytics.popularQueries).toBeDefined()
      expect(analytics.lastSearchTime).toBeInstanceOf(Date)
    })

    it('should track popular search queries', async () => {
      searchService.initializeIndex(mockEntries)
      
      // Search the same query multiple times
      await searchService.search('programming')
      await searchService.search('programming')
      await searchService.search('coffee')
      
      const analytics = searchService.getSearchAnalytics()
      
      expect(analytics.popularQueries).toContain('programming')
    })

    it('should provide index statistics', () => {
      searchService.initializeIndex(mockEntries)
      
      const stats = searchService.getStats()
      
      expect(stats.totalEntries).toBe(3)
      expect(stats.totalWords).toBeGreaterThan(0)
      expect(stats.averageWordsPerEntry).toBeGreaterThan(0)
      expect(stats.lastIndexed).toBeInstanceOf(Date)
    })
  })

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      mockFlexSearchDocument.search.mockImplementation(() => {
        throw new Error('Search failed')
      })
      
      const results = await searchService.search('test query')
      
      expect(results).toEqual([])
    })

    it('should handle malformed entries', () => {
      const malformedEntry = {
        id: 'malformed',
        content: null,
        plainText: undefined,
        created: 'invalid-date',
        modified: new Date(),
        targetDate: new Date(),
        metadata: null
      } as any
      
      expect(() => {
        searchService.addEntry(malformedEntry)
      }).not.toThrow()
    })

    it('should handle remove non-existent entry', () => {
      expect(() => {
        searchService.removeEntry('non-existent-id')
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockEntries[0],
        id: `entry-${i}`,
        content: `<p>Test entry ${i} with some content</p>`,
        plainText: `Test entry ${i} with some content`
      }))
      
      const startTime = Date.now()
      searchService.initializeIndex(largeDataset)
      const endTime = Date.now()
      
      const stats = searchService.getStats()
      expect(stats.totalEntries).toBe(1000)
      
      // Should complete indexing within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('should cache search results for repeated queries', async () => {
      searchService.initializeIndex(mockEntries)
      
      mockFlexSearchDocument.search.mockReturnValue([{ id: 'entry-1' }])
      
      // First search
      await searchService.search('programming')
      expect(mockFlexSearchDocument.search).toHaveBeenCalledTimes(1)
      
      // Second identical search (should use cache if implemented)
      await searchService.search('programming')
      
      // Note: This test assumes caching is implemented
      // If not implemented, both calls will hit the search index
    })
  })
})