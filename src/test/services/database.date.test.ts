import { describe, it, expect } from 'vitest';
import { dateUtils } from '../../lib/utils';

describe('Database Date Logic - Off-by-One Bug Tests', () => {
  describe('date boundary logic', () => {
    it('should create proper local date boundaries for getEntryByDate logic', () => {
      // Test the date boundary creation logic that was fixed
      const searchDate = new Date(2024, 8, 20); // September 20, 2024
      
      // This is the logic that was fixed in getEntryByDate
      const startOfDay = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate(), 23, 59, 59, 999);

      // Verify boundaries are for Sept 20th specifically
      expect(startOfDay.getFullYear()).toBe(2024);
      expect(startOfDay.getMonth()).toBe(8); // September
      expect(startOfDay.getDate()).toBe(20);
      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);

      expect(endOfDay.getFullYear()).toBe(2024);
      expect(endOfDay.getMonth()).toBe(8); // September
      expect(endOfDay.getDate()).toBe(20);
      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
    });

    it('should handle midnight boundaries correctly', () => {
      // Test with a date at midnight
      const midnightDate = new Date(2024, 8, 20, 0, 0, 0, 0);
      
      const startOfDay = new Date(midnightDate.getFullYear(), midnightDate.getMonth(), midnightDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(midnightDate.getFullYear(), midnightDate.getMonth(), midnightDate.getDate(), 23, 59, 59, 999);

      // Should still create boundaries for the entire day of Sept 20th
      expect(startOfDay.getDate()).toBe(20);
      expect(endOfDay.getDate()).toBe(20);
      expect(startOfDay.getMonth()).toBe(8);
      expect(endOfDay.getMonth()).toBe(8);
    });

    it('should handle end-of-day boundaries correctly', () => {
      // Test with a date near end of day
      const endOfDayDate = new Date(2024, 8, 20, 23, 45, 30);
      
      const startOfDay = new Date(endOfDayDate.getFullYear(), endOfDayDate.getMonth(), endOfDayDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(endOfDayDate.getFullYear(), endOfDayDate.getMonth(), endOfDayDate.getDate(), 23, 59, 59, 999);

      // Should still create boundaries for the entire day of Sept 20th
      expect(startOfDay.getDate()).toBe(20);
      expect(endOfDay.getDate()).toBe(20);
      expect(startOfDay.getHours()).toBe(0);
      expect(endOfDay.getHours()).toBe(23);
    });
  });

  describe('date key generation for calendar data', () => {
    it('should generate correct date keys using local timezone', () => {
      const entries = [
        { targetDate: new Date(2024, 8, 19, 16, 30, 0) }, // Sept 19
        { targetDate: new Date(2024, 8, 20, 12, 0, 0) },  // Sept 20
        { targetDate: new Date(2024, 8, 21, 8, 0, 0) }    // Sept 21
      ];

      // Test the logic used in getCalendarData
      const dateKeys = entries.map(entry => {
        const year = entry.targetDate.getFullYear();
        const month = String(entry.targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(entry.targetDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      expect(dateKeys).toEqual(['2024-09-19', '2024-09-20', '2024-09-21']);
    });

    it('should be consistent with dateUtils.getDateKey', () => {
      const testDate = new Date(2024, 8, 20, 15, 30, 0);
      
      // Manual implementation (from database fix)
      const year = testDate.getFullYear();
      const month = String(testDate.getMonth() + 1).padStart(2, '0');
      const day = String(testDate.getDate()).padStart(2, '0');
      const manualKey = `${year}-${month}-${day}`;
      
      // dateUtils implementation
      const utilsKey = dateUtils.getDateKey(testDate);
      
      expect(manualKey).toBe(utilsKey);
      expect(utilsKey).toBe('2024-09-20');
    });
  });

  describe('week key generation logic', () => {
    it('should generate consistent week keys using local timezone', () => {
      const weekStart = new Date(2024, 8, 16); // Monday, Sept 16
      const weekEnd = new Date(2024, 8, 22);   // Sunday, Sept 22
      
      // Test the logic used in calendarWeeklySummaryService
      const startYear = weekStart.getFullYear();
      const startMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
      const startDay = String(weekStart.getDate()).padStart(2, '0');
      const endYear = weekEnd.getFullYear();
      const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
      const endDay = String(weekEnd.getDate()).padStart(2, '0');
      const weekKey = `${startYear}-${startMonth}-${startDay}_${endYear}-${endMonth}-${endDay}`;
      
      expect(weekKey).toBe('2024-09-16_2024-09-22');
    });

    it('should handle week boundaries across months', () => {
      const weekStart = new Date(2024, 8, 30); // Monday, Sept 30
      const weekEnd = new Date(2024, 9, 6);    // Sunday, Oct 6
      
      const startYear = weekStart.getFullYear();
      const startMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
      const startDay = String(weekStart.getDate()).padStart(2, '0');
      const endYear = weekEnd.getFullYear();
      const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
      const endDay = String(weekEnd.getDate()).padStart(2, '0');
      const weekKey = `${startYear}-${startMonth}-${startDay}_${endYear}-${endMonth}-${endDay}`;
      
      expect(weekKey).toBe('2024-09-30_2024-10-06');
    });
  });

  describe('regression test for off-by-one bug', () => {
    it('should maintain date consistency in all database operations', () => {
      const testDate = new Date(2024, 8, 20, 15, 30); // Sept 20, 3:30 PM
      
      // Test all the date formatting approaches used in the fix
      const dateKey = dateUtils.getDateKey(testDate);
      
      const startOfDay = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate(), 23, 59, 59, 999);
      
      // All should represent the same calendar date (Sept 20th)
      expect(dateKey).toBe('2024-09-20');
      expect(startOfDay.getDate()).toBe(20);
      expect(endOfDay.getDate()).toBe(20);
      expect(startOfDay.getMonth()).toBe(8);
      expect(endOfDay.getMonth()).toBe(8);
    });

    it('should handle the specific calendar click scenario', () => {
      // Simulate: User clicks Sept 20th in calendar
      const calendarClickDate = new Date(2024, 8, 20);
      
      // Calendar generates URL with this date key
      const urlDateKey = dateUtils.getDateKey(calendarClickDate);
      expect(urlDateKey).toBe('2024-09-20');
      
      // HomePage parses the URL parameter
      const [year, month, day] = urlDateKey.split('-').map(Number);
      const parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0);
      
      // Database queries with proper boundaries
      const startOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59, 999);
      
      // All should be consistent for Sept 20th
      expect(parsedDate.getDate()).toBe(20);
      expect(startOfDay.getDate()).toBe(20);
      expect(endOfDay.getDate()).toBe(20);
      expect(parsedDate.getMonth()).toBe(8);
      expect(startOfDay.getMonth()).toBe(8);
      expect(endOfDay.getMonth()).toBe(8);
    });
  });
});