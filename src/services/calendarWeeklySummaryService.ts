import { weeklySummaryManager } from './weeklySummaryManager';
import { dbService } from './database';
import { WeeklySummary, WeeklySummaryAnalysis } from '../types/weekly.types';

/**
 * Service for managing weekly summary data in calendar contexts
 */
class CalendarWeeklySummaryService {
  /**
   * Get weekly summary indicators for calendar display
   */
  async getWeeklySummaryIndicators(year: number, month: number): Promise<Map<string, {
    weekStart: Date;
    weekEnd: Date;
    hasSummary: boolean;
    entryCount: number;
    summary?: WeeklySummary;
    analysis?: WeeklySummaryAnalysis;
  }>> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    // Get all weeks that overlap with this month
    const weeksWithEntries = await dbService.getWeeksWithEntries(startDate, endDate);
    const weeklyData = new Map();
    
    for (const week of weeksWithEntries) {
      // Check if this week has a summary
      const summary = await dbService.getWeeklySummaryByWeek(week.weekStart, week.weekEnd);
      let analysis: WeeklySummaryAnalysis | undefined;
      
      if (summary) {
        analysis = await dbService.getWeeklySummaryAnalysisForSummary(summary.id);
      }
      
      const weekKey = this.getWeekKey(week.weekStart, week.weekEnd);
      weeklyData.set(weekKey, {
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        hasSummary: !!summary,
        entryCount: week.entryCount,
        summary,
        analysis
      });
    }
    
    return weeklyData;
  }
  
  /**
   * Get the week that contains a specific date
   */
  getWeekForDate(date: Date): { weekStart: Date; weekEnd: Date; weekKey: string } {
    const { weekStartDate, weekEndDate } = dbService.getWeekBounds(date);
    return {
      weekStart: weekStartDate,
      weekEnd: weekEndDate,
      weekKey: this.getWeekKey(weekStartDate, weekEndDate)
    };
  }
  
  /**
   * Generate a consistent key for week identification
   */
  getWeekKey(weekStart: Date, weekEnd: Date): string {
    // Use local timezone for consistent week keys
    const startYear = weekStart.getFullYear();
    const startMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
    const startDay = String(weekStart.getDate()).padStart(2, '0');
    const endYear = weekEnd.getFullYear();
    const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
    const endDay = String(weekEnd.getDate()).padStart(2, '0');
    return `${startYear}-${startMonth}-${startDay}_${endYear}-${endMonth}-${endDay}`;
  }
  
  /**
   * Get or create weekly summary for a specific week
   */
  async getOrCreateWeeklySummaryForWeek(weekStart: Date, weekEnd: Date): Promise<{
    summary: WeeklySummary;
    analysis?: WeeklySummaryAnalysis;
  } | null> {
    return await weeklySummaryManager.getOrCreateWeeklySummary(weekStart);
  }
  
  /**
   * Check if a date falls within a week range
   */
  isDateInWeek(date: Date, weekStart: Date, weekEnd: Date): boolean {
    const dateTime = date.getTime();
    return dateTime >= weekStart.getTime() && dateTime <= weekEnd.getTime();
  }
  
  /**
   * Get all dates in a week for highlighting purposes
   */
  getDatesInWeek(weekStart: Date, weekEnd: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(weekStart);
    
    while (currentDate <= weekEnd) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }
}

export const calendarWeeklySummaryService = new CalendarWeeklySummaryService();
export default calendarWeeklySummaryService;
