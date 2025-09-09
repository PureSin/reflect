import { llmService } from './llmService';
import { SentimentAnalysis, SentimentType } from '../types/ai.types';
import { Entry } from '../types';

/**
 * Service for analyzing sentiment and emotional content of journal entries
 * Uses Web Worker-based WebLLM for privacy-first analysis without blocking UI
 */
class SentimentService {
  /**
   * Analyze sentiment of a single journal entry
   */
  async analyzeSentiment(entry: Entry): Promise<SentimentAnalysis | null> {
    if (!llmService.isModelReady()) {
      console.warn('LLM service not ready for sentiment analysis');
      return null;
    }

    try {
      const prompt = this.createSentimentPrompt(entry.content || '');
      const systemPrompt = this.createSentimentSystemPrompt();
      
      const response = await llmService.analyzeText(prompt, systemPrompt);
      
      return this.parseAndValidateSentimentResponse(response, entry.id);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return null;
    }
  }

  /**
   * Batch analyze multiple entries
   */
  async batchAnalyze(entries: Entry[]): Promise<Map<string, SentimentAnalysis>> {
    const results = new Map<string, SentimentAnalysis>();
    
    if (!llmService.isModelReady()) {
      console.warn('LLM service not ready for batch sentiment analysis');
      return results;
    }
    
    // Process in small chunks to avoid overwhelming the worker
    const chunkSize = 3;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (entry) => {
        try {
          const analysis = await this.analyzeSentiment(entry);
          if (analysis) {
            results.set(entry.id, analysis);
          }
        } catch (error) {
          console.error(`Sentiment analysis failed for entry ${entry.id}:`, error);
        }
      });

      await Promise.all(promises);
      
      // Brief pause between chunks to prevent overloading
      if (i + chunkSize < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Create system prompt for sentiment analysis
   */
  private createSentimentSystemPrompt(): string {
    return `You are an expert emotional intelligence analyst specializing in journal entry analysis. Your task is to analyze the emotional content and sentiment of personal journal entries with empathy and accuracy.

You must respond with valid JSON only, containing exactly these fields:
{
  "sentiment": "very-negative" | "negative" | "neutral" | "positive" | "very-positive",
  "confidence": 0.85,
  "explanation": "Brief explanation of the sentiment analysis",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Guidelines:
- Analyze the overall emotional tone and mood
- Consider context and nuance, not just individual words
- Be sensitive to mental health indicators
- Focus on the writer's emotional state, not external events
- Provide 3-5 relevant keywords that influenced your analysis
- Confidence should reflect how certain you are (0.0 to 1.0)
- Keep explanation concise but insightful`;
  }

  /**
   * Create user prompt for sentiment analysis
   */
  private createSentimentPrompt(content: string): string {
    // Truncate very long entries to stay within token limits
    const maxLength = 1500;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
    
    const wordCount = truncatedContent.split(/\s+/).length;
    
    return `Analyze the sentiment and emotional tone of this journal entry (${wordCount} words):\n\n"${truncatedContent}"\n\nProvide your analysis as JSON with sentiment classification, confidence score, explanation, and relevant keywords.`;
  }

  /**
   * Parse and validate LLM response for sentiment analysis
   */
  private parseAndValidateSentimentResponse(response: string, entryId: string): SentimentAnalysis | null {
    try {
      // Clean the response - sometimes LLM includes markdown or extra text
      const cleanResponse = this.extractJSONFromResponse(response);
      const parsed = JSON.parse(cleanResponse);
      
      // Validate required fields
      if (!parsed.sentiment || typeof parsed.confidence !== 'number') {
        throw new Error('Missing required fields in sentiment analysis response');
      }
      
      // Validate sentiment type
      const validSentiments: SentimentType[] = ['very-negative', 'negative', 'neutral', 'positive', 'very-positive'];
      if (!validSentiments.includes(parsed.sentiment)) {
        throw new Error(`Invalid sentiment type: ${parsed.sentiment}`);
      }
      
      return {
        sentiment: parsed.sentiment as SentimentType,
        confidence: this.clampConfidence(parsed.confidence),
        explanation: typeof parsed.explanation === 'string' ? parsed.explanation : 'No explanation provided',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
        analyzedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to parse sentiment analysis response:', error);
      console.log('Raw response:', response);
      
      // Return fallback analysis
      return {
        sentiment: 'neutral',
        confidence: 0.1,
        explanation: 'Analysis failed - using fallback neutral sentiment',
        keywords: [],
        analyzedAt: new Date()
      };
    }
  }

  /**
   * Extract JSON from potentially messy LLM response
   */
  private extractJSONFromResponse(response: string): string {
    // Remove markdown code blocks
    response = response.replace(/```json\s*|```\s*/g, '');
    
    // Find JSON object boundaries
    const startIndex = response.indexOf('{');
    const endIndex = response.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error('No valid JSON object found in response');
    }
    
    return response.substring(startIndex, endIndex + 1).trim();
  }

  /**
   * Clamp confidence value to valid range
   */
  private clampConfidence(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Convert sentiment to numeric score for calculations
   */
  getSentimentScore(sentiment: SentimentType): number {
    const scores: Record<SentimentType, number> = {
      'very-negative': 1,
      'negative': 3,
      'neutral': 5,
      'positive': 7,
      'very-positive': 9
    };
    return scores[sentiment];
  }

  /**
   * Calculate average sentiment from multiple analyses
   */
  calculateAverageSentiment(analyses: SentimentAnalysis[]): {
    averageScore: number;
    dominantSentiment: SentimentType;
    distribution: Record<SentimentType, number>;
  } {
    if (analyses.length === 0) {
      return {
        averageScore: 5,
        dominantSentiment: 'neutral',
        distribution: {
          'very-negative': 0,
          'negative': 0,
          'neutral': 0,
          'positive': 0,
          'very-positive': 0
        }
      };
    }

    const scores = analyses.map(a => this.getSentimentScore(a.sentiment));
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Calculate distribution
    const distribution: Record<SentimentType, number> = {
      'very-negative': 0,
      'negative': 0,
      'neutral': 0,
      'positive': 0,
      'very-positive': 0
    };
    
    analyses.forEach(analysis => {
      distribution[analysis.sentiment]++;
    });
    
    // Find dominant sentiment
    const dominantSentiment = Object.entries(distribution)
      .reduce((max, [sentiment, count]) => 
        count > max[1] ? [sentiment, count] : max, ['neutral', 0]
      )[0] as SentimentType;
    
    return {
      averageScore,
      dominantSentiment,
      distribution
    };
  }
}

// Export singleton instance
export const sentimentService = new SentimentService();
export default sentimentService;
