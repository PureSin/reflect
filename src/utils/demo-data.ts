import { dbService } from '../services/database';
import { AIAnalysis, SentimentType } from '../types/ai.types';
import { Entry } from '../types';

/**
 * Utility function to create demo AI analysis data for the journal entries
 * This is used to demonstrate the AI analysis features in the calendar view
 */
export async function createDemoAnalysisData() {
  // Get all entries
  const entries = await dbService.getAllEntries();
  if (entries.length === 0) return;
  
  // Create analysis for 75% of entries with varying happiness scores
  const entriesToAnalyze = entries.slice(0, Math.floor(entries.length * 0.75));
  
  for (const entry of entriesToAnalyze) {
    // Skip if analysis already exists
    const existingAnalysis = await dbService.getAIAnalysisForEntry(entry.id);
    if (existingAnalysis) continue;
    
    // Generate a random score between 1-10 for each metric
    // We'll bias toward medium-to-high scores for a more positive demo
    const getRandomScore = (min = 1, max = 10, bias = 0.5) => {
      // Use bias to skew toward higher scores (bias > 0.5) or lower scores (bias < 0.5)
      const random = Math.pow(Math.random(), 1 - bias);
      return min + random * (max - min);
    };
    
    // Create happiness metrics
    const lifeEvaluation = getRandomScore(3, 10, 0.6);
    const positiveAffect = getRandomScore(3, 10, 0.6);
    const negativeAffect = getRandomScore(1, 8, 0.4); // Inverted, so lower is better
    const socialSupport = getRandomScore(2, 10, 0.5);
    const personalGrowth = getRandomScore(3, 10, 0.6);
    
    // Calculate overall score (weighted average)
    const overallScore = (
      lifeEvaluation * 0.25 +
      positiveAffect * 0.2 +
      (11 - negativeAffect) * 0.15 + // Invert negative affect for scoring
      socialSupport * 0.2 +
      personalGrowth * 0.2
    );
    
    // Determine sentiment based on overall score
    let sentiment: SentimentType;
    if (overallScore >= 8) sentiment = 'very-positive';
    else if (overallScore >= 6) sentiment = 'positive';
    else if (overallScore >= 4) sentiment = 'neutral';
    else if (overallScore >= 2) sentiment = 'negative';
    else sentiment = 'very-negative';
    
    // Create and save the analysis
    await dbService.saveAIAnalysis({
      entryId: entry.id,
      sentiment: {
        sentiment,
        confidence: 0.85,
        explanation: `The entry's overall tone reflects a ${sentiment} sentiment.`,
        keywords: generateKeywords(entry, sentiment),
        analyzedAt: new Date()
      },
      happiness: {
        lifeEvaluation,
        positiveAffect,
        negativeAffect,
        socialSupport,
        personalGrowth,
        overallScore,
        analyzedAt: new Date(),
        confidence: 0.9,
        insights: generateInsights(overallScore, sentiment)
      }
    });
  }
  
  console.log(`Created AI analysis for ${entriesToAnalyze.length} entries`);
}

// Helper functions for demo data generation
function generateKeywords(entry: Entry, sentiment: SentimentType): string[] {
  // Generate some fake keywords based on entry content or just generic ones
  const positiveWords = ['happy', 'joy', 'excited', 'grateful', 'accomplished', 'productive'];
  const neutralWords = ['work', 'day', 'meeting', 'thoughts', 'considering', 'planning'];
  const negativeWords = ['tired', 'frustrated', 'disappointed', 'stressed', 'worried', 'anxious'];
  
  let wordPool: string[];
  if (sentiment.includes('positive')) {
    wordPool = [...positiveWords, ...neutralWords];
  } else if (sentiment === 'neutral') {
    wordPool = neutralWords;
  } else {
    wordPool = [...negativeWords, ...neutralWords];
  }
  
  // Get 3-5 random words
  const count = Math.floor(Math.random() * 3) + 3;
  const keywords: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * wordPool.length);
    keywords.push(wordPool[randomIndex]);
    // Remove the word to avoid duplicates
    wordPool.splice(randomIndex, 1);
    if (wordPool.length === 0) break;
  }
  
  return keywords;
}

function generateInsights(overallScore: number, sentiment: SentimentType): string[] {
  const positiveInsights = [
    'You show high overall life satisfaction.',
    'Strong positive emotions are evident in your writing.',
    'Your social connections appear to be a source of strength.',
    'You demonstrate a clear sense of purpose and growth.',
    'You manage stress well based on your emotional balance.'
  ];
  
  const neutralInsights = [
    'Your overall life satisfaction appears moderate.',
    'Your emotional balance is relatively stable.',
    'Consider strengthening your social connections.',
    'You might benefit from setting new learning goals.',
    'Your stress management seems adequate.'
  ];
  
  const negativeInsights = [
    'Your overall life satisfaction seems lower in this entry.',
    'Consider activities that bring more positive emotions.',
    'Higher stress levels are detected in this entry.',
    'Reaching out to friends or family might be beneficial.',
    'Setting small, achievable goals could help your wellbeing.'
  ];
  
  let insightPool: string[];
  if (overallScore >= 7) {
    insightPool = positiveInsights;
  } else if (overallScore >= 4) {
    insightPool = neutralInsights;
  } else {
    insightPool = negativeInsights;
  }
  
  // Get 2-3 random insights
  const count = Math.floor(Math.random() * 2) + 2;
  const insights: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * insightPool.length);
    insights.push(insightPool[randomIndex]);
    // Remove the insight to avoid duplicates
    insightPool.splice(randomIndex, 1);
    if (insightPool.length === 0) break;
  }
  
  return insights;
}
