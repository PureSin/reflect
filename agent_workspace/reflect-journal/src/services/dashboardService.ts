import { dbService } from './database';
import { AIAnalysis, SentimentAnalysis, HappinessMetrics } from '../types/ai.types';
import { Entry } from '../types';
import {
  DashboardData,
  TimeRange,
  OverallMetrics,
  EmotionalBalanceData,
  SocialConnectionData,
  AchievementData,
  GratitudeData,
  SelfCareData,
  DashboardInsight,
  TimeSeriesData,
  PieChartData,
  HeatmapData
} from '../types/dashboard.types';
import { dateUtils } from '../lib/utils';

/**
 * Service for generating comprehensive happiness metrics dashboard data
 * Processes AI analysis results to create meaningful visualizations and insights
 */
class DashboardService {
  /**
   * Generate complete dashboard data for a given time range
   */
  async generateDashboardData(timeRange: TimeRange): Promise<DashboardData> {
    try {
      // Get all entries and analyses for the time range
      const entries = await this.getEntriesInRange(timeRange);
      const analyses = await this.getAnalysesForEntries(entries);
      
      if (analyses.length === 0) {
        return this.createEmptyDashboard(timeRange);
      }

      // Generate each dimension of the dashboard
      const [overallMetrics, emotionalBalance, socialConnection, achievement, gratitude, selfCare] = await Promise.all([
        this.calculateOverallMetrics(entries, analyses, timeRange),
        this.generateEmotionalBalanceData(entries, analyses),
        this.generateSocialConnectionData(entries, analyses),
        this.generateAchievementData(entries, analyses),
        this.generateGratitudeData(entries, analyses),
        this.generateSelfCareData(entries, analyses)
      ]);

      return {
        timeRange,
        overallMetrics,
        emotionalBalance,
        socialConnection,
        achievement,
        gratitude,
        selfCare
      };
    } catch (error) {
      console.error('Error generating dashboard data:', error);
      return this.createEmptyDashboard(timeRange);
    }
  }

  /**
   * Get entries within the specified time range
   */
  private async getEntriesInRange(timeRange: TimeRange): Promise<Entry[]> {
    const allEntries = await dbService.getAllEntries();
    return allEntries.filter(entry => {
      const entryDate = new Date(entry.targetDate);
      return entryDate >= timeRange.start && entryDate <= timeRange.end;
    });
  }

  /**
   * Get AI analyses for the given entries
   */
  private async getAnalysesForEntries(entries: Entry[]): Promise<Array<AIAnalysis & { entry: Entry }>> {
    const analysesWithEntries: Array<AIAnalysis & { entry: Entry }> = [];
    
    for (const entry of entries) {
      const analysis = await dbService.getAIAnalysisForEntry(entry.id);
      if (analysis) {
        analysesWithEntries.push({ ...analysis, entry });
      }
    }
    
    return analysesWithEntries;
  }

  /**
   * Calculate overall metrics summary
   */
  private async calculateOverallMetrics(
    entries: Entry[], 
    analyses: Array<AIAnalysis & { entry: Entry }>, 
    timeRange: TimeRange
  ): Promise<OverallMetrics> {
    if (analyses.length === 0) {
      return {
        averageHappiness: 0,
        totalEntries: entries.length,
        analyzedEntries: 0,
        streakDays: 0,
        improvementTrend: 'stable',
        trendPercentage: 0
      };
    }

    // Calculate average happiness score
    const totalHappiness = analyses.reduce((sum, analysis) => sum + analysis.happiness.overallScore, 0);
    const averageHappiness = totalHappiness / analyses.length;

    // Calculate streak (consecutive days with entries)
    const streakDays = await this.calculateCurrentStreak(entries);

    // Calculate trend (compare first half vs second half of time range)
    const { improvementTrend, trendPercentage } = this.calculateTrend(analyses, timeRange);

    return {
      averageHappiness,
      totalEntries: entries.length,
      analyzedEntries: analyses.length,
      streakDays,
      improvementTrend,
      trendPercentage
    };
  }

  /**
   * Generate emotional balance data
   */
  private async generateEmotionalBalanceData(
    entries: Entry[], 
    analyses: Array<AIAnalysis & { entry: Entry }>
  ): Promise<EmotionalBalanceData> {
    // Group analyses by date
    const dailyData = this.groupAnalysesByDate(analyses);
    
    // Create timeline data
    const timeline = Object.entries(dailyData).map(([dateStr, dayAnalyses]) => {
      const sentimentScores = dayAnalyses.map(a => this.sentimentToNumeric(a.sentiment.sentiment));
      const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
      
      // Count sentiment types
      const positive = sentimentScores.filter(s => s > 0.5).length;
      const negative = sentimentScores.filter(s => s < -0.5).length;
      const neutral = sentimentScores.length - positive - negative;
      
      return {
        date: new Date(dateStr),
        positive: positive / sentimentScores.length,
        negative: negative / sentimentScores.length,
        neutral: neutral / sentimentScores.length,
        overallSentiment: avgSentiment
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate sentiment distribution
    const sentimentDistribution = {
      'very-positive': 0,
      'positive': 0,
      'neutral': 0,
      'negative': 0,
      'very-negative': 0
    };
    
    analyses.forEach(analysis => {
      sentimentDistribution[analysis.sentiment.sentiment]++;
    });
    
    // Normalize to percentages
    const total = analyses.length;
    Object.keys(sentimentDistribution).forEach(key => {
      sentimentDistribution[key as keyof typeof sentimentDistribution] = 
        (sentimentDistribution[key as keyof typeof sentimentDistribution] / total) * 100;
    });

    // Extract mood keywords
    const moodKeywords = this.extractMoodKeywords(analyses);

    // Calculate average sentiment
    const averageSentiment = analyses.reduce((sum, analysis) => {
      return sum + this.sentimentToNumeric(analysis.sentiment.sentiment);
    }, 0) / analyses.length;

    return {
      timeline,
      averageSentiment,
      sentimentDistribution,
      moodKeywords
    };
  }

  /**
   * Generate social connection data
   */
  private async generateSocialConnectionData(
    entries: Entry[], 
    analyses: Array<AIAnalysis & { entry: Entry }>
  ): Promise<SocialConnectionData> {
    const dailyData = this.groupAnalysesByDate(analyses);
    
    const timeline = Object.entries(dailyData).map(([dateStr, dayAnalyses]) => {
      const avgSocialScore = dayAnalyses.reduce((sum, a) => sum + a.happiness.socialSupport, 0) / dayAnalyses.length;
      const relationshipMentions = this.countRelationshipMentions(dayAnalyses.map(a => a.entry));
      
      return {
        date: new Date(dateStr),
        socialScore: avgSocialScore,
        relationshipMentions
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    const averageScore = analyses.reduce((sum, a) => sum + a.happiness.socialSupport, 0) / analyses.length;
    
    const relationshipTypes = this.categorizeRelationships(entries);
    const socialActivities = this.extractSocialActivities(entries);

    return {
      timeline,
      averageScore,
      relationshipTypes,
      socialActivities
    };
  }

  /**
   * Generate achievement and progress data
   */
  private async generateAchievementData(
    entries: Entry[], 
    analyses: Array<AIAnalysis & { entry: Entry }>
  ): Promise<AchievementData> {
    const dailyData = this.groupAnalysesByDate(analyses);
    
    const timeline = Object.entries(dailyData).map(([dateStr, dayAnalyses]) => {
      const avgAchievementScore = dayAnalyses.reduce((sum, a) => sum + a.happiness.personalGrowth, 0) / dayAnalyses.length;
      const goalMentions = this.countGoalMentions(dayAnalyses.map(a => a.entry));
      
      return {
        date: new Date(dateStr),
        achievementScore: avgAchievementScore,
        goalMentions
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    const averageScore = analyses.reduce((sum, a) => sum + a.happiness.personalGrowth, 0) / analyses.length;
    
    const achievementTypes = this.categorizeAchievements(entries);
    const progressIndicators = this.extractProgressIndicators(entries);

    return {
      timeline,
      averageScore,
      achievementTypes,
      progressIndicators
    };
  }

  /**
   * Generate gratitude data with heatmap
   */
  private async generateGratitudeData(
    entries: Entry[], 
    analyses: Array<AIAnalysis & { entry: Entry }>
  ): Promise<GratitudeData> {
    const dailyData = this.groupAnalysesByDate(analyses);
    
    const timeline = Object.entries(dailyData).map(([dateStr, dayAnalyses]) => {
      const gratitudeScore = this.calculateGratitudeScore(dayAnalyses.map(a => a.entry));
      const gratitudeMentions = this.countGratitudeMentions(dayAnalyses.map(a => a.entry));
      
      return {
        date: new Date(dateStr),
        gratitudeScore,
        gratitudeMentions
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    const averageScore = timeline.reduce((sum, day) => sum + day.gratitudeScore, 0) / timeline.length || 0;
    
    const gratitudeCategories = this.categorizeGratitude(entries);
    const gratitudeWords = this.extractGratitudeWords(entries);
    const heatmapData = this.createGratitudeHeatmap(timeline);

    return {
      timeline,
      averageScore,
      gratitudeCategories,
      gratitudeWords,
      heatmapData
    };
  }

  /**
   * Generate self-care and wellness data
   */
  private async generateSelfCareData(
    entries: Entry[], 
    analyses: Array<AIAnalysis & { entry: Entry }>
  ): Promise<SelfCareData> {
    const dailyData = this.groupAnalysesByDate(analyses);
    
    const timeline = Object.entries(dailyData).map(([dateStr, dayAnalyses]) => {
      const selfCareScore = this.calculateSelfCareScore(dayAnalyses.map(a => a.entry));
      const wellnessMentions = this.countWellnessMentions(dayAnalyses.map(a => a.entry));
      
      return {
        date: new Date(dateStr),
        selfCareScore,
        wellnessMentions
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    const averageScore = timeline.reduce((sum, day) => sum + day.selfCareScore, 0) / timeline.length || 0;
    
    const selfCareActivities = this.categorizeSelfCare(entries);
    const wellnessIndicators = this.extractWellnessIndicators(entries);

    return {
      timeline,
      averageScore,
      selfCareActivities,
      wellnessIndicators
    };
  }

  // Helper Methods
  
  private sentimentToNumeric(sentiment: string): number {
    const map = {
      'very-positive': 1,
      'positive': 0.5,
      'neutral': 0,
      'negative': -0.5,
      'very-negative': -1
    };
    return map[sentiment as keyof typeof map] || 0;
  }

  private groupAnalysesByDate(analyses: Array<AIAnalysis & { entry: Entry }>): Record<string, Array<AIAnalysis & { entry: Entry }>> {
    return analyses.reduce((groups, analysis) => {
      const dateKey = dateUtils.getDateKey(analysis.entry.targetDate);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(analysis);
      return groups;
    }, {} as Record<string, Array<AIAnalysis & { entry: Entry }>>);
  }

  private extractMoodKeywords(analyses: Array<AIAnalysis & { entry: Entry }>): Array<{ word: string; frequency: number; sentiment: string }> {
    const keywordMap = new Map<string, { count: number; sentiments: string[] }>();
    
    analyses.forEach(analysis => {
      analysis.sentiment.keywords.forEach(keyword => {
        if (keywordMap.has(keyword)) {
          const existing = keywordMap.get(keyword)!;
          existing.count++;
          existing.sentiments.push(analysis.sentiment.sentiment);
        } else {
          keywordMap.set(keyword, { count: 1, sentiments: [analysis.sentiment.sentiment] });
        }
      });
    });
    
    return Array.from(keywordMap.entries())
      .map(([word, data]) => ({
        word,
        frequency: data.count,
        sentiment: this.getMostCommonSentiment(data.sentiments)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }

  private getMostCommonSentiment(sentiments: string[]): string {
    const counts = sentiments.reduce((acc, sentiment) => {
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  private countRelationshipMentions(entries: Entry[]): number {
    const relationshipKeywords = [
      'family', 'friend', 'partner', 'spouse', 'colleague', 'team', 'mom', 'dad', 
      'parent', 'child', 'sibling', 'relationship', 'love', 'connect', 'together'
    ];
    
    return entries.reduce((count, entry) => {
      const text = entry.plainText.toLowerCase();
      return count + relationshipKeywords.filter(keyword => text.includes(keyword)).length;
    }, 0);
  }

  private categorizeRelationships(entries: Entry[]): SocialConnectionData['relationshipTypes'] {
    const categories = {
      family: ['family', 'mom', 'dad', 'parent', 'child', 'sibling', 'grandmother', 'grandfather'],
      friends: ['friend', 'buddy', 'pal', 'hangout', 'social'],
      romantic: ['partner', 'spouse', 'boyfriend', 'girlfriend', 'husband', 'wife', 'date'],
      colleagues: ['colleague', 'coworker', 'team', 'boss', 'manager', 'work'],
      community: ['community', 'neighbor', 'group', 'club', 'organization']
    };
    
    const counts = { family: 0, friends: 0, romantic: 0, colleagues: 0, community: 0 };
    
    entries.forEach(entry => {
      const text = entry.plainText.toLowerCase();
      Object.entries(categories).forEach(([category, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          counts[category as keyof typeof counts]++;
        }
      });
    });
    
    return counts;
  }

  private extractSocialActivities(entries: Entry[]): Array<{ activity: string; frequency: number }> {
    const activities = [
      'dinner', 'lunch', 'coffee', 'party', 'celebration', 'meeting', 'call', 'text',
      'visit', 'travel', 'vacation', 'game', 'movie', 'concert', 'event'
    ];
    
    const activityCounts = new Map<string, number>();
    
    entries.forEach(entry => {
      const text = entry.plainText.toLowerCase();
      activities.forEach(activity => {
        if (text.includes(activity)) {
          activityCounts.set(activity, (activityCounts.get(activity) || 0) + 1);
        }
      });
    });
    
    return Array.from(activityCounts.entries())
      .map(([activity, frequency]) => ({ activity, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private countGoalMentions(entries: Entry[]): number {
    const goalKeywords = [
      'goal', 'achieve', 'accomplish', 'complete', 'finish', 'progress', 'improve', 
      'learn', 'grow', 'develop', 'plan', 'target', 'objective'
    ];
    
    return entries.reduce((count, entry) => {
      const text = entry.plainText.toLowerCase();
      return count + goalKeywords.filter(keyword => text.includes(keyword)).length;
    }, 0);
  }

  private categorizeAchievements(entries: Entry[]): AchievementData['achievementTypes'] {
    const categories = {
      career: ['work', 'job', 'career', 'promotion', 'project', 'business', 'professional'],
      personal: ['personal', 'self', 'habit', 'routine', 'lifestyle', 'character'],
      health: ['health', 'fitness', 'exercise', 'diet', 'wellness', 'medical'],
      learning: ['learn', 'study', 'course', 'skill', 'knowledge', 'education', 'book'],
      creative: ['creative', 'art', 'music', 'writing', 'craft', 'design', 'create']
    };
    
    const counts = { career: 0, personal: 0, health: 0, learning: 0, creative: 0 };
    
    entries.forEach(entry => {
      const text = entry.plainText.toLowerCase();
      Object.entries(categories).forEach(([category, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          counts[category as keyof typeof counts]++;
        }
      });
    });
    
    return counts;
  }

  private extractProgressIndicators(entries: Entry[]): Array<{ goal: string; progress: number; mentions: number }> {
    // This would ideally use more sophisticated NLP, but for now we'll use simple keyword matching
    const progressWords = ['better', 'improved', 'progress', 'achieved', 'completed', 'finished'];
    
    const goalAreas = ['fitness', 'career', 'relationship', 'learning', 'health', 'hobby'];
    
    return goalAreas.map(goal => {
      const mentions = entries.filter(entry => 
        entry.plainText.toLowerCase().includes(goal)
      ).length;
      
      const progressMentions = entries.filter(entry => {
        const text = entry.plainText.toLowerCase();
        return text.includes(goal) && progressWords.some(word => text.includes(word));
      }).length;
      
      const progress = mentions > 0 ? (progressMentions / mentions) * 100 : 0;
      
      return { goal, progress, mentions };
    }).filter(item => item.mentions > 0);
  }

  private calculateGratitudeScore(entries: Entry[]): number {
    const gratitudeKeywords = [
      'grateful', 'thankful', 'appreciate', 'blessing', 'blessed', 'lucky', 
      'fortunate', 'grateful', 'thank', 'thanks'
    ];
    
    const totalMentions = entries.reduce((count, entry) => {
      const text = entry.plainText.toLowerCase();
      return count + gratitudeKeywords.filter(keyword => text.includes(keyword)).length;
    }, 0);
    
    // Normalize score based on entry length and frequency
    const totalWords = entries.reduce((sum, entry) => sum + entry.metadata.wordCount, 0);
    return totalWords > 0 ? Math.min((totalMentions / totalWords) * 1000, 10) : 0;
  }

  private countGratitudeMentions(entries: Entry[]): number {
    const gratitudeKeywords = ['grateful', 'thankful', 'appreciate', 'blessing', 'blessed'];
    
    return entries.reduce((count, entry) => {
      const text = entry.plainText.toLowerCase();
      return count + gratitudeKeywords.filter(keyword => text.includes(keyword)).length;
    }, 0);
  }

  private categorizeGratitude(entries: Entry[]): GratitudeData['gratitudeCategories'] {
    const categories = {
      relationships: ['family', 'friend', 'love', 'support', 'connection'],
      health: ['health', 'wellness', 'recovery', 'strength', 'energy'],
      opportunities: ['opportunity', 'chance', 'job', 'experience', 'growth'],
      experiences: ['trip', 'adventure', 'memory', 'moment', 'experience'],
      possessions: ['home', 'house', 'car', 'possession', 'gift']
    };
    
    const counts = { relationships: 0, health: 0, opportunities: 0, experiences: 0, possessions: 0 };
    
    entries.forEach(entry => {
      const text = entry.plainText.toLowerCase();
      // Only count if gratitude keywords are also present
      const hasGratitude = ['grateful', 'thankful', 'appreciate'].some(word => text.includes(word));
      
      if (hasGratitude) {
        Object.entries(categories).forEach(([category, keywords]) => {
          if (keywords.some(keyword => text.includes(keyword))) {
            counts[category as keyof typeof counts]++;
          }
        });
      }
    });
    
    return counts;
  }

  private extractGratitudeWords(entries: Entry[]): Array<{ word: string; frequency: number }> {
    const gratitudeWords = new Map<string, number>();
    
    entries.forEach(entry => {
      const text = entry.plainText.toLowerCase();
      if (['grateful', 'thankful', 'appreciate'].some(word => text.includes(word))) {
        // Extract words that commonly appear in gratitude contexts
        const words = text.match(/\b\w+\b/g) || [];
        words.forEach(word => {
          if (word.length > 3 && !['grateful', 'thankful', 'appreciate'].includes(word)) {
            gratitudeWords.set(word, (gratitudeWords.get(word) || 0) + 1);
          }
        });
      }
    });
    
    return Array.from(gratitudeWords.entries())
      .map(([word, frequency]) => ({ word, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15);
  }

  private createGratitudeHeatmap(timeline: Array<{ date: Date; gratitudeScore: number }>): Array<{ date: string; value: number }> {
    return timeline.map(day => ({
      date: dateUtils.getDateKey(day.date),
      value: day.gratitudeScore
    }));
  }

  private calculateSelfCareScore(entries: Entry[]): number {
    const selfCareKeywords = [
      'exercise', 'workout', 'meditation', 'sleep', 'rest', 'relax', 'bath', 
      'massage', 'yoga', 'walk', 'nature', 'hobby', 'read', 'music'
    ];
    
    const totalMentions = entries.reduce((count, entry) => {
      const text = entry.plainText.toLowerCase();
      return count + selfCareKeywords.filter(keyword => text.includes(keyword)).length;
    }, 0);
    
    const totalWords = entries.reduce((sum, entry) => sum + entry.metadata.wordCount, 0);
    return totalWords > 0 ? Math.min((totalMentions / totalWords) * 1000, 10) : 0;
  }

  private countWellnessMentions(entries: Entry[]): number {
    const wellnessKeywords = ['wellness', 'health', 'exercise', 'meditation', 'sleep', 'nutrition'];
    
    return entries.reduce((count, entry) => {
      const text = entry.plainText.toLowerCase();
      return count + wellnessKeywords.filter(keyword => text.includes(keyword)).length;
    }, 0);
  }

  private categorizeSelfCare(entries: Entry[]): SelfCareData['selfCareActivities'] {
    const activities = {
      exercise: ['exercise', 'workout', 'gym', 'run', 'walk', 'bike', 'fitness'],
      meditation: ['meditation', 'mindfulness', 'breathe', 'calm', 'peace'],
      sleep: ['sleep', 'rest', 'nap', 'tired', 'bed', 'dream'],
      nutrition: ['eat', 'food', 'healthy', 'nutrition', 'diet', 'meal'],
      hobbies: ['hobby', 'read', 'book', 'music', 'art', 'craft', 'game'],
      relaxation: ['relax', 'bath', 'massage', 'vacation', 'break', 'unwind']
    };
    
    const counts = { exercise: 0, meditation: 0, sleep: 0, nutrition: 0, hobbies: 0, relaxation: 0 };
    
    entries.forEach(entry => {
      const text = entry.plainText.toLowerCase();
      Object.entries(activities).forEach(([activity, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          counts[activity as keyof typeof counts]++;
        }
      });
    });
    
    return counts;
  }

  private extractWellnessIndicators(entries: Entry[]): Array<{ activity: string; frequency: number }> {
    const indicators = [
      'sleep well', 'good sleep', 'exercised', 'worked out', 'meditated', 'ate healthy',
      'relaxed', 'stressed', 'tired', 'energetic', 'motivated', 'focused'
    ];
    
    const indicatorCounts = new Map<string, number>();
    
    entries.forEach(entry => {
      const text = entry.plainText.toLowerCase();
      indicators.forEach(indicator => {
        if (text.includes(indicator)) {
          indicatorCounts.set(indicator, (indicatorCounts.get(indicator) || 0) + 1);
        }
      });
    });
    
    return Array.from(indicatorCounts.entries())
      .map(([activity, frequency]) => ({ activity, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private async calculateCurrentStreak(entries: Entry[]): Promise<number> {
    // This would be more sophisticated in a real implementation
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    const entryDates = new Set(entries.map(entry => dateUtils.getDateKey(entry.targetDate)));
    
    while (streak < 365) { // Max streak of 1 year
      const dateKey = dateUtils.getDateKey(currentDate);
      if (entryDates.has(dateKey)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  private calculateTrend(
    analyses: Array<AIAnalysis & { entry: Entry }>, 
    timeRange: TimeRange
  ): { improvementTrend: 'improving' | 'declining' | 'stable'; trendPercentage: number } {
    if (analyses.length < 4) {
      return { improvementTrend: 'stable', trendPercentage: 0 };
    }
    
    // Split analyses into first and second half
    const sortedAnalyses = [...analyses].sort((a, b) => 
      a.entry.targetDate.getTime() - b.entry.targetDate.getTime()
    );
    
    const midpoint = Math.floor(sortedAnalyses.length / 2);
    const firstHalf = sortedAnalyses.slice(0, midpoint);
    const secondHalf = sortedAnalyses.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.happiness.overallScore, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.happiness.overallScore, 0) / secondHalf.length;
    
    const change = secondHalfAvg - firstHalfAvg;
    const trendPercentage = firstHalfAvg > 0 ? (change / firstHalfAvg) * 100 : 0;
    
    if (Math.abs(trendPercentage) < 5) {
      return { improvementTrend: 'stable', trendPercentage: Math.round(trendPercentage) };
    } else if (trendPercentage > 0) {
      return { improvementTrend: 'improving', trendPercentage: Math.round(trendPercentage) };
    } else {
      return { improvementTrend: 'declining', trendPercentage: Math.round(Math.abs(trendPercentage)) };
    }
  }

  private createEmptyDashboard(timeRange: TimeRange): DashboardData {
    return {
      timeRange,
      overallMetrics: {
        averageHappiness: 0,
        totalEntries: 0,
        analyzedEntries: 0,
        streakDays: 0,
        improvementTrend: 'stable',
        trendPercentage: 0
      },
      emotionalBalance: {
        timeline: [],
        averageSentiment: 0,
        sentimentDistribution: {
          'very-positive': 0,
          'positive': 0,
          'neutral': 0,
          'negative': 0,
          'very-negative': 0
        },
        moodKeywords: []
      },
      socialConnection: {
        timeline: [],
        averageScore: 0,
        relationshipTypes: { family: 0, friends: 0, romantic: 0, colleagues: 0, community: 0 },
        socialActivities: []
      },
      achievement: {
        timeline: [],
        averageScore: 0,
        achievementTypes: { career: 0, personal: 0, health: 0, learning: 0, creative: 0 },
        progressIndicators: []
      },
      gratitude: {
        timeline: [],
        averageScore: 0,
        gratitudeCategories: { relationships: 0, health: 0, opportunities: 0, experiences: 0, possessions: 0 },
        gratitudeWords: [],
        heatmapData: []
      },
      selfCare: {
        timeline: [],
        averageScore: 0,
        selfCareActivities: { exercise: 0, meditation: 0, sleep: 0, nutrition: 0, hobbies: 0, relaxation: 0 },
        wellnessIndicators: []
      }
    };
  }

  /**
   * Generate insights and recommendations from dashboard data
   */
  async generateInsights(dashboardData: DashboardData): Promise<DashboardInsight[]> {
    const insights: DashboardInsight[] = [];
    
    // Overall happiness insights
    if (dashboardData.overallMetrics.averageHappiness >= 8) {
      insights.push({
        id: 'high-happiness',
        type: 'achievement',
        priority: 'high',
        title: 'Excellent Happiness Levels',
        description: `Your average happiness score of ${dashboardData.overallMetrics.averageHappiness.toFixed(1)}/10 is outstanding!`,
        metric: 'overallMetrics',
        actionable: false,
        suggestion: 'Keep doing what you\'re doing - your current lifestyle and mindset are working well.'
      });
    } else if (dashboardData.overallMetrics.averageHappiness < 5) {
      insights.push({
        id: 'low-happiness',
        type: 'recommendation',
        priority: 'high',
        title: 'Happiness Could Use Attention',
        description: `Your average happiness score of ${dashboardData.overallMetrics.averageHappiness.toFixed(1)}/10 suggests room for improvement.`,
        metric: 'overallMetrics',
        actionable: true,
        suggestion: 'Consider focusing on self-care activities and seeking support if needed.'
      });
    }
    
    // Trend insights
    if (dashboardData.overallMetrics.improvementTrend === 'improving') {
      insights.push({
        id: 'improving-trend',
        type: 'trend',
        priority: 'medium',
        title: 'Positive Trend Detected',
        description: `Your happiness has improved by ${dashboardData.overallMetrics.trendPercentage}% over this period.`,
        metric: 'overallMetrics',
        actionable: false
      });
    } else if (dashboardData.overallMetrics.improvementTrend === 'declining') {
      insights.push({
        id: 'declining-trend',
        type: 'recommendation',
        priority: 'high',
        title: 'Declining Trend Noticed',
        description: `Your happiness has declined by ${dashboardData.overallMetrics.trendPercentage}% over this period.`,
        metric: 'overallMetrics',
        actionable: true,
        suggestion: 'Consider what changes might have contributed to this decline and how to address them.'
      });
    }
    
    // Social connection insights
    if (dashboardData.socialConnection.averageScore < 5) {
      insights.push({
        id: 'low-social-connection',
        type: 'recommendation',
        priority: 'medium',
        title: 'Social Connection Could Be Stronger',
        description: `Your social support score of ${dashboardData.socialConnection.averageScore.toFixed(1)}/10 suggests building stronger connections might help.`,
        metric: 'socialConnection',
        actionable: true,
        suggestion: 'Try reaching out to friends or family, or consider joining social activities.'
      });
    }
    
    // Gratitude insights
    if (dashboardData.gratitude.averageScore > 5) {
      insights.push({
        id: 'strong-gratitude',
        type: 'achievement',
        priority: 'medium',
        title: 'Strong Gratitude Practice',
        description: 'Your entries show a healthy level of gratitude and appreciation.',
        metric: 'gratitude',
        actionable: false
      });
    } else if (dashboardData.gratitude.averageScore < 2) {
      insights.push({
        id: 'low-gratitude',
        type: 'recommendation',
        priority: 'medium',
        title: 'Gratitude Practice Could Help',
        description: 'Consider incorporating more gratitude reflection into your journaling.',
        metric: 'gratitude',
        actionable: true,
        suggestion: 'Try ending each entry with 2-3 things you\'re grateful for.'
      });
    }
    
    return insights.slice(0, 6); // Limit to top 6 insights
  }

  /**
   * Create predefined time ranges
   */
  createTimeRange(period: TimeRange['period'], customStart?: Date, customEnd?: Date): TimeRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);
        return { start: weekStart, end: today, period: 'week' };
        
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 29);
        return { start: monthStart, end: today, period: 'month' };
        
      case 'quarter':
        const quarterStart = new Date(today);
        quarterStart.setDate(today.getDate() - 89);
        return { start: quarterStart, end: today, period: 'quarter' };
        
      case 'half-year':
        const halfYearStart = new Date(today);
        halfYearStart.setDate(today.getDate() - 179);
        return { start: halfYearStart, end: today, period: 'half-year' };
        
      case 'year':
        const yearStart = new Date(today);
        yearStart.setDate(today.getDate() - 364);
        return { start: yearStart, end: today, period: 'year' };
        
      case 'custom':
        return {
          start: customStart || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: customEnd || today,
          period: 'custom'
        };
        
      default:
        return { start: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000), end: today, period: 'month' };
    }
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
export default dashboardService;
