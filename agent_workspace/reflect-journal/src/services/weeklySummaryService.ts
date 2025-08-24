import { llmService } from './llmService';
import { dbService } from './database';
import { Entry } from '../types';
import {
  WeeklySummary,
  WeeklySummaryAnalysis,
  WeeklySummaryRequest,
  WeeklySummaryResult,
  BatchWeeklySummaryRequest,
  BatchWeeklySummaryResult,
  WeeklySummaryProgress,
  WeeklySummaryConfig,
  WeeklySummaryStats
} from '../types/weekly.types';
import {
  AIAnalysis,
  SentimentAnalysis,
  HappinessMetrics,
  SentimentType
} from '../types/ai.types';
import { dateUtils } from '../lib/utils';

/**
 * Service for generating and managing weekly summaries using AI
 */
class WeeklySummaryService {
  private defaultConfig: WeeklySummaryConfig = {
    minEntriesForSummary: 2,
    maxSummaryLength: 800,
    includeEmotionalArc: true,
    includeThemes: true,
    autoGenerateAnalysis: true,
    retryAttempts: 3
  };

  /**
   * Generate a weekly summary from daily journal entries
   */
  async generateWeeklySummary(request: WeeklySummaryRequest): Promise<WeeklySummaryResult> {
    try {
      const { weekStartDate, weekEndDate, entries, includeAnalysis = true } = request;
      
      if (entries.length < this.defaultConfig.minEntriesForSummary) {
        return {
          success: false,
          error: `Minimum ${this.defaultConfig.minEntriesForSummary} entries required for weekly summary`,
          summary: {} as WeeklySummary
        };
      }

      // Generate the weekly narrative summary
      const summaryText = await this.generateWeeklyNarrative(entries, weekStartDate, weekEndDate);
      
      if (!summaryText) {
        return {
          success: false,
          error: 'Failed to generate weekly summary text',
          summary: {} as WeeklySummary
        };
      }

      // Create the weekly summary record
      const { weekNumber, year } = dbService.getWeekBounds(weekStartDate);
      const summary = await dbService.saveWeeklySummary({
        weekStartDate,
        weekEndDate,
        weekNumber,
        year,
        summary: summaryText,
        entryIds: entries.map(e => e.id),
        wordCount: summaryText.split(/\s+/).length
      });

      let analysis: WeeklySummaryAnalysis | undefined;
      
      if (includeAnalysis) {
        try {
          analysis = await this.generateWeeklySummaryAnalysis(summary);
        } catch (analysisError) {
          console.warn('Failed to generate weekly analysis, but summary was saved:', analysisError);
        }
      }

      return {
        success: true,
        summary,
        analysis
      };
    } catch (error) {
      console.error('Error generating weekly summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        summary: {} as WeeklySummary
      };
    }
  }

  /**
   * Generate the actual narrative text for a week
   */
  private async generateWeeklyNarrative(entries: Entry[], weekStart: Date, weekEnd: Date): Promise<string> {
    const sortedEntries = entries.sort((a, b) => 
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    );

    // Prepare the content for AI processing
    const entriesText = sortedEntries.map((entry, index) => {
      const dayName = dateUtils.formatDate(new Date(entry.targetDate));
      return `**${dayName}** (${entry.metadata.wordCount} words):\n${entry.plainText}\n`;
    }).join('\n---\n\n');

    const weekRange = `${dateUtils.formatDate(weekStart)} to ${dateUtils.formatDate(weekEnd)}`;
    
    const systemPrompt = `You are an AI assistant specialized in creating insightful weekly summaries from journal entries. Your task is to synthesize multiple daily journal entries into a cohesive, meaningful weekly narrative.

Your weekly summary should:
1. Capture the overarching themes and patterns of the week
2. Identify significant moments, achievements, or challenges
3. Note emotional progressions or changes throughout the week
4. Highlight personal growth, insights, or realizations
5. Connect related events or thoughts across different days
6. Maintain a reflective, personal tone that honors the original voice

Write in first person and create a flowing narrative that feels natural and insightful. Aim for 400-600 words.`;

    const userPrompt = `Please create a weekly summary for the week of ${weekRange}. Here are the daily journal entries:

${entriesText}

Create a cohesive weekly narrative that captures the essence of this week, identifying key themes, emotional arcs, and meaningful moments. Focus on the bigger picture while including specific details that matter.`;

    try {
      const summary = await llmService.analyzeText(userPrompt, systemPrompt);
      return summary.trim();
    } catch (error) {
      console.error('Error generating weekly narrative:', error);
      throw new Error('Failed to generate weekly narrative');
    }
  }

  /**
   * Generate AI analysis for a weekly summary
   */
  async generateWeeklySummaryAnalysis(summary: WeeklySummary): Promise<WeeklySummaryAnalysis> {
    try {
      // Generate sentiment analysis
      const sentiment = await this.analyzeWeeklySentiment(summary.summary);
      
      // Generate happiness metrics
      const happiness = await this.analyzeWeeklyHappiness(summary.summary);
      
      // Extract themes and emotional arc
      const themes = await this.extractWeeklyThemes(summary.summary);
      const emotionalArc = await this.analyzeEmotionalArc(summary.summary);
      const growthAreas = await this.identifyGrowthAreas(summary.summary);

      const analysis = await dbService.saveWeeklySummaryAnalysis({
        weeklySummaryId: summary.id,
        sentiment,
        happiness,
        weeklyThemes: themes,
        emotionalArc,
        growthAreas
      });

      return analysis;
    } catch (error) {
      console.error('Error generating weekly summary analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment of weekly summary
   */
  private async analyzeWeeklySentiment(summaryText: string): Promise<SentimentAnalysis> {
    const systemPrompt = `You are an expert in sentiment analysis. Analyze the sentiment of the provided weekly journal summary and respond with a JSON object containing:
- sentiment: one of "very-negative", "negative", "neutral", "positive", "very-positive"
- confidence: a number between 0 and 1
- explanation: a brief explanation of the sentiment analysis
- keywords: an array of 3-5 key emotional words from the text

Only respond with valid JSON.`;

    const userPrompt = `Analyze the sentiment of this weekly summary:\n\n${summaryText}`;

    try {
      const response = await llmService.analyzeText(userPrompt, systemPrompt);
      const parsed = JSON.parse(response);
      
      return {
        sentiment: parsed.sentiment as SentimentType,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
        explanation: parsed.explanation || 'Sentiment analysis completed',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
        analyzedAt: new Date()
      };
    } catch (error) {
      console.warn('Failed to parse sentiment analysis, using default:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        explanation: 'Unable to analyze sentiment',
        keywords: [],
        analyzedAt: new Date()
      };
    }
  }

  /**
   * Analyze happiness metrics for weekly summary
   */
  private async analyzeWeeklyHappiness(summaryText: string): Promise<HappinessMetrics> {
    const systemPrompt = `You are an expert in positive psychology and happiness metrics. Analyze the provided weekly journal summary and rate the following dimensions on a scale of 1-10:

1. lifeEvaluation: Overall life satisfaction and contentment
2. positiveAffect: Joy, gratitude, serenity, interest, hope, pride, amusement, inspiration, awe, love
3. negativeAffect: Worry, sadness, anger, stress, pain (1=very high stress, 10=very low stress)
4. socialSupport: Having someone to count on, social connections
5. personalGrowth: Learning, purpose, accomplishment, development

Respond with a JSON object containing these scores and an insights array with 2-3 key observations. Also include a confidence score (0-1).`;

    const userPrompt = `Analyze the happiness metrics for this weekly summary:\n\n${summaryText}`;

    try {
      const response = await llmService.analyzeText(userPrompt, systemPrompt);
      const parsed = JSON.parse(response);
      
      const lifeEvaluation = this.clampScore(parsed.lifeEvaluation);
      const positiveAffect = this.clampScore(parsed.positiveAffect);
      const negativeAffect = this.clampScore(parsed.negativeAffect);
      const socialSupport = this.clampScore(parsed.socialSupport);
      const personalGrowth = this.clampScore(parsed.personalGrowth);
      
      const overallScore = Number((
        (lifeEvaluation * 0.25) +
        (positiveAffect * 0.2) +
        (negativeAffect * 0.15) +
        (socialSupport * 0.2) +
        (personalGrowth * 0.2)
      ).toFixed(1));

      return {
        lifeEvaluation,
        positiveAffect,
        negativeAffect,
        socialSupport,
        personalGrowth,
        overallScore,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
        insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [],
        analyzedAt: new Date()
      };
    } catch (error) {
      console.warn('Failed to parse happiness analysis, using default:', error);
      return {
        lifeEvaluation: 5.0,
        positiveAffect: 5.0,
        negativeAffect: 5.0,
        socialSupport: 5.0,
        personalGrowth: 5.0,
        overallScore: 5.0,
        confidence: 0.3,
        insights: ['Unable to analyze happiness metrics'],
        analyzedAt: new Date()
      };
    }
  }

  /**
   * Extract key themes from weekly summary
   */
  private async extractWeeklyThemes(summaryText: string): Promise<string[]> {
    const systemPrompt = `Extract 3-5 key themes from this weekly journal summary. Themes should be concise phrases (1-3 words) that capture the main topics, activities, or focus areas of the week. Examples: "work stress", "family time", "personal growth", "health focus", "creative projects". Respond with a JSON array of theme strings.`;

    try {
      const response = await llmService.analyzeText(summaryText, systemPrompt);
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch (error) {
      console.warn('Failed to extract themes:', error);
      return [];
    }
  }

  /**
   * Analyze emotional arc of the week
   */
  private async analyzeEmotionalArc(summaryText: string): Promise<WeeklySummaryAnalysis['emotionalArc']> {
    const systemPrompt = `Analyze the emotional progression throughout this weekly summary. Respond with a JSON object containing:
- progression: one of "improving", "declining", "stable", "mixed"
- description: a brief description of the emotional journey
- keyMoments: an array of 1-3 significant emotional moments or turning points`;

    try {
      const response = await llmService.analyzeText(summaryText, systemPrompt);
      const parsed = JSON.parse(response);
      
      return {
        progression: ['improving', 'declining', 'stable', 'mixed'].includes(parsed.progression) 
          ? parsed.progression 
          : 'stable',
        description: parsed.description || 'Emotional progression throughout the week',
        keyMoments: Array.isArray(parsed.keyMoments) ? parsed.keyMoments.slice(0, 3) : []
      };
    } catch (error) {
      console.warn('Failed to analyze emotional arc:', error);
      return {
        progression: 'stable',
        description: 'Unable to analyze emotional progression',
        keyMoments: []
      };
    }
  }

  /**
   * Identify areas of personal growth
   */
  private async identifyGrowthAreas(summaryText: string): Promise<string[]> {
    const systemPrompt = `Identify 2-4 areas of personal growth, learning, or development mentioned in this weekly summary. These could be skills learned, insights gained, challenges overcome, or personal realizations. Respond with a JSON array of concise growth area descriptions.`;

    try {
      const response = await llmService.analyzeText(summaryText, systemPrompt);
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
    } catch (error) {
      console.warn('Failed to identify growth areas:', error);
      return [];
    }
  }

  /**
   * Batch generate weekly summaries for a date range
   */
  async batchGenerateWeeklySummaries(request: BatchWeeklySummaryRequest): Promise<BatchWeeklySummaryResult> {
    const { startDate, endDate, generateAnalysis = true, onProgress } = request;
    
    const weeksWithEntries = await dbService.getWeeksWithEntries(startDate, endDate);
    const eligibleWeeks = weeksWithEntries.filter(week => 
      week.entryCount >= this.defaultConfig.minEntriesForSummary
    );

    const results: WeeklySummary[] = [];
    const analyses: WeeklySummaryAnalysis[] = [];
    const errors: Array<{ week: Date; error: string }> = [];
    
    let completedWeeks = 0;
    const totalWeeks = eligibleWeeks.length;

    for (const week of eligibleWeeks) {
      try {
        onProgress?.({
          currentWeek: week.weekStart,
          completedWeeks,
          totalWeeks,
          progress: (completedWeeks / totalWeeks) * 100,
          message: `Processing week of ${dateUtils.formatDate(week.weekStart)}`,
          errors: errors.map(e => e.error)
        });

        const result = await this.generateWeeklySummary({
          weekStartDate: week.weekStart,
          weekEndDate: week.weekEnd,
          entries: week.entries,
          includeAnalysis: generateAnalysis
        });

        if (result.success) {
          results.push(result.summary);
          if (result.analysis) {
            analyses.push(result.analysis);
          }
        } else {
          errors.push({
            week: week.weekStart,
            error: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        errors.push({
          week: week.weekStart,
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
      
      completedWeeks++;
    }

    onProgress?.({
      currentWeek: new Date(),
      completedWeeks,
      totalWeeks,
      progress: 100,
      message: 'Batch processing complete',
      errors: errors.map(e => e.error)
    });

    return {
      summaries: results,
      analyses,
      errors,
      totalProcessed: completedWeeks,
      successCount: results.length,
      failureCount: errors.length
    };
  }

  /**
   * Get weekly summary statistics
   */
  async getWeeklySummaryStats(startDate?: Date, endDate?: Date): Promise<WeeklySummaryStats> {
    const summaries = startDate && endDate 
      ? await dbService.getWeeklySummariesByDateRange(startDate, endDate)
      : await dbService.getAllWeeklySummaries();
    
    const analyses = startDate && endDate
      ? await dbService.getWeeklySummaryAnalysesByDateRange(startDate, endDate)
      : await dbService.getAllWeeklySummaryAnalyses();

    if (summaries.length === 0) {
      return {
        totalWeeks: 0,
        averageWordCount: 0,
        averageHappiness: 0,
        sentimentDistribution: {
          'very-negative': 0,
          'negative': 0,
          'neutral': 0,
          'positive': 0,
          'very-positive': 0
        },
        commonThemes: [],
        growthTrends: [],
        emotionalProgressions: {
          improving: 0,
          declining: 0,
          stable: 0,
          mixed: 0
        }
      };
    }

    // Calculate statistics
    const totalWords = summaries.reduce((sum, s) => sum + s.wordCount, 0);
    const averageWordCount = Math.round(totalWords / summaries.length);
    
    const happinessScores = analyses.map(a => a.happiness.overallScore);
    const averageHappiness = happinessScores.length > 0 
      ? Number((happinessScores.reduce((sum, score) => sum + score, 0) / happinessScores.length).toFixed(1))
      : 0;

    // Sentiment distribution
    const sentimentCounts = {
      'very-negative': 0,
      'negative': 0,
      'neutral': 0,
      'positive': 0,
      'very-positive': 0
    };
    
    analyses.forEach(analysis => {
      sentimentCounts[analysis.sentiment.sentiment]++;
    });

    const sentimentDistribution = Object.fromEntries(
      Object.entries(sentimentCounts).map(([key, count]) => [
        key,
        analyses.length > 0 ? (count / analyses.length) * 100 : 0
      ])
    ) as WeeklySummaryStats['sentimentDistribution'];

    // Common themes
    const themeMap = new Map<string, number>();
    analyses.forEach(analysis => {
      analysis.weeklyThemes.forEach(theme => {
        themeMap.set(theme, (themeMap.get(theme) || 0) + 1);
      });
    });
    
    const commonThemes = Array.from(themeMap.entries())
      .map(([theme, frequency]) => ({ theme, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Growth trends
    const growthMap = new Map<string, number>();
    analyses.forEach(analysis => {
      analysis.growthAreas.forEach(area => {
        growthMap.set(area, (growthMap.get(area) || 0) + 1);
      });
    });
    
    const growthTrends = Array.from(growthMap.entries())
      .map(([area, frequency]) => ({ area, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Emotional progressions
    const progressionCounts = {
      improving: 0,
      declining: 0,
      stable: 0,
      mixed: 0
    };
    
    analyses.forEach(analysis => {
      progressionCounts[analysis.emotionalArc.progression]++;
    });

    return {
      totalWeeks: summaries.length,
      averageWordCount,
      averageHappiness,
      sentimentDistribution,
      commonThemes,
      growthTrends,
      emotionalProgressions: progressionCounts
    };
  }

  /**
   * Utility function to clamp scores between 1-10
   */
  private clampScore(value: any): number {
    const num = Number(value) || 5.0;
    return Math.max(1.0, Math.min(10.0, num));
  }

  /**
   * Get configuration
   */
  getConfig(): WeeklySummaryConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WeeklySummaryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

export const weeklySummaryService = new WeeklySummaryService();
export default weeklySummaryService;
