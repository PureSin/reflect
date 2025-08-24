/**
 * Type definitions for AI-powered features in the Reflect journaling app
 * Supporting on-device WebLLM processing with privacy-first approach
 */

// WebLLM Model Configuration
export interface ModelConfig {
  model: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
}

// Loading States for WebLLM Model
export interface LoadingState {
  isLoading: boolean;
  progress: number; // 0-100
  stage: 'idle' | 'checking-support' | 'initializing' | 'downloading' | 'loading' | 'compiling' | 'ready' | 'error';
  error: string | null;
}

// Chat Completion Types (compatible with WebLLM)
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletion {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// Sentiment Analysis Types
export type SentimentType = 'very-negative' | 'negative' | 'neutral' | 'positive' | 'very-positive';

export interface SentimentAnalysis {
  sentiment: SentimentType;
  confidence: number; // 0-1
  explanation: string;
  keywords: string[];
  analyzedAt: Date;
}

// Happiness Metrics (5-dimensional analysis)
export interface HappinessMetrics {
  // Core happiness dimensions
  lifeEvaluation: number; // 1-10: Overall life satisfaction
  positiveAffect: number; // 1-10: Joy, gratitude, serenity, interest, hope, pride, amusement, inspiration, awe, love
  negativeAffect: number; // 1-10: Worry, sadness, anger, stress, pain (inverted scale)
  socialSupport: number; // 1-10: Having someone to count on
  personalGrowth: number; // 1-10: Learning, purpose, accomplishment
  
  // Metadata
  overallScore: number; // 1-10: Weighted average of dimensions
  analyzedAt: Date;
  confidence: number; // 0-1: Model confidence in analysis
  insights: string[]; // Key insights from the analysis
}

// AI Analysis Results for Journal Entries
export interface AIAnalysis {
  id: string;
  entryId: string;
  sentiment: SentimentAnalysis;
  happiness: HappinessMetrics;
  createdAt: Date;
  updatedAt: Date;
}

// Analysis Request Types
export interface AnalysisRequest {
  entryId: string;
  content: string;
  title?: string;
  tags?: string[];
  previousAnalyses?: AIAnalysis[]; // For context-aware analysis
}

// WebGPU Support Detection
export interface WebGPUCapabilities {
  supported: boolean;
  adapter?: GPUAdapter;
  features?: string[];
  limits?: Record<string, number>;
  error?: string;
}

// Progress Tracking for Long Operations
export interface ProgressUpdate {
  step: string;
  progress: number; // 0-100
  message?: string;
  eta?: number; // Estimated time remaining in seconds
}

// Error Types for AI Operations
export interface AIError {
  code: 'WEBGPU_NOT_SUPPORTED' | 'MODEL_LOAD_FAILED' | 'ANALYSIS_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: any;
  timestamp: Date;
}

// Configuration for different analysis types
export interface AnalysisConfig {
  sentiment: {
    enabled: boolean;
    includeKeywords: boolean;
    confidenceThreshold: number;
  };
  happiness: {
    enabled: boolean;
    includeDimensionDetails: boolean;
    confidenceThreshold: number;
  };
  batchSize: number;
  retryAttempts: number;
}

// Batch Analysis for Multiple Entries
export interface BatchAnalysisRequest {
  entries: AnalysisRequest[];
  config: AnalysisConfig;
  onProgress?: (update: ProgressUpdate) => void;
}

export interface BatchAnalysisResult {
  results: AIAnalysis[];
  errors: { entryId: string; error: AIError }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    avgSentiment: number;
    avgHappiness: number;
  };
}

// Historical Analysis for Trends
export interface TrendAnalysis {
  period: 'week' | 'month' | 'quarter' | 'year';
  sentimentTrend: {
    dataPoints: { date: Date; value: number }[];
    trend: 'improving' | 'declining' | 'stable';
    changeRate: number;
  };
  happinessTrend: {
    overall: { date: Date; value: number }[];
    dimensions: Record<keyof Omit<HappinessMetrics, 'overallScore' | 'analyzedAt' | 'confidence' | 'insights'>, { date: Date; value: number }[]>;
    trend: 'improving' | 'declining' | 'stable';
    changeRate: number;
  };
  insights: string[];
  generatedAt: Date;
}

// Model Performance Metrics
export interface ModelPerformance {
  modelId: string;
  version: string;
  avgResponseTime: number; // milliseconds
  successRate: number; // 0-1
  avgConfidence: number; // 0-1
  totalAnalyses: number;
  lastUpdated: Date;
}

// Export utility types
export type SentimentScore = SentimentAnalysis['sentiment'];
export type HappinessScore = HappinessMetrics['overallScore'];
export type AnalysisStage = LoadingState['stage'];

// Constants
export const SENTIMENT_LABELS: Record<SentimentType, string> = {
  'very-negative': 'Very Negative',
  'negative': 'Negative',
  'neutral': 'Neutral',
  'positive': 'Positive',
  'very-positive': 'Very Positive'
};

export const SENTIMENT_COLORS: Record<SentimentType, string> = {
  'very-negative': '#ef4444', // red-500
  'negative': '#f97316', // orange-500
  'neutral': '#6b7280', // gray-500
  'positive': '#22c55e', // green-500
  'very-positive': '#10b981' // emerald-500
};

export const HAPPINESS_DIMENSION_LABELS = {
  lifeEvaluation: 'Life Satisfaction',
  positiveAffect: 'Positive Emotions',
  negativeAffect: 'Stress & Worry',
  socialSupport: 'Social Connection',
  personalGrowth: 'Growth & Purpose'
} as const;
