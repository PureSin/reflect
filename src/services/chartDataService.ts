import { dbService } from './database';
import { AIAnalysis, HappinessMetrics } from '../types/ai.types';
import { Entry } from '../types';
import { dateUtils } from '../lib/utils';

/**
 * Service for preparing AI analysis data for chart visualization
 */
class ChartDataService {
  /**
   * Get AI analysis data formatted for line charts
   */
  async getAIAnalysisChartData(timeRange: { start: Date; end: Date }) {
    try {
      // Get all entries within the time range
      const allEntries = await dbService.getAllEntries();
      const entriesInRange = allEntries.filter(entry => {
        const entryDate = new Date(entry.targetDate);
        return entryDate >= timeRange.start && entryDate <= timeRange.end;
      });

      // Get AI analyses for these entries
      const analysisData: Array<{ analysis: AIAnalysis; entry: Entry }> = [];
      
      for (const entry of entriesInRange) {
        const analysis = await dbService.getAIAnalysisForEntry(entry.id);
        if (analysis) {
          analysisData.push({ analysis, entry });
        }
      }

      if (analysisData.length === 0) {
        return this.createEmptyChartData();
      }

      // Sort by date
      analysisData.sort((a, b) => 
        new Date(a.entry.targetDate).getTime() - new Date(b.entry.targetDate).getTime()
      );

      // Create chart data points
      const chartData = analysisData.map(({ analysis, entry }) => ({
        date: dateUtils.formatDate(new Date(entry.targetDate)),
        dateObj: new Date(entry.targetDate),
        overallScore: Number(analysis.happiness.overallScore.toFixed(1)),
        lifeEvaluation: Number(analysis.happiness.lifeEvaluation.toFixed(1)),
        positiveAffect: Number(analysis.happiness.positiveAffect.toFixed(1)),
        negativeAffect: Number(analysis.happiness.negativeAffect.toFixed(1)),
        socialSupport: Number(analysis.happiness.socialSupport.toFixed(1)),
        personalGrowth: Number(analysis.happiness.personalGrowth.toFixed(1)),
        entryId: entry.id,
        entryTitle: `Entry for ${dateUtils.formatDate(new Date(entry.targetDate))}`
      }));

      // Calculate statistics
      const stats = this.calculateStats(analysisData.map(d => d.analysis.happiness));

      return {
        chartData,
        stats,
        totalEntries: analysisData.length,
        dateRange: {
          start: timeRange.start,
          end: timeRange.end
        }
      };
    } catch (error) {
      console.error('Error getting AI analysis chart data:', error);
      return this.createEmptyChartData();
    }
  }

  /**
   * Calculate statistical summaries for the metrics
   */
  private calculateStats(happinessMetrics: HappinessMetrics[]) {
    if (happinessMetrics.length === 0) {
      return {
        overallScore: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        lifeEvaluation: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        positiveAffect: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        negativeAffect: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        socialSupport: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        personalGrowth: { avg: 0, min: 0, max: 0, trend: 'stable' as const }
      };
    }

    const calculateMetricStats = (values: number[]) => {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      // Calculate trend (compare first third vs last third)
      const firstThird = values.slice(0, Math.ceil(values.length / 3));
      const lastThird = values.slice(-Math.ceil(values.length / 3));
      
      const firstAvg = firstThird.reduce((sum, val) => sum + val, 0) / firstThird.length;
      const lastAvg = lastThird.reduce((sum, val) => sum + val, 0) / lastThird.length;
      
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      const changeThreshold = 0.3; // 0.3 point change to be considered significant
      
      if (lastAvg - firstAvg > changeThreshold) {
        trend = 'improving';
      } else if (firstAvg - lastAvg > changeThreshold) {
        trend = 'declining';
      }
      
      return { 
        avg: Number(avg.toFixed(1)), 
        min: Number(min.toFixed(1)), 
        max: Number(max.toFixed(1)), 
        trend 
      };
    };

    return {
      overallScore: calculateMetricStats(happinessMetrics.map(h => h.overallScore)),
      lifeEvaluation: calculateMetricStats(happinessMetrics.map(h => h.lifeEvaluation)),
      positiveAffect: calculateMetricStats(happinessMetrics.map(h => h.positiveAffect)),
      negativeAffect: calculateMetricStats(happinessMetrics.map(h => h.negativeAffect)),
      socialSupport: calculateMetricStats(happinessMetrics.map(h => h.socialSupport)),
      personalGrowth: calculateMetricStats(happinessMetrics.map(h => h.personalGrowth))
    };
  }

  /**
   * Create empty chart data structure
   */
  private createEmptyChartData() {
    return {
      chartData: [],
      stats: {
        overallScore: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        lifeEvaluation: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        positiveAffect: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        negativeAffect: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        socialSupport: { avg: 0, min: 0, max: 0, trend: 'stable' as const },
        personalGrowth: { avg: 0, min: 0, max: 0, trend: 'stable' as const }
      },
      totalEntries: 0,
      dateRange: { start: new Date(), end: new Date() }
    };
  }
}

export const chartDataService = new ChartDataService();
