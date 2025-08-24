import { HappinessMetrics, SentimentAnalysis } from './ai.types';
import { Entry } from './index';

/**
 * Types for the Happiness Metrics Dashboard and Batch Analysis
 */

// Batch Analysis Types
export interface BatchAnalysisProgress {
  // Phase tracking
  currentPhase: 'daily-analysis' | 'weekly-summaries' | 'weekly-analysis' | 'complete';
  totalPhases: number;
  currentPhaseDescription: string;
  
  // Daily analysis progress
  dailyAnalysis: {
    total: number;
    completed: number;
    current: string; // current entry title/date
    errors: string[];
  };
  
  // Weekly summary generation progress
  weeklySummaries: {
    total: number;
    completed: number;
    current: string; // current week range
    errors: string[];
  };
  
  // Overall progress
  total: number;
  completed: number;
  current: string; // current item being processed
  errors: string[]; // all errors combined
  isRunning: boolean;
  currentEntryId?: string;
}

export interface BatchAnalysisResult {
  success: boolean;
  
  // Daily analysis results
  dailyAnalysis: {
    processedCount: number;
    totalCount: number;
    errors: Array<{
      entryId: string;
      error: string;
      entryTitle: string;
    }>;
  };
  
  // Weekly summary results
  weeklySummaries: {
    generatedCount: number;
    totalEligibleWeeks: number;
    analyzedCount: number;
    errors: Array<{
      weekStart: Date;
      weekEnd: Date;
      error: string;
    }>;
  };
  
  startTime: Date;
  endTime: Date;
  
  // Legacy compatibility
  processedCount: number;
  totalCount: number;
  errors: Array<{
    entryId: string;
    error: string;
    entryTitle: string;
  }>;
}

// Dashboard Data Types
export interface DashboardData {
  timeRange: TimeRange;
  overallMetrics: OverallMetrics;
  emotionalBalance: EmotionalBalanceData;
  socialConnection: SocialConnectionData;
  achievement: AchievementData;
  gratitude: GratitudeData;
  selfCare: SelfCareData;
}

export interface TimeRange {
  start: Date;
  end: Date;
  period: 'week' | 'month' | 'quarter' | 'half-year' | 'year' | 'custom';
}

export interface OverallMetrics {
  averageHappiness: number;
  totalEntries: number;
  analyzedEntries: number;
  streakDays: number;
  improvementTrend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
}

// 5-Dimension Happiness Metrics
export interface EmotionalBalanceData {
  timeline: Array<{
    date: Date;
    positive: number;
    negative: number;
    neutral: number;
    overallSentiment: number;
  }>;
  averageSentiment: number;
  sentimentDistribution: {
    'very-positive': number;
    'positive': number;
    'neutral': number;
    'negative': number;
    'very-negative': number;
  };
  moodKeywords: Array<{ word: string; frequency: number; sentiment: string }>;
}

export interface SocialConnectionData {
  timeline: Array<{
    date: Date;
    socialScore: number;
    relationshipMentions: number;
  }>;
  averageScore: number;
  relationshipTypes: {
    family: number;
    friends: number;
    romantic: number;
    colleagues: number;
    community: number;
  };
  socialActivities: Array<{ activity: string; frequency: number }>;
}

export interface AchievementData {
  timeline: Array<{
    date: Date;
    achievementScore: number;
    goalMentions: number;
  }>;
  averageScore: number;
  achievementTypes: {
    career: number;
    personal: number;
    health: number;
    learning: number;
    creative: number;
  };
  progressIndicators: Array<{ goal: string; progress: number; mentions: number }>;
}

export interface GratitudeData {
  timeline: Array<{
    date: Date;
    gratitudeScore: number;
    gratitudeMentions: number;
  }>;
  averageScore: number;
  gratitudeCategories: {
    relationships: number;
    health: number;
    opportunities: number;
    experiences: number;
    possessions: number;
  };
  gratitudeWords: Array<{ word: string; frequency: number }>;
  heatmapData: Array<{ date: string; value: number }>;
}

export interface SelfCareData {
  timeline: Array<{
    date: Date;
    selfCareScore: number;
    wellnessMentions: number;
  }>;
  averageScore: number;
  selfCareActivities: {
    exercise: number;
    meditation: number;
    sleep: number;
    nutrition: number;
    hobbies: number;
    relaxation: number;
  };
  wellnessIndicators: Array<{ activity: string; frequency: number }>;
}

// Chart Data Types
export interface ChartDataPoint {
  date: Date;
  value: number;
  label?: string;
  color?: string;
}

export interface TimeSeriesData {
  datasets: Array<{
    label: string;
    data: ChartDataPoint[];
    color: string;
    type: 'line' | 'bar' | 'area';
  }>;
  xAxisLabel: string;
  yAxisLabel: string;
}

export interface PieChartData {
  datasets: Array<{
    data: Array<{
      label: string;
      value: number;
      color: string;
    }>;
  }>;
}

export interface HeatmapData {
  data: Array<{
    date: string; // YYYY-MM-DD
    value: number;
    level: 0 | 1 | 2 | 3 | 4; // intensity level
  }>;
  startDate: Date;
  endDate: Date;
}

// Dashboard Configuration
export interface DashboardConfig {
  refreshInterval: number; // in minutes
  defaultTimeRange: TimeRange['period'];
  enabledMetrics: {
    emotionalBalance: boolean;
    socialConnection: boolean;
    achievement: boolean;
    gratitude: boolean;
    selfCare: boolean;
  };
  chartSettings: {
    animationDuration: number;
    showDataPoints: boolean;
    smoothLines: boolean;
  };
}

// Analytics Insights
export interface DashboardInsight {
  id: string;
  type: 'trend' | 'pattern' | 'achievement' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric: keyof Omit<DashboardData, 'timeRange'>;
  dataPoint?: {
    value: number;
    change: number;
    period: string;
  };
  actionable: boolean;
  suggestion?: string;
}

// Export Types
export interface DashboardExportData {
  generatedAt: Date;
  timeRange: TimeRange;
  summary: OverallMetrics;
  insights: DashboardInsight[];
  chartData: {
    emotionalBalance: TimeSeriesData;
    socialConnection: TimeSeriesData;
    achievement: TimeSeriesData;
    gratitude: TimeSeriesData & { heatmap: HeatmapData };
    selfCare: TimeSeriesData;
  };
  rawMetrics: Array<{
    entryId: string;
    date: Date;
    happiness: HappinessMetrics;
    sentiment: SentimentAnalysis;
  }>;
}
