import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock searchService to avoid complex dependencies
vi.mock('../../services/searchService', () => ({
  searchService: {
    addEntry: vi.fn(),
    updateEntry: vi.fn(),
    removeEntry: vi.fn(),
    initializeIndex: vi.fn(),
    getStats: vi.fn(() => ({ totalEntries: 0 })),
    search: vi.fn(() => []),
    searchByTags: vi.fn(() => []),
    searchByDateRange: vi.fn(() => []),
    getSuggestions: vi.fn(() => [])
  }
}))

import { dbService, JournalDatabase } from '../../services/database'
import { Entry, UserPreferences } from '../../types'
import { AIAnalysis } from '../../types/ai.types'
import { WeeklySummary, WeeklySummaryAnalysis } from '../../types/weekly.types'
import { searchService } from '../../services/searchService'

const mockSearchService = searchService as any

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${Date.now()}-${Math.random()}`
  }
})

// Test database instance
let testDb: JournalDatabase

describe('Database Service', () => {
  beforeEach(async () => {
    // Create a new test database instance
    testDb = new JournalDatabase()
    
    // Clear all tables
    try {
      await testDb.entries.clear()
      await testDb.preferences.clear()
      await testDb.aiAnalyses.clear()
      await testDb.weeklySummaries.clear()
      await testDb.weeklySummaryAnalyses.clear()
    } catch (error) {
      // Database might not exist yet, which is fine
    }
    
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up
    try {
      await testDb.delete()
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Entry Operations', () => {
    it('should create a new entry', async () => {
      const entryData = {
        content: '<p>Test content</p>',
        plainText: 'Test content',
        metadata: {
          wordCount: 2,
          readingTime: 1,
          tags: ['test']
        }
      }

      const entry = await dbService.createEntry(entryData)

      expect(entry.id).toBeDefined()
      expect(entry.content).toBe(entryData.content)
      expect(entry.plainText).toBe(entryData.plainText)
      expect(entry.created).toBeInstanceOf(Date)
      expect(entry.modified).toBeInstanceOf(Date)
      expect(entry.targetDate).toBeInstanceOf(Date)
      expect(entry.metadata.wordCount).toBe(2)
      expect(mockSearchService.addEntry).toHaveBeenCalledWith(entry)
    })

    it('should create entry with custom target date', async () => {
      const targetDate = new Date('2024-01-15')
      const entryData = {
        content: '<p>Test content</p>',
        plainText: 'Test content',
        metadata: {
          wordCount: 2,
          readingTime: 1,
          tags: []
        }
      }

      const entry = await dbService.createEntry(entryData, targetDate)

      expect(entry.targetDate.toISOString().split('T')[0]).toBe('2024-01-15')
    })

    it('should retrieve an entry by ID', async () => {
      const entryData = {
        content: '<p>Test content</p>',
        plainText: 'Test content',
        metadata: {
          wordCount: 2,
          readingTime: 1,
          tags: []
        }
      }

      const createdEntry = await dbService.createEntry(entryData)
      const retrievedEntry = await dbService.getEntry(createdEntry.id)

      expect(retrievedEntry).toBeDefined()
      expect(retrievedEntry?.id).toBe(createdEntry.id)
      expect(retrievedEntry?.content).toBe(entryData.content)
    })

    it('should update an entry', async () => {
      const entryData = {
        content: '<p>Original content</p>',
        plainText: 'Original content',
        metadata: {
          wordCount: 2,
          readingTime: 1,
          tags: []
        }
      }

      const entry = await dbService.createEntry(entryData)
      const originalModified = entry.modified

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10))

      const updates = {
        content: '<p>Updated content</p>',
        plainText: 'Updated content',
        metadata: {
          wordCount: 2,
          readingTime: 1,
          tags: ['updated']
        }
      }

      await dbService.updateEntry(entry.id, updates)

      const updatedEntry = await dbService.getEntry(entry.id)
      expect(updatedEntry?.content).toBe('<p>Updated content</p>')
      expect(updatedEntry?.metadata.tags).toContain('updated')
      expect(updatedEntry?.modified.getTime()).toBeGreaterThan(originalModified.getTime())
      expect(mockSearchService.updateEntry).toHaveBeenCalled()
    })

    it('should delete an entry', async () => {
      const entryData = {
        content: '<p>Test content</p>',
        plainText: 'Test content',
        metadata: {
          wordCount: 2,
          readingTime: 1,
          tags: []
        }
      }

      const entry = await dbService.createEntry(entryData)
      await dbService.deleteEntry(entry.id)

      const retrievedEntry = await dbService.getEntry(entry.id)
      expect(retrievedEntry).toBeUndefined()
      expect(mockSearchService.removeEntry).toHaveBeenCalledWith(entry.id)
    })

    it('should get entry by date', async () => {
      const targetDate = new Date('2024-01-15T10:00:00.000Z')
      const entryData = {
        content: '<p>Test content</p>',
        plainText: 'Test content',
        metadata: {
          wordCount: 2,
          readingTime: 1,
          tags: []
        }
      }

      await dbService.createEntry(entryData, targetDate)

      const searchDate = new Date('2024-01-15T15:00:00.000Z') // Same day, different time
      const foundEntry = await dbService.getEntryByDate(searchDate)

      expect(foundEntry).toBeDefined()
      expect(foundEntry?.plainText).toBe('Test content')
    })

    it('should get entries by date range', async () => {
      const dates = [
        new Date('2024-01-10'),
        new Date('2024-01-15'),
        new Date('2024-01-20'),
        new Date('2024-01-25')
      ]

      // Create entries with different target dates
      for (const date of dates) {
        await dbService.createEntry({
          content: `<p>Content for ${date.toISOString()}</p>`,
          plainText: `Content for ${date.toISOString()}`,
          metadata: { wordCount: 5, readingTime: 1, tags: [] }
        }, date)
      }

      const startDate = new Date('2024-01-12')
      const endDate = new Date('2024-01-22')
      const entries = await dbService.getEntriesByDateRange(startDate, endDate)

      expect(entries).toHaveLength(2) // Should include Jan 15 and Jan 20
      expect(entries.some(e => e.targetDate.toISOString().includes('2024-01-15'))).toBe(true)
      expect(entries.some(e => e.targetDate.toISOString().includes('2024-01-20'))).toBe(true)
    })

    it('should calculate current streak', async () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      // Create entries for consecutive days
      await dbService.createEntry({
        content: '<p>Today</p>',
        plainText: 'Today',
        metadata: { wordCount: 1, readingTime: 1, tags: [] }
      }, today)

      await dbService.createEntry({
        content: '<p>Yesterday</p>',
        plainText: 'Yesterday',
        metadata: { wordCount: 1, readingTime: 1, tags: [] }
      }, yesterday)

      await dbService.createEntry({
        content: '<p>Two days ago</p>',
        plainText: 'Two days ago',
        metadata: { wordCount: 3, readingTime: 1, tags: [] }
      }, twoDaysAgo)

      const streak = await dbService.getCurrentStreak()
      expect(streak).toBe(3)
    })
  })

  describe('User Preferences', () => {
    it('should return default preferences if none exist', async () => {
      const preferences = await dbService.getPreferences()

      expect(preferences.id).toBe('default')
      expect(preferences.theme).toBe('auto')
      expect(preferences.fontSize).toBe('medium')
      expect(preferences.dailyPrompts).toBe(true)
      expect(preferences.autoSave).toBe(true)
    })

    it('should update preferences', async () => {
      await dbService.getPreferences() // Create default preferences

      const updates = {
        theme: 'dark' as const,
        fontSize: 'large' as const,
        dailyPrompts: false
      }

      await dbService.updatePreferences(updates)

      const updatedPreferences = await dbService.getPreferences()
      expect(updatedPreferences.theme).toBe('dark')
      expect(updatedPreferences.fontSize).toBe('large')
      expect(updatedPreferences.dailyPrompts).toBe(false)
      expect(updatedPreferences.autoSave).toBe(true) // Should remain unchanged
    })
  })

  describe('AI Analysis Operations', () => {
    let testEntry: Entry

    beforeEach(async () => {
      testEntry = await dbService.createEntry({
        content: '<p>Test content for AI</p>',
        plainText: 'Test content for AI',
        metadata: { wordCount: 4, readingTime: 1, tags: [] }
      })
    })

    it('should save AI analysis', async () => {
      const analysisData = {
        entryId: testEntry.id,
        sentiment: {
          sentiment: 'neutral' as const,
          confidence: 0.8,
          explanation: 'Test analysis',
          keywords: ['test'],
          analyzedAt: new Date()
        },
        happiness: {
          lifeEvaluation: 7,
          positiveAffect: 6,
          negativeAffect: 4,
          socialSupport: 8,
          personalGrowth: 7,
          overallScore: 6.4,
          analyzedAt: new Date(),
          confidence: 0.8,
          insights: ['Test insight']
        }
      }

      const analysis = await dbService.saveAIAnalysis(analysisData)

      expect(analysis.id).toBeDefined()
      expect(analysis.entryId).toBe(testEntry.id)
      expect(analysis.sentiment.sentiment).toBe('neutral')
      expect(analysis.happiness.overallScore).toBe(6.4)
      expect(analysis.createdAt).toBeInstanceOf(Date)
      expect(analysis.updatedAt).toBeInstanceOf(Date)
    })

    it('should replace existing AI analysis for entry', async () => {
      const firstAnalysis = await dbService.saveAIAnalysis({
        entryId: testEntry.id,
        sentiment: {
          sentiment: 'positive' as const,
          confidence: 0.7,
          explanation: 'First analysis',
          keywords: ['first'],
          analyzedAt: new Date()
        },
        happiness: {
          lifeEvaluation: 8,
          positiveAffect: 8,
          negativeAffect: 3,
          socialSupport: 7,
          personalGrowth: 8,
          overallScore: 7.5,
          analyzedAt: new Date(),
          confidence: 0.7,
          insights: ['First insight']
        }
      })

      const secondAnalysis = await dbService.saveAIAnalysis({
        entryId: testEntry.id,
        sentiment: {
          sentiment: 'negative' as const,
          confidence: 0.9,
          explanation: 'Second analysis',
          keywords: ['second'],
          analyzedAt: new Date()
        },
        happiness: {
          lifeEvaluation: 4,
          positiveAffect: 3,
          negativeAffect: 8,
          socialSupport: 5,
          personalGrowth: 4,
          overallScore: 3.5,
          analyzedAt: new Date(),
          confidence: 0.9,
          insights: ['Second insight']
        }
      })

      const retrievedAnalysis = await dbService.getAIAnalysisForEntry(testEntry.id)
      expect(retrievedAnalysis?.id).toBe(secondAnalysis.id)
      expect(retrievedAnalysis?.sentiment.sentiment).toBe('negative')

      // First analysis should be deleted
      const allAnalyses = await dbService.getAllAIAnalyses()
      expect(allAnalyses).toHaveLength(1)
    })

    it('should delete AI analysis for entry', async () => {
      await dbService.saveAIAnalysis({
        entryId: testEntry.id,
        sentiment: {
          sentiment: 'neutral' as const,
          confidence: 0.8,
          explanation: 'Test analysis',
          keywords: ['test'],
          analyzedAt: new Date()
        },
        happiness: {
          lifeEvaluation: 7,
          positiveAffect: 6,
          negativeAffect: 4,
          socialSupport: 8,
          personalGrowth: 7,
          overallScore: 6.4,
          analyzedAt: new Date(),
          confidence: 0.8,
          insights: ['Test insight']
        }
      })

      await dbService.deleteAIAnalysisForEntry(testEntry.id)

      const analysis = await dbService.getAIAnalysisForEntry(testEntry.id)
      expect(analysis).toBeUndefined()
    })
  })

  describe('Weekly Summary Operations', () => {
    it('should calculate week bounds correctly', () => {
      // Test Monday (should be start of week)
      const monday = new Date('2024-01-15T12:00:00.000Z') // Monday
      const bounds = dbService.getWeekBounds(monday)

      expect(bounds.weekStartDate.getDay()).toBe(1) // Monday
      expect(bounds.weekEndDate.getDay()).toBe(0) // Sunday
      expect(bounds.weekStartDate.getHours()).toBe(0)
      expect(bounds.weekEndDate.getHours()).toBe(23)
    })

    it('should save and retrieve weekly summary', async () => {
      const weekBounds = dbService.getWeekBounds(new Date('2024-01-15'))
      const summaryData = {
        weekStartDate: weekBounds.weekStartDate,
        weekEndDate: weekBounds.weekEndDate,
        weekNumber: weekBounds.weekNumber,
        year: weekBounds.year,
        totalEntries: 5,
        totalWords: 1000,
        averageWordsPerEntry: 200,
        tags: ['productive', 'reflective'],
        topThemes: ['work', 'personal'],
        entryIds: ['entry1', 'entry2']
      }

      const summary = await dbService.saveWeeklySummary(summaryData)

      expect(summary.id).toBeDefined()
      expect(summary.totalEntries).toBe(5)
      expect(summary.createdAt).toBeInstanceOf(Date)

      const retrieved = await dbService.getWeeklySummaryByWeek(
        weekBounds.weekStartDate,
        weekBounds.weekEndDate
      )
      expect(retrieved?.id).toBe(summary.id)
    })

    it('should replace existing weekly summary', async () => {
      const weekBounds = dbService.getWeekBounds(new Date('2024-01-15'))
      
      const firstSummary = await dbService.saveWeeklySummary({
        weekStartDate: weekBounds.weekStartDate,
        weekEndDate: weekBounds.weekEndDate,
        weekNumber: weekBounds.weekNumber,
        year: weekBounds.year,
        totalEntries: 3,
        totalWords: 500,
        averageWordsPerEntry: 167,
        tags: [],
        topThemes: [],
        entryIds: []
      })

      const secondSummary = await dbService.saveWeeklySummary({
        weekStartDate: weekBounds.weekStartDate,
        weekEndDate: weekBounds.weekEndDate,
        weekNumber: weekBounds.weekNumber,
        year: weekBounds.year,
        totalEntries: 5,
        totalWords: 1000,
        averageWordsPerEntry: 200,
        tags: [],
        topThemes: [],
        entryIds: []
      })

      const allSummaries = await dbService.getAllWeeklySummaries()
      expect(allSummaries).toHaveLength(1)
      expect(allSummaries[0].id).toBe(secondSummary.id)
      expect(allSummaries[0].totalEntries).toBe(5)
    })
  })

  describe('Export/Import Operations', () => {
    it('should export all data', async () => {
      // Create test data
      const entry = await dbService.createEntry({
        content: '<p>Export test</p>',
        plainText: 'Export test',
        metadata: { wordCount: 2, readingTime: 1, tags: [] }
      })

      await dbService.saveAIAnalysis({
        entryId: entry.id,
        sentiment: { mood: 'neutral', confidence: 0.8 },
        themes: ['export'],
        summary: 'Export test',
        version: '1.0'
      })

      await dbService.updatePreferences({ theme: 'dark' })

      const exportData = await dbService.exportData()

      expect(exportData.entries).toHaveLength(1)
      expect(exportData.aiAnalyses).toHaveLength(1)
      expect(exportData.preferences.theme).toBe('dark')
      expect(exportData.weeklySummaries).toHaveLength(0)
      expect(exportData.weeklySummaryAnalyses).toHaveLength(0)
    })

    it('should import data correctly', async () => {
      const importData = {
        entries: [{
          id: 'import-entry-1',
          content: '<p>Imported content</p>',
          plainText: 'Imported content',
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
          targetDate: new Date('2024-01-01'),
          metadata: { wordCount: 2, readingTime: 1, tags: ['imported'] }
        }],
        preferences: {
          id: 'default',
          theme: 'light' as const,
          fontSize: 'small' as const,
          dailyPrompts: false,
          autoSave: false
        },
        aiAnalyses: [{
          id: 'import-analysis-1',
          entryId: 'import-entry-1',
          sentiment: {
            sentiment: 'positive' as const,
            confidence: 0.9,
            explanation: 'Imported analysis',
            keywords: ['import'],
            analyzedAt: new Date('2024-01-01')
          },
          happiness: {
            lifeEvaluation: 8,
            positiveAffect: 9,
            negativeAffect: 2,
            socialSupport: 7,
            personalGrowth: 8,
            overallScore: 8.0,
            analyzedAt: new Date('2024-01-01'),
            confidence: 0.9,
            insights: ['Imported insight']
          },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }]
      }

      await dbService.importData(importData)

      const entries = await dbService.getAllEntries()
      const preferences = await dbService.getPreferences()
      const analyses = await dbService.getAllAIAnalyses()

      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('import-entry-1')
      expect(preferences.theme).toBe('light')
      expect(analyses).toHaveLength(1)
      expect(mockSearchService.initializeIndex).toHaveBeenCalledWith(importData.entries)
    })
  })

  describe('Search Integration', () => {
    it('should delegate search operations to searchService', async () => {
      const mockResults = [{ id: 'test' } as Entry]
      mockSearchService.search.mockResolvedValue(mockResults)

      const results = await dbService.searchEntries('test query')

      expect(mockSearchService.search).toHaveBeenCalledWith('test query', undefined)
      expect(results).toBe(mockResults)
    })

    it('should return empty array for empty search query', async () => {
      const results = await dbService.searchEntries('   ')
      
      expect(results).toEqual([])
      expect(mockSearchService.search).not.toHaveBeenCalled()
    })

    it('should search by tags', async () => {
      const mockResults = [{ id: 'test' } as Entry]
      mockSearchService.searchByTags.mockResolvedValue(mockResults)

      const results = await dbService.searchEntriesByTags(['tag1', 'tag2'])

      expect(mockSearchService.searchByTags).toHaveBeenCalledWith(['tag1', 'tag2'])
      expect(results).toBe(mockResults)
    })
  })
})