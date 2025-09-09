import { HappinessMetrics, SentimentAnalysis } from './ai.types';
import { Entry } from './index';

/**
 * Type definitions for Weekly Summary System
 */

// Weekly Summary Core Types
export interface WeeklySummary {
  id: string;
  weekStartDate: Date; // Monday of the week
  weekEndDate: Date; // Sunday of the week
  weekNumber: number; // Week number in year (1-53)
  year: number; // Year of the week
  summary: string; // Generated weekly narrative
  entryIds: string[]; // References to daily entries included
  wordCount: number; // Total words in the summary
  createdAt: Date;
  updatedAt: Date;
}

// Weekly Summary Analysis (same structure as daily analysis)
export interface WeeklySummaryAnalysis {
  id: string;
  weeklySummaryId: string;
  sentiment: SentimentAnalysis;
  happiness: HappinessMetrics;
  weeklyThemes: string[]; // Key themes identified across the week
  emotionalArc: {
    progression: 'improving' | 'declining' | 'stable' | 'mixed';
    description: string;
    keyMoments: string[];
  };
  growthAreas: string[]; // Areas of personal growth identified
  createdAt: Date;
  updatedAt: Date;
}

// Weekly Summary Generation Request
export interface WeeklySummaryRequest {
  weekStartDate: Date;
  weekEndDate: Date;
  entries: Entry[];
  includeAnalysis?: boolean; // Whether to also generate AI analysis
}

// Weekly Summary Generation Result
export interface WeeklySummaryResult {
  summary: WeeklySummary;
  analysis?: WeeklySummaryAnalysis;
  success: boolean;
  error?: string;
}

// Weekly Insights for Calendar Integration
export interface WeeklyInsights {
  weekStart: Date;
  weekEnd: Date;
  summary: WeeklySummary;
  analysis?: WeeklySummaryAnalysis;
  dailyEntries: Entry[];
  averageHappiness: number;
  dominantSentiment: SentimentAnalysis['sentiment'];
  keyHighlights: string[];
}

// Batch Weekly Summary Generation
export interface BatchWeeklySummaryRequest {
  startDate: Date;
  endDate: Date;
  generateAnalysis?: boolean;
  onProgress?: (progress: WeeklySummaryProgress) => void;
}

export interface WeeklySummaryProgress {
  currentWeek: Date;
  completedWeeks: number;
  totalWeeks: number;
  progress: number; // 0-100
  message: string;
  errors: string[];
}

export interface BatchWeeklySummaryResult {
  summaries: WeeklySummary[];
  analyses: WeeklySummaryAnalysis[];
  errors: Array<{ week: Date; error: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

// Weekly Summary Statistics
export interface WeeklySummaryStats {
  totalWeeks: number;
  averageWordCount: number;
  averageHappiness: number;
  sentimentDistribution: Record<SentimentAnalysis['sentiment'], number>;
  commonThemes: Array<{ theme: string; frequency: number }>;
  growthTrends: Array<{ area: string; frequency: number }>;
  emotionalProgressions: Record<WeeklySummaryAnalysis['emotionalArc']['progression'], number>;
}

// Utility Types
export interface WeekInfo {
  startDate: Date;
  endDate: Date;
  weekNumber: number;
  year: number;
  hasEntries: boolean;
  entryCount: number;
}

// Configuration
export interface WeeklySummaryConfig {
  minEntriesForSummary: number; // Minimum entries required to generate a summary
  maxSummaryLength: number; // Maximum words in generated summary
  includeEmotionalArc: boolean;
  includeThemes: boolean;
  autoGenerateAnalysis: boolean;
  retryAttempts: number;
}

// Export commonly used types
export type WeeklyProgressCallback = (progress: WeeklySummaryProgress) => void;
export type WeeklyGenerationOptions = {
  includeAnalysis?: boolean;
  config?: Partial<WeeklySummaryConfig>;
};
