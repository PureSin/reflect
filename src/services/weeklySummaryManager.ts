import { weeklySummaryService } from '../services/weeklySummaryService';
import { dbService } from '../services/database';
import { WeeklySummary, WeeklySummaryAnalysis, WeeklyInsights } from '../types/weekly.types';
import { Entry } from '../types';
import { dateUtils } from '../lib/utils';

/**
 * Service for managing weekly summary operations and batch processing
 */
class WeeklySummaryManager {
  /**
   * Generate weekly summary for a specific week
   */
  async generateWeekSummary(date: Date): Promise<{ summary: WeeklySummary; analysis?: WeeklySummaryAnalysis } | null> {
    try {
      const { weekStartDate, weekEndDate } = dbService.getWeekBounds(date);
      const entries = await dbService.getEntriesByDateRange(weekStartDate, weekEndDate);
      
      if (entries.length < 2) {
        console.log(`Insufficient entries for week of ${dateUtils.formatDate(weekStartDate)} (${entries.length} entries)`);
        return null;
      }

      const result = await weeklySummaryService.generateWeeklySummary({
        weekStartDate,
        weekEndDate,
        entries,
        includeAnalysis: true
      });

      if (result.success) {
        return {
          summary: result.summary,
          analysis: result.analysis
        };
      } else {
        console.error('Failed to generate weekly summary:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error in generateWeekSummary:', error);
      return null;
    }
  }

  /**
   * Get or generate weekly summary for a specific week
   */
  async getOrCreateWeeklySummary(date: Date): Promise<{ summary: WeeklySummary; analysis?: WeeklySummaryAnalysis } | null> {
    try {
      const { weekStartDate, weekEndDate } = dbService.getWeekBounds(date);
      
      // Check if summary already exists
      const existingSummary = await dbService.getWeeklySummaryByWeek(weekStartDate, weekEndDate);
      if (existingSummary) {
        const analysis = await dbService.getWeeklySummaryAnalysisForSummary(existingSummary.id);
        return { summary: existingSummary, analysis };
      }

      // Generate new summary
      return await this.generateWeekSummary(date);
    } catch (error) {
      console.error('Error in getOrCreateWeeklySummary:', error);
      return null;
    }
  }

  /**
   * Get weekly insights for calendar or dashboard display
   */
  async getWeeklyInsights(date: Date): Promise<WeeklyInsights | null> {
    try {
      const { weekStartDate, weekEndDate } = dbService.getWeekBounds(date);
      const entries = await dbService.getEntriesByDateRange(weekStartDate, weekEndDate);
      
      const summaryData = await this.getOrCreateWeeklySummary(date);
      if (!summaryData) {
        return null;
      }

      const { summary, analysis } = summaryData;
      
      // Calculate additional insights
      const averageHappiness = analysis?.happiness.overallScore || 0;
      const dominantSentiment = analysis?.sentiment.sentiment || 'neutral';
      
      const keyHighlights = analysis ? [
        ...analysis.weeklyThemes.slice(0, 2),
        ...analysis.growthAreas.slice(0, 2)
      ] : [];

      return {
        weekStart: weekStartDate,
        weekEnd: weekEndDate,
        summary,
        analysis,
        dailyEntries: entries,
        averageHappiness,
        dominantSentiment,
        keyHighlights
      };
    } catch (error) {
      console.error('Error getting weekly insights:', error);
      return null;
    }
  }

  /**
   * Batch generate summaries for multiple weeks
   */
  async batchGenerateSummaries(
    startDate: Date, 
    endDate: Date, 
    onProgress?: (completed: number, total: number, currentWeek: string) => void
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const result = await weeklySummaryService.batchGenerateWeeklySummaries({
        startDate,
        endDate,
        generateAnalysis: true,
        onProgress: (progress) => {
          onProgress?.(
            progress.completedWeeks,
            progress.totalWeeks,
            dateUtils.formatDate(progress.currentWeek)
          );
        }
      });

      return {
        success: result.successCount,
        failed: result.failureCount,
        errors: result.errors.map(e => e.error)
      };
    } catch (error) {
      console.error('Error in batch generation:', error);
      return {
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get all weeks that have enough entries for summary generation
   */
  async getEligibleWeeks(startDate: Date, endDate: Date): Promise<Array<{
    weekStart: Date;
    weekEnd: Date;
    entryCount: number;
    hasSummary: boolean;
  }>> {
    try {
      const weeksWithEntries = await dbService.getWeeksWithEntries(startDate, endDate);
      const eligibleWeeks = weeksWithEntries.filter(week => week.entryCount >= 2);
      
      const results = [];
      for (const week of eligibleWeeks) {
        const existingSummary = await dbService.getWeeklySummaryByWeek(week.weekStart, week.weekEnd);
        results.push({
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          entryCount: week.entryCount,
          hasSummary: !!existingSummary
        });
      }

      return results;
    } catch (error) {
      console.error('Error getting eligible weeks:', error);
      return [];
    }
  }

  /**
   * Get weekly summary statistics for dashboard
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    try {
      return await weeklySummaryService.getWeeklySummaryStats(startDate, endDate);
    } catch (error) {
      console.error('Error getting weekly statistics:', error);
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
  }

  /**
   * Delete weekly summary and its analysis
   */
  async deleteWeeklySummary(summaryId: string): Promise<boolean> {
    try {
      await dbService.deleteWeeklySummary(summaryId);
      return true;
    } catch (error) {
      console.error('Error deleting weekly summary:', error);
      return false;
    }
  }

  /**
   * Update weekly summary text
   */
  async updateWeeklySummary(summaryId: string, newSummaryText: string): Promise<boolean> {
    try {
      const wordCount = newSummaryText.split(/\s+/).length;
      await dbService.updateWeeklySummary(summaryId, {
        summary: newSummaryText,
        wordCount
      });
      return true;
    } catch (error) {
      console.error('Error updating weekly summary:', error);
      return false;
    }
  }

  /**
   * Regenerate analysis for an existing weekly summary
   */
  async regenerateAnalysis(summaryId: string): Promise<WeeklySummaryAnalysis | null> {
    try {
      const summary = await dbService.getWeeklySummary(summaryId);
      if (!summary) {
        console.error('Weekly summary not found:', summaryId);
        return null;
      }

      const analysis = await weeklySummaryService.generateWeeklySummaryAnalysis(summary);
      return analysis;
    } catch (error) {
      console.error('Error regenerating analysis:', error);
      return null;
    }
  }
}

export const weeklySummaryManager = new WeeklySummaryManager();
export default weeklySummaryManager;
