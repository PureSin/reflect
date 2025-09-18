import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dateUtils } from '../../lib/utils';

describe('dateUtils - Date Off-by-One Bug Tests', () => {
  let originalTimezone: string;

  beforeEach(() => {
    // Store original timezone
    originalTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  afterEach(() => {
    // Reset any date mocks
  });

  describe('getDateKey', () => {
    it('should return correct date key in YYYY-MM-DD format for local timezone', () => {
      const date = new Date(2024, 8, 20, 15, 30, 0); // September 20, 2024, 3:30 PM local
      const result = dateUtils.getDateKey(date);
      expect(result).toBe('2024-09-20');
    });

    it('should handle dates at midnight without timezone shift', () => {
      const date = new Date(2024, 8, 20, 0, 0, 0, 0); // September 20, 2024, midnight local
      const result = dateUtils.getDateKey(date);
      expect(result).toBe('2024-09-20');
    });

    it('should handle dates at end of day without timezone shift', () => {
      const date = new Date(2024, 8, 20, 23, 59, 59, 999); // September 20, 2024, end of day local
      const result = dateUtils.getDateKey(date);
      expect(result).toBe('2024-09-20');
    });

    it('should maintain consistency across different times of the same day', () => {
      const morning = new Date(2024, 8, 20, 6, 0, 0);
      const noon = new Date(2024, 8, 20, 12, 0, 0);
      const evening = new Date(2024, 8, 20, 18, 0, 0);
      const lateNight = new Date(2024, 8, 20, 23, 59, 0);

      expect(dateUtils.getDateKey(morning)).toBe('2024-09-20');
      expect(dateUtils.getDateKey(noon)).toBe('2024-09-20');
      expect(dateUtils.getDateKey(evening)).toBe('2024-09-20');
      expect(dateUtils.getDateKey(lateNight)).toBe('2024-09-20');
    });

    it('should handle month boundaries correctly', () => {
      const endOfMonth = new Date(2024, 8, 30, 23, 59, 59); // September 30, 2024
      const startOfNextMonth = new Date(2024, 9, 1, 0, 0, 0); // October 1, 2024

      expect(dateUtils.getDateKey(endOfMonth)).toBe('2024-09-30');
      expect(dateUtils.getDateKey(startOfNextMonth)).toBe('2024-10-01');
    });

    it('should handle year boundaries correctly', () => {
      const endOfYear = new Date(2024, 11, 31, 23, 59, 59); // December 31, 2024
      const startOfNextYear = new Date(2025, 0, 1, 0, 0, 0); // January 1, 2025

      expect(dateUtils.getDateKey(endOfYear)).toBe('2024-12-31');
      expect(dateUtils.getDateKey(startOfNextYear)).toBe('2025-01-01');
    });

    it('should pad single digit months and days with zeros', () => {
      const singleDigits = new Date(2024, 0, 5, 12, 0, 0); // January 5, 2024
      expect(dateUtils.getDateKey(singleDigits)).toBe('2024-01-05');
    });

    it('should be consistent with Date constructor behavior', () => {
      // Test that our local date key matches what we expect from Date constructor
      const year = 2024;
      const month = 8; // September (0-indexed)
      const day = 20;
      
      const date = new Date(year, month, day);
      const expectedKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      expect(dateUtils.getDateKey(date)).toBe(expectedKey);
      expect(dateUtils.getDateKey(date)).toBe('2024-09-20');
    });

    // Test the specific bug scenario: timezone-sensitive date operations
    it('should not shift dates when converting Date objects created in different ways', () => {
      // Different ways to create the same date
      const dateFromConstructor = new Date(2024, 8, 20); // local timezone
      const dateFromISO = new Date('2024-09-20T12:00:00'); // will be interpreted in local timezone
      const dateFromString = new Date('September 20, 2024');

      const key1 = dateUtils.getDateKey(dateFromConstructor);
      const key2 = dateUtils.getDateKey(dateFromISO);
      const key3 = dateUtils.getDateKey(dateFromString);

      // All should produce the same date key regardless of how they were created
      expect(key1).toBe('2024-09-20');
      expect(key2).toBe('2024-09-20');
      expect(key3).toBe('2024-09-20');
    });

    // Regression test for the original bug
    it('should fix the original off-by-one issue with calendar dates', () => {
      // Simulate the scenario: user clicks Sept 20th in calendar
      const clickedDate = new Date(2024, 8, 20); // September 20, 2024
      const dateKey = dateUtils.getDateKey(clickedDate);
      
      // This should be Sept 20th, not Sept 19th (the original bug)
      expect(dateKey).toBe('2024-09-20');
      
      // If we parse this date key back into a Date, it should represent the same day
      const [year, month, day] = dateKey.split('-').map(Number);
      const parsedDate = new Date(year, month - 1, day);
      
      expect(parsedDate.getFullYear()).toBe(2024);
      expect(parsedDate.getMonth()).toBe(8); // September (0-indexed)
      expect(parsedDate.getDate()).toBe(20);
    });
  });

  describe('date consistency across utilities', () => {
    it('should maintain consistency between getDateKey and other date utilities', () => {
      const testDate = new Date(2024, 8, 20, 15, 30);
      
      const dateKey = dateUtils.getDateKey(testDate);
      const isToday = dateUtils.isToday(testDate);
      const formattedDate = dateUtils.formatDate(testDate);
      
      // All should be working with the same logical date
      expect(dateKey).toBe('2024-09-20');
      expect(typeof isToday).toBe('boolean');
      expect(formattedDate).toContain('September 20, 2024');
    });

    it('should maintain consistency between startOfDay, endOfDay and getDateKey', () => {
      const testDate = new Date(2024, 8, 20, 15, 30);
      
      const startOfDay = dateUtils.startOfDay(testDate);
      const endOfDay = dateUtils.endOfDay(testDate);
      const dateKey = dateUtils.getDateKey(testDate);
      
      // All should represent the same calendar date
      expect(dateUtils.getDateKey(startOfDay)).toBe(dateKey);
      expect(dateUtils.getDateKey(endOfDay)).toBe(dateKey);
      expect(dateKey).toBe('2024-09-20');
    });
  });
});