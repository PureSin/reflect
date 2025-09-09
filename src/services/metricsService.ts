import { llmService } from './llmService';
import { sentimentService } from './sentimentService';
import { HappinessMetrics, AnalysisRequest, BatchAnalysisResult, TrendAnalysis } from '../types/ai.types';
import { Entry } from '../types';

/**
 * Service for calculating comprehensive happiness metrics from journal entries
 * Uses 5-dimensional happiness analysis with on-device AI processing
 */
class MetricsService {
  /**
   * Calculate happiness metrics for a single journal entry
   */
  async calculateEntryMetrics(entry: Entry): Promise<HappinessMetrics | null> {
    if (!llmService.isModelReady()) {
      console.warn('LLM service not ready for metrics calculation');
      return null;
    }

    try {
      const prompt = this.createHappinessPrompt(entry.content || '');
      const systemPrompt = this.createHappinessSystemPrompt();
      
      const response = await llmService.analyzeText(prompt, systemPrompt);
      
      return this.parseAndValidateMetricsResponse(response, entry.id);
    } catch (error) {
      console.error('Happiness metrics calculation error:', error);
      return null;
    }
  }

  /**
   * Calculate aggregated happiness metrics for multiple entries
   */
  async calculateAggregatedMetrics(
    entries: Entry[],
    timeRange?: { start: Date; end: Date }
  ): Promise<HappinessMetrics | null> {
    if (entries.length === 0) {
      return null;
    }

    try {
      // Filter entries by time range if provided
      const filteredEntries = timeRange
        ? entries.filter(entry => {
            const entryDate = new Date(entry.created);
            return entryDate >= timeRange.start && entryDate <= timeRange.end;
          })
        : entries;

      if (filteredEntries.length === 0) {
        return null;
      }

      // Calculate metrics for each entry
      const metricsResults: HappinessMetrics[] = [];
      
      // Process in chunks to avoid overwhelming the model
      const chunkSize = 3;
      for (let i = 0; i < filteredEntries.length; i += chunkSize) {
        const chunk = filteredEntries.slice(i, i + chunkSize);
        
        const promises = chunk.map(async (entry) => {
          const metrics = await this.calculateEntryMetrics(entry);
          return metrics;
        });

        const chunkResults = await Promise.all(promises);
        metricsResults.push(...chunkResults.filter(Boolean) as HappinessMetrics[]);
        
        // Brief pause between chunks
        if (i + chunkSize < filteredEntries.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (metricsResults.length === 0) {
        return null;
      }

      // Calculate averages across all entries
      return this.aggregateMetrics(metricsResults, filteredEntries.length);
    } catch (error) {
      console.error('Aggregated happiness metrics calculation failed:', error);
      return null;
    }
  }

  /**
   * Calculate time-based metrics for trend analysis
   */
  async calculateTimeBasedMetrics(entries: Entry[]): Promise<{
    weekly: HappinessMetrics | null;
    monthly: HappinessMetrics | null;
    quarterly: HappinessMetrics | null;
  }> {
    const now = new Date();
    
    // Define time ranges
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const quarterStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [weekly, monthly, quarterly] = await Promise.all([
      this.calculateAggregatedMetrics(entries, { start: weekStart, end: now }),
      this.calculateAggregatedMetrics(entries, { start: monthStart, end: now }),
      this.calculateAggregatedMetrics(entries, { start: quarterStart, end: now })
    ]);

    return { weekly, monthly, quarterly };
  }

  /**
   * Generate insights and recommendations based on metrics
   */
  generateInsights(metrics: HappinessMetrics): string[] {
    const insights: string[] = [];
    const threshold = 7; // Above this is considered high
    const lowThreshold = 4; // Below this is considered low

    // Life evaluation insights
    if (metrics.lifeEvaluation >= threshold) {
      insights.push('You show high overall life satisfaction - keep nurturing what brings you joy!');
    } else if (metrics.lifeEvaluation <= lowThreshold) {
      insights.push('Your overall life satisfaction seems lower lately. Consider what changes might help.');
    }

    // Positive affect insights
    if (metrics.positiveAffect >= threshold) {
      insights.push('Strong positive emotions shine through your entries - gratitude and joy are evident.');
    } else if (metrics.positiveAffect <= lowThreshold) {
      insights.push('You might benefit from activities that bring more positive emotions into your daily life.');
    }

    // Negative affect insights (inverted scale)
    if (metrics.negativeAffect >= threshold) {
      insights.push('High stress or worry levels detected. Consider stress management techniques or seeking support.');
    } else if (metrics.negativeAffect <= lowThreshold) {
      insights.push('You\'re managing stress well - your emotional balance seems stable.');
    }

    // Social support insights
    if (metrics.socialSupport >= threshold) {
      insights.push('Strong social connections are evident - your relationships are a source of strength.');
    } else if (metrics.socialSupport <= lowThreshold) {
      insights.push('Consider strengthening social connections - reaching out to friends or family might help.');
    }

    // Personal growth insights
    if (metrics.personalGrowth >= threshold) {
      insights.push('You show strong personal growth and sense of purpose - keep pursuing meaningful goals.');
    } else if (metrics.personalGrowth <= lowThreshold) {
      insights.push('Consider setting new learning goals or exploring activities that provide a sense of accomplishment.');
    }

    // Overall insights
    if (metrics.overallScore >= threshold) {
      insights.push('Your overall happiness metrics show positive wellbeing across multiple dimensions.');
    } else if (metrics.overallScore <= lowThreshold) {
      insights.push('Multiple wellbeing areas could benefit from attention. Small daily improvements can make a big difference.');
    }

    return insights.slice(0, 4); // Return top 4 insights
  }

  /**
   * Create system prompt for happiness metrics analysis
   */
  private createHappinessSystemPrompt(): string {
    return `You are a wellbeing expert specializing in analyzing personal journal entries for happiness and life satisfaction metrics. Your analysis follows the 5-dimensional happiness framework used in positive psychology research.

You must respond with valid JSON only, containing exactly these fields:
{
  "lifeEvaluation": 7.2,
  "positiveAffect": 6.8,
  "negativeAffect": 3.1,
  "socialSupport": 8.0,
  "personalGrowth": 7.5,
  "insights": ["insight1", "insight2", "insight3"]
}

Scoring Guidelines (1-10 scale):
- lifeEvaluation: Overall life satisfaction, contentment with life as a whole
- positiveAffect: Joy, gratitude, serenity, interest, hope, pride, amusement, inspiration, awe, love
- negativeAffect: Worry, sadness, anger, stress, pain (higher score = more negative emotions)
- socialSupport: Sense of having people to count on, relationship quality, social connections
- personalGrowth: Learning, sense of purpose, accomplishment, progress toward goals

Be nuanced in your scoring - consider context, tone, and implications beyond surface words.`;
  }

  /**
   * Create user prompt for happiness metrics analysis
   */
  private createHappinessPrompt(content: string): string {
    // Truncate very long entries
    const maxLength = 1500;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
    
    const wordCount = truncatedContent.split(/\s+/).length;
    
    return `Analyze this journal entry (${wordCount} words) across the 5 dimensions of happiness and wellbeing:

"${truncatedContent}"

Provide scores (1-10) for each dimension and 2-3 key insights about the writer's wellbeing state.`;
  }

  /**
   * Parse and validate LLM response for happiness metrics
   */
  private parseAndValidateMetricsResponse(response: string, entryId: string): HappinessMetrics | null {
    try {
      const cleanResponse = this.extractJSONFromResponse(response);
      const parsed = JSON.parse(cleanResponse);
      
      // Validate and normalize scores
      const metrics: HappinessMetrics = {
        lifeEvaluation: this.clampScore(parsed.lifeEvaluation),
        positiveAffect: this.clampScore(parsed.positiveAffect),
        negativeAffect: this.clampScore(parsed.negativeAffect),
        socialSupport: this.clampScore(parsed.socialSupport),
        personalGrowth: this.clampScore(parsed.personalGrowth),
        overallScore: 0, // Will be calculated
        analyzedAt: new Date(),
        confidence: this.calculateConfidence(parsed),
        insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : []
      };
      
      // Calculate overall score (weighted average)
      metrics.overallScore = this.calculateOverallScore(metrics);
      
      return metrics;
    } catch (error) {
      console.error('Failed to parse happiness metrics response:', error);
      console.log('Raw response:', response);
      
      // Return fallback metrics
      return {
        lifeEvaluation: 5,
        positiveAffect: 5,
        negativeAffect: 5,
        socialSupport: 5,
        personalGrowth: 5,
        overallScore: 5,
        analyzedAt: new Date(),
        confidence: 0.1,
        insights: ['Analysis failed - using fallback neutral metrics']
      };
    }
  }

  /**
   * Extract JSON from potentially messy LLM response
   */
  private extractJSONFromResponse(response: string): string {
    response = response.replace(/```json\s*|```\s*/g, '');
    
    const startIndex = response.indexOf('{');
    const endIndex = response.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error('No valid JSON object found in response');
    }
    
    return response.substring(startIndex, endIndex + 1).trim();
  }

  /**
   * Clamp score to valid 1-10 range
   */
  private clampScore(value: any): number {
    const num = typeof value === 'number' ? value : parseFloat(value) || 5;
    return Math.max(1, Math.min(10, num));
  }

  /**
   * Calculate confidence score based on response completeness
   */
  private calculateConfidence(parsed: any): number {
    let confidence = 0.5;
    
    // Check if all required numeric fields are present
    const requiredFields = ['lifeEvaluation', 'positiveAffect', 'negativeAffect', 'socialSupport', 'personalGrowth'];
    const validFields = requiredFields.filter(field => typeof parsed[field] === 'number').length;
    
    confidence += (validFields / requiredFields.length) * 0.4;
    
    // Check if insights are provided
    if (Array.isArray(parsed.insights) && parsed.insights.length > 0) {
      confidence += 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate weighted overall happiness score
   */
  private calculateOverallScore(metrics: Omit<HappinessMetrics, 'overallScore' | 'analyzedAt' | 'confidence' | 'insights'>): number {
    const weights = {
      lifeEvaluation: 0.25,
      positiveAffect: 0.20,
      negativeAffect: 0.15, // Lower weight, and will be inverted
      socialSupport: 0.20,
      personalGrowth: 0.20
    };
    
    // Invert negative affect (higher negative = lower happiness)
    const invertedNegativeAffect = 11 - metrics.negativeAffect;
    
    return (
      metrics.lifeEvaluation * weights.lifeEvaluation +
      metrics.positiveAffect * weights.positiveAffect +
      invertedNegativeAffect * weights.negativeAffect +
      metrics.socialSupport * weights.socialSupport +
      metrics.personalGrowth * weights.personalGrowth
    );
  }

  /**
   * Aggregate multiple metrics into a single result
   */
  private aggregateMetrics(metricsArray: HappinessMetrics[], totalEntries: number): HappinessMetrics {
    const count = metricsArray.length;
    
    const aggregated: HappinessMetrics = {
      lifeEvaluation: metricsArray.reduce((sum, m) => sum + m.lifeEvaluation, 0) / count,
      positiveAffect: metricsArray.reduce((sum, m) => sum + m.positiveAffect, 0) / count,
      negativeAffect: metricsArray.reduce((sum, m) => sum + m.negativeAffect, 0) / count,
      socialSupport: metricsArray.reduce((sum, m) => sum + m.socialSupport, 0) / count,
      personalGrowth: metricsArray.reduce((sum, m) => sum + m.personalGrowth, 0) / count,
      overallScore: 0, // Will be calculated
      analyzedAt: new Date(),
      confidence: metricsArray.reduce((sum, m) => sum + m.confidence, 0) / count,
      insights: this.aggregateInsights(metricsArray)
    };
    
    // Calculate overall score
    aggregated.overallScore = this.calculateOverallScore(aggregated);
    
    return aggregated;
  }

  /**
   * Aggregate insights from multiple analyses
   */
  private aggregateInsights(metricsArray: HappinessMetrics[]): string[] {
    const allInsights = metricsArray.flatMap(m => m.insights);
    const insightCounts = new Map<string, number>();
    
    // Count similar insights
    allInsights.forEach(insight => {
      const key = insight.toLowerCase().substring(0, 50); // Use first 50 chars as key
      insightCounts.set(key, (insightCounts.get(key) || 0) + 1);
    });
    
    // Return top insights by frequency
    return Array.from(insightCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => {
        // Find the full insight that matches this key
        return allInsights.find(insight => insight.toLowerCase().startsWith(key)) || key;
      });
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
export default metricsService;
