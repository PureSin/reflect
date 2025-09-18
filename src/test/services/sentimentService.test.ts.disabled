import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sentimentService } from '../../services/sentimentService'
import { Entry } from '../../types'
import { SentimentAnalysis } from '../../types/ai.types'

// Mock LLM service
const mockLlmService = {
  isModelReady: vi.fn(() => true),
  analyzeText: vi.fn()
}

vi.mock('../../services/llmService', () => ({
  llmService: mockLlmService
}))

describe('SentimentService', () => {
  const mockEntry: Entry = {
    id: 'test-entry-1',
    content: '<p>I feel really happy today! Had a great time with friends and accomplished my goals.</p>',
    plainText: 'I feel really happy today! Had a great time with friends and accomplished my goals.',
    created: new Date('2024-01-15T10:00:00Z'),
    modified: new Date('2024-01-15T10:00:00Z'),
    targetDate: new Date('2024-01-15T00:00:00Z'),
    metadata: {
      wordCount: 15,
      readingTime: 1,
      tags: ['happy', 'friends', 'goals']
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Single Entry Analysis', () => {
    it('should analyze sentiment successfully', async () => {
      const mockResponse = JSON.stringify({
        sentiment: 'positive',
        confidence: 0.85,
        explanation: 'The entry expresses happiness and satisfaction with social connections and achievements',
        keywords: ['happy', 'great', 'accomplished', 'friends']
      })

      mockLlmService.analyzeText.mockResolvedValue(mockResponse)

      const result = await sentimentService.analyzeSentiment(mockEntry)

      expect(result).toBeDefined()
      expect(result?.sentiment).toBe('positive')
      expect(result?.confidence).toBe(0.85)
      expect(result?.keywords).toContain('happy')
      expect(result?.analyzedAt).toBeInstanceOf(Date)
      expect(mockLlmService.analyzeText).toHaveBeenCalledWith(
        expect.stringContaining('I feel really happy today'),
        expect.stringContaining('sentiment analysis')
      )
    })

    it('should return null if model is not ready', async () => {
      mockLlmService.isModelReady.mockReturnValue(false)

      const result = await sentimentService.analyzeSentiment(mockEntry)

      expect(result).toBeNull()
      expect(mockLlmService.analyzeText).not.toHaveBeenCalled()
    })

    it('should handle analysis errors gracefully', async () => {
      mockLlmService.analyzeText.mockRejectedValue(new Error('Analysis failed'))

      const result = await sentimentService.analyzeSentiment(mockEntry)

      expect(result).toBeNull()
    })

    it('should handle invalid JSON response', async () => {
      mockLlmService.analyzeText.mockResolvedValue('Invalid JSON response')

      const result = await sentimentService.analyzeSentiment(mockEntry)

      expect(result).toBeNull()
    })

    it('should validate sentiment values', async () => {
      const mockResponse = JSON.stringify({
        sentiment: 'invalid-sentiment',
        confidence: 1.5, // Invalid confidence > 1
        explanation: 'Test explanation',
        keywords: ['test']
      })

      mockLlmService.analyzeText.mockResolvedValue(mockResponse)

      const result = await sentimentService.analyzeSentiment(mockEntry)

      // Should fallback to neutral with valid confidence
      expect(result?.sentiment).toBe('neutral')
      expect(result?.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('Batch Analysis', () => {
    const mockEntries: Entry[] = [
      mockEntry,
      {
        ...mockEntry,
        id: 'test-entry-2',
        content: '<p>Feeling down today, nothing seems to go right.</p>',
        plainText: 'Feeling down today, nothing seems to go right.',
        metadata: { ...mockEntry.metadata, tags: ['sad', 'frustrated'] }
      },
      {
        ...mockEntry,
        id: 'test-entry-3',
        content: '<p>Just a regular day, nothing special.</p>',
        plainText: 'Just a regular day, nothing special.',
        metadata: { ...mockEntry.metadata, tags: ['neutral', 'routine'] }
      }
    ]

    it('should analyze multiple entries', async () => {
      const mockResponses = [
        JSON.stringify({ sentiment: 'positive', confidence: 0.8, explanation: 'Happy', keywords: ['happy'] }),
        JSON.stringify({ sentiment: 'negative', confidence: 0.7, explanation: 'Sad', keywords: ['down'] }),
        JSON.stringify({ sentiment: 'neutral', confidence: 0.6, explanation: 'Neutral', keywords: ['regular'] })
      ]

      mockLlmService.analyzeText
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])

      const progressCallback = vi.fn()
      const results = await sentimentService.analyzeBatch(mockEntries, progressCallback)

      expect(results).toHaveLength(3)
      expect(results[0]?.sentiment).toBe('positive')
      expect(results[1]?.sentiment).toBe('negative')
      expect(results[2]?.sentiment).toBe('neutral')
      expect(progressCallback).toHaveBeenCalledTimes(3)
    })

    it('should handle partial failures in batch analysis', async () => {
      mockLlmService.analyzeText
        .mockResolvedValueOnce(JSON.stringify({ sentiment: 'positive', confidence: 0.8, explanation: 'Happy', keywords: ['happy'] }))
        .mockRejectedValueOnce(new Error('Analysis failed'))
        .mockResolvedValueOnce(JSON.stringify({ sentiment: 'neutral', confidence: 0.6, explanation: 'Neutral', keywords: ['regular'] }))

      const results = await sentimentService.analyzeBatch(mockEntries)

      expect(results).toHaveLength(3)
      expect(results[0]).toBeDefined()
      expect(results[1]).toBeNull() // Failed analysis
      expect(results[2]).toBeDefined()
    })

    it('should respect batch configuration', async () => {
      mockLlmService.analyzeText.mockResolvedValue(
        JSON.stringify({ sentiment: 'positive', confidence: 0.8, explanation: 'Happy', keywords: ['happy'] })
      )

      const config = {
        batchSize: 2,
        delayBetweenRequests: 100
      }

      const startTime = Date.now()
      await sentimentService.analyzeBatch(mockEntries, undefined, config)
      const endTime = Date.now()

      // Should have some delay between batches
      expect(endTime - startTime).toBeGreaterThan(50)
      expect(mockLlmService.analyzeText).toHaveBeenCalledTimes(3)
    })
  })

  describe('Sentiment Aggregation', () => {
    it('should calculate average sentiment score', () => {
      const analyses: SentimentAnalysis[] = [
        {
          sentiment: 'positive',
          confidence: 0.8,
          explanation: 'Happy',
          keywords: ['happy'],
          analyzedAt: new Date()
        },
        {
          sentiment: 'negative',
          confidence: 0.7,
          explanation: 'Sad',
          keywords: ['sad'],
          analyzedAt: new Date()
        },
        {
          sentiment: 'neutral',
          confidence: 0.6,
          explanation: 'Neutral',
          keywords: ['okay'],
          analyzedAt: new Date()
        }
      ]

      const avgScore = sentimentService.calculateAverageSentiment(analyses)
      
      // positive = 4, negative = 2, neutral = 3, so average should be 3
      expect(avgScore).toBe(3)
    })

    it('should handle empty analysis array', () => {
      const avgScore = sentimentService.calculateAverageSentiment([])
      expect(avgScore).toBe(3) // Should default to neutral
    })

    it('should get sentiment distribution', () => {
      const analyses: SentimentAnalysis[] = [
        { sentiment: 'positive', confidence: 0.8, explanation: '', keywords: [], analyzedAt: new Date() },
        { sentiment: 'positive', confidence: 0.9, explanation: '', keywords: [], analyzedAt: new Date() },
        { sentiment: 'negative', confidence: 0.7, explanation: '', keywords: [], analyzedAt: new Date() },
        { sentiment: 'neutral', confidence: 0.6, explanation: '', keywords: [], analyzedAt: new Date() }
      ]

      const distribution = sentimentService.getSentimentDistribution(analyses)

      expect(distribution.positive).toBe(2)
      expect(distribution.negative).toBe(1)
      expect(distribution.neutral).toBe(1)
      expect(distribution['very-positive']).toBe(0)
      expect(distribution['very-negative']).toBe(0)
    })
  })

  describe('Sentiment Trends', () => {
    it('should calculate sentiment trend over time', () => {
      const entriesWithAnalyses = [
        {
          entry: { ...mockEntry, targetDate: new Date('2024-01-01') },
          analysis: { sentiment: 'negative' as const, confidence: 0.7, explanation: '', keywords: [], analyzedAt: new Date() }
        },
        {
          entry: { ...mockEntry, targetDate: new Date('2024-01-02') },
          analysis: { sentiment: 'neutral' as const, confidence: 0.6, explanation: '', keywords: [], analyzedAt: new Date() }
        },
        {
          entry: { ...mockEntry, targetDate: new Date('2024-01-03') },
          analysis: { sentiment: 'positive' as const, confidence: 0.8, explanation: '', keywords: [], analyzedAt: new Date() }
        }
      ]

      const trend = sentimentService.calculateSentimentTrend(entriesWithAnalyses)

      expect(trend.trend).toBe('improving')
      expect(trend.dataPoints).toHaveLength(3)
      expect(trend.dataPoints[0].value).toBe(2) // negative
      expect(trend.dataPoints[2].value).toBe(4) // positive
      expect(trend.changeRate).toBeGreaterThan(0)
    })

    it('should detect declining sentiment trend', () => {
      const entriesWithAnalyses = [
        {
          entry: { ...mockEntry, targetDate: new Date('2024-01-01') },
          analysis: { sentiment: 'positive' as const, confidence: 0.8, explanation: '', keywords: [], analyzedAt: new Date() }
        },
        {
          entry: { ...mockEntry, targetDate: new Date('2024-01-02') },
          analysis: { sentiment: 'neutral' as const, confidence: 0.6, explanation: '', keywords: [], analyzedAt: new Date() }
        },
        {
          entry: { ...mockEntry, targetDate: new Date('2024-01-03') },
          analysis: { sentiment: 'negative' as const, confidence: 0.7, explanation: '', keywords: [], analyzedAt: new Date() }
        }
      ]

      const trend = sentimentService.calculateSentimentTrend(entriesWithAnalyses)

      expect(trend.trend).toBe('declining')
      expect(trend.changeRate).toBeLessThan(0)
    })

    it('should detect stable sentiment trend', () => {
      const entriesWithAnalyses = [
        {
          entry: { ...mockEntry, targetDate: new Date('2024-01-01') },
          analysis: { sentiment: 'neutral' as const, confidence: 0.6, explanation: '', keywords: [], analyzedAt: new Date() }
        },
        {
          entry: { ...mockEntry, targetDate: new Date('2024-01-02') },
          analysis: { sentiment: 'neutral' as const, confidence: 0.6, explanation: '', keywords: [], analyzedAt: new Date() }
        },
        {
          entry: { ...mockEntry, targetDate: new Date('2024-01-03') },
          analysis: { sentiment: 'neutral' as const, confidence: 0.6, explanation: '', keywords: [], analyzedAt: new Date() }
        }
      ]

      const trend = sentimentService.calculateSentimentTrend(entriesWithAnalyses)

      expect(trend.trend).toBe('stable')
      expect(Math.abs(trend.changeRate)).toBeLessThan(0.1)
    })
  })

  describe('Keyword Analysis', () => {
    it('should extract top sentiment keywords', () => {
      const analyses: SentimentAnalysis[] = [
        { sentiment: 'positive', confidence: 0.8, explanation: '', keywords: ['happy', 'joy', 'excited'], analyzedAt: new Date() },
        { sentiment: 'positive', confidence: 0.9, explanation: '', keywords: ['happy', 'grateful', 'pleased'], analyzedAt: new Date() },
        { sentiment: 'negative', confidence: 0.7, explanation: '', keywords: ['sad', 'disappointed'], analyzedAt: new Date() }
      ]

      const topKeywords = sentimentService.getTopSentimentKeywords(analyses, 3)

      expect(topKeywords).toContain('happy') // Should be most frequent
      expect(topKeywords).toHaveLength(3)
    })

    it('should handle empty keywords array', () => {
      const analyses: SentimentAnalysis[] = [
        { sentiment: 'neutral', confidence: 0.6, explanation: '', keywords: [], analyzedAt: new Date() }
      ]

      const topKeywords = sentimentService.getTopSentimentKeywords(analyses, 5)

      expect(topKeywords).toEqual([])
    })
  })
})