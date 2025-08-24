import { dbService } from './database';
import { sentimentService } from './sentimentService';
import { metricsService } from './metricsService';
import { llmService } from './llmService';
import { weeklySummaryManager } from './weeklySummaryManager';
import { Entry } from '../types';
import { AIAnalysis } from '../types/ai.types';
import { BatchAnalysisProgress, BatchAnalysisResult } from '../types/dashboard.types';
import { dateUtils } from '../lib/utils';

/**
 * Service for batch processing AI analysis across multiple journal entries
 * Handles progress tracking, error recovery, and efficient processing
 */
class BatchAnalysisService {
  private currentBatch: BatchAnalysisProgress | null = null;
  private progressCallback: ((progress: BatchAnalysisProgress) => void) | null = null;
  private shouldStop = false;

  /**
   * Set callback for batch analysis progress updates
   */
  setProgressCallback(callback: (progress: BatchAnalysisProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Stop current batch analysis
   */
  stopBatchAnalysis(): void {
    this.shouldStop = true;
  }

  /**
   * Check if batch analysis is currently running
   */
  isRunning(): boolean {
    return this.currentBatch?.isRunning ?? false;
  }

  /**
   * Get current batch analysis progress
   */
  getCurrentProgress(): BatchAnalysisProgress | null {
    return this.currentBatch ? { ...this.currentBatch } : null;
  }

  /**
   * Find entries that haven't been analyzed yet
   */
  async findUnanalyzedEntries(): Promise<Entry[]> {
    try {
      const allEntries = await dbService.getAllEntries();
      const unanalyzedEntries: Entry[] = [];

      for (const entry of allEntries) {
        const existingAnalysis = await dbService.getAIAnalysisForEntry(entry.id);
        if (!existingAnalysis) {
          unanalyzedEntries.push(entry);
        }
      }

      return unanalyzedEntries;
    } catch (error) {
      console.error('Error finding unanalyzed entries:', error);
      return [];
    }
  }

  /**
   * Find weeks eligible for summary generation
   */
  async findEligibleWeeksForSummaries(): Promise<Array<{
    weekStart: Date;
    weekEnd: Date;
    entryCount: number;
  }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // Look back 6 months
      
      const eligibleWeeks = await weeklySummaryManager.getEligibleWeeks(startDate, endDate);
      return eligibleWeeks.filter(week => !week.hasSummary); // Only weeks without summaries
    } catch (error) {
      console.error('Error finding eligible weeks:', error);
      return [];
    }
  }

  /**
   * Create empty result when there's nothing to process
   */
  private createEmptyResult(startTime: Date): BatchAnalysisResult {
    return {
      success: true,
      dailyAnalysis: {
        processedCount: 0,
        totalCount: 0,
        errors: []
      },
      weeklySummaries: {
        generatedCount: 0,
        totalEligibleWeeks: 0,
        analyzedCount: 0,
        errors: []
      },
      startTime,
      endTime: new Date(),
      // Legacy compatibility
      processedCount: 0,
      totalCount: 0,
      errors: []
    };
  }

  /**
   * Process Phase 1: Daily entry analysis
   */
  private async processPhase1DailyAnalysis(
    unanalyzedEntries: Entry[],
    errors: Array<{ entryId: string; error: string; entryTitle: string }>
  ): Promise<number> {
    let processedCount = 0;
    
    if (!this.currentBatch) return 0;
    
    this.currentBatch.currentPhase = 'daily-analysis';
    this.currentBatch.currentPhaseDescription = 'Analyzing daily journal entries...';
    this.updateProgress();

    const batchSize = 2;
    const delayBetweenBatches = 1000;

    for (let i = 0; i < unanalyzedEntries.length; i += batchSize) {
      if (this.shouldStop) break;

      const batch = unanalyzedEntries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (entry) => {
        if (this.shouldStop) return;

        try {
          const entryDate = dateUtils.formatDate(entry.targetDate);
          this.currentBatch!.current = entryDate;
          this.currentBatch!.dailyAnalysis.current = entryDate;
          this.currentBatch!.currentEntryId = entry.id;
          this.updateProgress();

          const [sentiment, happiness] = await Promise.all([
            sentimentService.analyzeSentiment(entry),
            metricsService.calculateEntryMetrics(entry)
          ]);

          if (sentiment && happiness) {
            await dbService.saveAIAnalysis({
              entryId: entry.id,
              sentiment,
              happiness
            });
            processedCount++;
          } else {
            const errorMsg = 'Analysis failed - no results returned';
            errors.push({
              entryId: entry.id,
              error: errorMsg,
              entryTitle: entryDate
            });
            this.currentBatch!.dailyAnalysis.errors.push(`${entryDate}: ${errorMsg}`);
            this.currentBatch!.errors.push(`${entryDate}: ${errorMsg}`);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const entryDate = dateUtils.formatDate(entry.targetDate);
          errors.push({
            entryId: entry.id,
            error: errorMessage,
            entryTitle: entryDate
          });
          this.currentBatch!.dailyAnalysis.errors.push(`${entryDate}: ${errorMessage}`);
          this.currentBatch!.errors.push(`${entryDate}: ${errorMessage}`);
        } finally {
          this.currentBatch!.dailyAnalysis.completed++;
          this.currentBatch!.completed++;
          this.updateProgress();
        }
      });

      await Promise.all(batchPromises);

      if (i + batchSize < unanalyzedEntries.length && !this.shouldStop) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return processedCount;
  }

  /**
   * Process Phase 2 & 3: Weekly summary generation and analysis
   */
  private async processPhase2and3WeeklySummaries(
    eligibleWeeks: Array<{ weekStart: Date; weekEnd: Date; entryCount: number }>,
    errors: Array<{ weekStart: Date; weekEnd: Date; error: string }>
  ): Promise<{ generated: number; analyzed: number }> {
    let generatedCount = 0;
    let analyzedCount = 0;
    
    if (!this.currentBatch) return { generated: 0, analyzed: 0 };

    // Phase 2: Generate weekly summaries
    this.currentBatch.currentPhase = 'weekly-summaries';
    this.currentBatch.currentPhaseDescription = 'Generating weekly summaries...';
    this.updateProgress();

    for (const week of eligibleWeeks) {
      if (this.shouldStop) break;

      try {
        const weekRange = `${dateUtils.formatDate(week.weekStart)} - ${dateUtils.formatDate(week.weekEnd)}`;
        this.currentBatch.current = weekRange;
        this.currentBatch.weeklySummaries.current = weekRange;
        this.updateProgress();

        const result = await weeklySummaryManager.generateWeekSummary(week.weekStart);
        
        if (result) {
          generatedCount++;
          if (result.analysis) {
            analyzedCount++;
          }
        } else {
          const errorMsg = 'Failed to generate weekly summary';
          errors.push({
            weekStart: week.weekStart,
            weekEnd: week.weekEnd,
            error: errorMsg
          });
          this.currentBatch.weeklySummaries.errors.push(`${weekRange}: ${errorMsg}`);
          this.currentBatch.errors.push(`${weekRange}: ${errorMsg}`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const weekRange = `${dateUtils.formatDate(week.weekStart)} - ${dateUtils.formatDate(week.weekEnd)}`;
        errors.push({
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          error: errorMessage
        });
        this.currentBatch.weeklySummaries.errors.push(`${weekRange}: ${errorMessage}`);
        this.currentBatch.errors.push(`${weekRange}: ${errorMessage}`);
      } finally {
        this.currentBatch.weeklySummaries.completed++;
        this.currentBatch.completed++;
        this.updateProgress();
      }

      // Brief pause between summary generations
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return { generated: generatedCount, analyzed: analyzedCount };
  }

  /**
   * Analyze all unanalyzed entries and generate weekly summaries
   */
  async analyzeAllEntries(): Promise<BatchAnalysisResult> {
    const startTime = new Date();
    let dailyProcessedCount = 0;
    let weeklyGeneratedCount = 0;
    let weeklyAnalyzedCount = 0;
    const dailyErrors: Array<{ entryId: string; error: string; entryTitle: string }> = [];
    const weeklyErrors: Array<{ weekStart: Date; weekEnd: Date; error: string }> = [];

    try {
      // Check if AI model is ready
      if (!llmService.isModelReady()) {
        throw new Error('AI model not loaded. Please load the model first.');
      }

      // Find unanalyzed entries and eligible weeks
      const unanalyzedEntries = await this.findUnanalyzedEntries();
      const eligibleWeeks = await this.findEligibleWeeksForSummaries();
      
      // Calculate total phases and items
      const totalPhases = eligibleWeeks.length > 0 ? 3 : 1;
      const totalItems = unanalyzedEntries.length + eligibleWeeks.length * 2; // entries + summaries + analyses
      
      if (unanalyzedEntries.length === 0 && eligibleWeeks.length === 0) {
        return this.createEmptyResult(startTime);
      }

      // Initialize progress tracking
      this.shouldStop = false;
      this.currentBatch = {
        currentPhase: 'daily-analysis',
        totalPhases,
        currentPhaseDescription: 'Analyzing daily journal entries...',
        dailyAnalysis: {
          total: unanalyzedEntries.length,
          completed: 0,
          current: '',
          errors: []
        },
        weeklySummaries: {
          total: eligibleWeeks.length,
          completed: 0,
          current: '',
          errors: []
        },
        total: totalItems,
        completed: 0,
        current: '',
        errors: [],
        isRunning: true
      };

      this.updateProgress();

      // Phase 1: Analyze daily entries
      if (unanalyzedEntries.length > 0) {
        dailyProcessedCount = await this.processPhase1DailyAnalysis(unanalyzedEntries, dailyErrors);
      }

      // Phase 2 & 3: Generate and analyze weekly summaries
      if (eligibleWeeks.length > 0 && !this.shouldStop) {
        const weeklyResults = await this.processPhase2and3WeeklySummaries(eligibleWeeks, weeklyErrors);
        weeklyGeneratedCount = weeklyResults.generated;
        weeklyAnalyzedCount = weeklyResults.analyzed;
      }

      // Complete the process
      const endTime = new Date();
      if (this.currentBatch) {
        this.currentBatch.currentPhase = 'complete';
        this.currentBatch.currentPhaseDescription = 'Analysis complete!';
        this.currentBatch.isRunning = false;
        this.updateProgress();
      }

      const result: BatchAnalysisResult = {
        success: !this.shouldStop,
        dailyAnalysis: {
          processedCount: dailyProcessedCount,
          totalCount: unanalyzedEntries.length,
          errors: dailyErrors
        },
        weeklySummaries: {
          generatedCount: weeklyGeneratedCount,
          totalEligibleWeeks: eligibleWeeks.length,
          analyzedCount: weeklyAnalyzedCount,
          errors: weeklyErrors
        },
        startTime,
        endTime,
        // Legacy compatibility
        processedCount: dailyProcessedCount,
        totalCount: unanalyzedEntries.length,
        errors: dailyErrors
      };

      return result;

    } catch (error) {
      console.error('Enhanced batch analysis failed:', error);
      
      if (this.currentBatch) {
        this.currentBatch.isRunning = false;
        this.currentBatch.errors.push(
          error instanceof Error ? error.message : 'Enhanced batch analysis failed'
        );
        this.updateProgress();
      }

      throw error;
    } finally {
      this.currentBatch = null;
      this.shouldStop = false;
    }
  }

  /**
   * Re-analyze specific entries (for updating existing analyses)
   */
  async reanalyzeEntries(entryIds: string[]): Promise<BatchAnalysisResult> {
    const startTime = new Date();
    const errors: Array<{ entryId: string; error: string; entryTitle: string }> = [];
    let processedCount = 0;

    try {
      if (!llmService.isModelReady()) {
        throw new Error('AI model not loaded. Please load the model first.');
      }

      // Get entries to re-analyze
      const entries: Entry[] = [];
      for (const entryId of entryIds) {
        const entry = await dbService.getEntry(entryId);
        if (entry) {
          entries.push(entry);
        }
      }

      if (entries.length === 0) {
      return {
        success: true,
        dailyAnalysis: {
          processedCount: 0,
          totalCount: 0,
          errors: []
        },
        weeklySummaries: {
          generatedCount: 0,
          totalEligibleWeeks: 0,
          analyzedCount: 0,
          errors: []
        },
        startTime,
        endTime: new Date(),
        // Legacy compatibility
        processedCount: 0,
        totalCount: 0,
        errors: []
      };
      }

      // Initialize progress tracking
      this.shouldStop = false;
      this.currentBatch = {
        currentPhase: 'daily-analysis',
        totalPhases: 1,
        currentPhaseDescription: 'Re-analyzing journal entries...',
        dailyAnalysis: {
          total: entries.length,
          completed: 0,
          current: '',
          errors: []
        },
        weeklySummaries: {
          total: 0,
          completed: 0,
          current: '',
          errors: []
        },
        total: entries.length,
        completed: 0,
        current: '',
        errors: [],
        isRunning: true
      };

      this.updateProgress();

      // Process entries one by one for re-analysis
      for (const entry of entries) {
        if (this.shouldStop) break;

        try {
          const entryDate = dateUtils.formatDate(entry.targetDate);
          this.currentBatch!.current = entryDate;
          this.currentBatch!.dailyAnalysis.current = entryDate;
          this.currentBatch!.currentEntryId = entry.id;
          this.updateProgress();

          // Delete existing analysis first
          await dbService.deleteAIAnalysisForEntry(entry.id);

          // Run new analysis
          const [sentiment, happiness] = await Promise.all([
            sentimentService.analyzeSentiment(entry),
            metricsService.calculateEntryMetrics(entry)
          ]);

          if (sentiment && happiness) {
            await dbService.saveAIAnalysis({
              entryId: entry.id,
              sentiment,
              happiness
            });
            processedCount++;
          } else {
            const errorMsg = 'Re-analysis failed - no results returned';
            errors.push({
              entryId: entry.id,
              error: errorMsg,
              entryTitle: entryDate
            });
            this.currentBatch!.dailyAnalysis.errors.push(`${entryDate}: ${errorMsg}`);
            this.currentBatch!.errors.push(`${entryDate}: ${errorMsg}`);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const entryDate = dateUtils.formatDate(entry.targetDate);
          errors.push({
            entryId: entry.id,
            error: errorMessage,
            entryTitle: entryDate
          });
          this.currentBatch!.dailyAnalysis.errors.push(`${entryDate}: ${errorMessage}`);
          this.currentBatch!.errors.push(`${entryDate}: ${errorMessage}`);
        } finally {
          this.currentBatch!.dailyAnalysis.completed++;
          this.currentBatch!.completed++;
          this.updateProgress();
        }

        // Brief pause between re-analyses
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const endTime = new Date();
      this.currentBatch!.isRunning = false;
      this.updateProgress();

      return {
        success: !this.shouldStop,
        dailyAnalysis: {
          processedCount,
          totalCount: entries.length,
          errors
        },
        weeklySummaries: {
          generatedCount: 0,
          totalEligibleWeeks: 0,
          analyzedCount: 0,
          errors: []
        },
        startTime,
        endTime,
        // Legacy compatibility
        processedCount,
        totalCount: entries.length,
        errors
      };

    } catch (error) {
      console.error('Re-analysis failed:', error);
      throw error;
    } finally {
      this.currentBatch = null;
      this.shouldStop = false;
    }
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(): void {
    if (this.currentBatch && this.progressCallback) {
      this.progressCallback({ ...this.currentBatch });
    }
  }

  /**
   * Get analysis statistics including weekly summaries
   */
  async getAnalysisStatistics(): Promise<{
    totalEntries: number;
    analyzedEntries: number;
    unanalyzedEntries: number;
    analysisRate: number;
    weeklySummaries: {
      totalEligibleWeeks: number;
      generatedSummaries: number;
      pendingSummaries: number;
      summaryRate: number;
    };
  }> {
    try {
      const allEntries = await dbService.getAllEntries();
      const totalEntries = allEntries.length;
      let analyzedCount = 0;

      for (const entry of allEntries) {
        const analysis = await dbService.getAIAnalysisForEntry(entry.id);
        if (analysis) {
          analyzedCount++;
        }
      }

      const unanalyzedCount = totalEntries - analyzedCount;
      const analysisRate = totalEntries > 0 ? (analyzedCount / totalEntries) * 100 : 0;

      // Get weekly summary statistics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // Look back 6 months
      
      const eligibleWeeks = await weeklySummaryManager.getEligibleWeeks(startDate, endDate);
      const totalEligibleWeeks = eligibleWeeks.length;
      const generatedSummaries = eligibleWeeks.filter(week => week.hasSummary).length;
      const pendingSummaries = totalEligibleWeeks - generatedSummaries;
      const summaryRate = totalEligibleWeeks > 0 ? (generatedSummaries / totalEligibleWeeks) * 100 : 0;

      return {
        totalEntries,
        analyzedEntries: analyzedCount,
        unanalyzedEntries: unanalyzedCount,
        analysisRate,
        weeklySummaries: {
          totalEligibleWeeks,
          generatedSummaries,
          pendingSummaries,
          summaryRate
        }
      };
    } catch (error) {
      console.error('Error getting analysis statistics:', error);
      return {
        totalEntries: 0,
        analyzedEntries: 0,
        unanalyzedEntries: 0,
        analysisRate: 0,
        weeklySummaries: {
          totalEligibleWeeks: 0,
          generatedSummaries: 0,
          pendingSummaries: 0,
          summaryRate: 0
        }
      };
    }
  }
}

// Export singleton instance
export const batchAnalysisService = new BatchAnalysisService();
export default batchAnalysisService;
