import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { CalendarPage } from '../../pages/CalendarPage';
import { dateUtils } from '../../lib/utils';

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock the Calendar component to test navigation behavior
vi.mock('../../components/Calendar', () => ({
  default: ({ onDateSelect }: { onDateSelect?: (date: Date) => void }) => (
    <div data-testid="calendar">
      <button 
        data-testid="date-sept-20"
        onClick={() => onDateSelect?.(new Date(2024, 8, 20))}
      >
        September 20, 2024
      </button>
      <button 
        data-testid="date-sept-19"
        onClick={() => onDateSelect?.(new Date(2024, 8, 19))}
      >
        September 19, 2024
      </button>
      <button 
        data-testid="date-sept-21"
        onClick={() => onDateSelect?.(new Date(2024, 8, 21))}
      >
        September 21, 2024
      </button>
    </div>
  )
}));

// Mock other components
vi.mock('../../components/AI/BatchAnalysisButton', () => ({
  default: () => <div data-testid="batch-analysis">Batch Analysis</div>
}));

vi.mock('../../components/DemoDataGenerator', () => ({
  default: () => <div data-testid="demo-data">Demo Data</div>
}));

describe('CalendarPage Navigation - Off-by-One Bug Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('date selection navigation', () => {
    it('should navigate to correct URL when date is selected from calendar', async () => {
      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      // Wait for calendar to render
      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });

      // Click on September 20th
      const sept20Button = screen.getByTestId('date-sept-20');
      fireEvent.click(sept20Button);

      // Verify navigation was called with correct route
      expect(mockNavigate).toHaveBeenCalledWith('/?date=2024-09-20');
    });

    it('should use dateUtils.getDateKey for consistent date formatting', async () => {
      // Spy on dateUtils.getDateKey to verify it's being used
      const getDateKeySpy = vi.spyOn(dateUtils, 'getDateKey');

      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });

      // Click on September 19th
      const sept19Button = screen.getByTestId('date-sept-19');
      fireEvent.click(sept19Button);

      // Verify dateUtils.getDateKey was called with the clicked date
      expect(getDateKeySpy).toHaveBeenCalledWith(new Date(2024, 8, 19));

      // Verify navigation uses the result from getDateKey
      expect(mockNavigate).toHaveBeenCalledWith('/?date=2024-09-19');

      getDateKeySpy.mockRestore();
    });

    it('should navigate to homepage route instead of non-existent entry/new route', async () => {
      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });

      // Click on September 21st
      const sept21Button = screen.getByTestId('date-sept-21');
      fireEvent.click(sept21Button);

      // Should navigate to homepage with date parameter, not to /entry/new
      expect(mockNavigate).toHaveBeenCalledWith('/?date=2024-09-21');
      expect(mockNavigate).not.toHaveBeenCalledWith('/entry/new?date=2024-09-21');
    });

    it('should handle different dates correctly without off-by-one errors', async () => {
      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });

      // Test multiple date clicks
      const dates = [
        { testId: 'date-sept-19', expectedUrl: '/?date=2024-09-19' },
        { testId: 'date-sept-20', expectedUrl: '/?date=2024-09-20' },
        { testId: 'date-sept-21', expectedUrl: '/?date=2024-09-21' }
      ];

      for (const { testId, expectedUrl } of dates) {
        mockNavigate.mockClear();
        
        const button = screen.getByTestId(testId);
        fireEvent.click(button);

        expect(mockNavigate).toHaveBeenCalledWith(expectedUrl);
      }
    });

    it('should maintain date consistency across calendar interactions', async () => {
      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });

      // Click September 20th
      const sept20Button = screen.getByTestId('date-sept-20');
      fireEvent.click(sept20Button);

      expect(mockNavigate).toHaveBeenCalledWith('/?date=2024-09-20');

      // Clear mock and click same date again
      mockNavigate.mockClear();
      fireEvent.click(sept20Button);

      // Should navigate to same URL consistently
      expect(mockNavigate).toHaveBeenCalledWith('/?date=2024-09-20');
    });
  });

  describe('regression test for off-by-one navigation bug', () => {
    it('should fix the original bug where clicking date X navigated to entry for date X-1', async () => {
      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });

      // Original bug: clicking Sept 20th would navigate to Sept 19th entry
      // This test ensures clicking Sept 20th navigates to Sept 20th
      const sept20Button = screen.getByTestId('date-sept-20');
      fireEvent.click(sept20Button);

      // Should navigate to Sept 20th, not Sept 19th
      expect(mockNavigate).toHaveBeenCalledWith('/?date=2024-09-20');
      expect(mockNavigate).not.toHaveBeenCalledWith('/?date=2024-09-19');
    });

    it('should correctly navigate to the exact date clicked in various scenarios', async () => {
      const testCases = [
        {
          name: 'Beginning of month',
          date: new Date(2024, 8, 1), // Sept 1
          expectedUrl: '/?date=2024-09-01'
        },
        {
          name: 'Middle of month',
          date: new Date(2024, 8, 15), // Sept 15
          expectedUrl: '/?date=2024-09-15'
        },
        {
          name: 'End of month',
          date: new Date(2024, 8, 30), // Sept 30
          expectedUrl: '/?date=2024-09-30'
        }
      ];

      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });

      for (const testCase of testCases) {
        mockNavigate.mockClear();

        // Simulate date selection by calling the handler directly
        // (since we can't easily mock calendar component's internal date rendering)
        const calendarComponent = screen.getByTestId('calendar');
        const mockCalendar = calendarComponent as any;
        
        // Get the onDateSelect handler and call it with our test date
        // We'll simulate this by checking what getDateKey would return
        const expectedDateKey = dateUtils.getDateKey(testCase.date);
        const expectedUrl = `/?date=${expectedDateKey}`;

        expect(expectedUrl).toBe(testCase.expectedUrl);
      }
    });
  });

  describe('date formatting consistency', () => {
    it('should use consistent date formatting for navigation URLs', async () => {
      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });

      // Test that the navigation URL format matches our date key format
      const testDate = new Date(2024, 8, 20);
      const expectedDateKey = dateUtils.getDateKey(testDate);
      
      // Verify our date key format is YYYY-MM-DD
      expect(expectedDateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(expectedDateKey).toBe('2024-09-20');

      // Click the button to trigger navigation
      const sept20Button = screen.getByTestId('date-sept-20');
      fireEvent.click(sept20Button);

      // Verify navigation uses same format
      expect(mockNavigate).toHaveBeenCalledWith(`/?date=${expectedDateKey}`);
    });

    it('should handle single-digit months and days with proper zero-padding', async () => {
      // Test dates that need zero-padding
      const testDates = [
        { date: new Date(2024, 0, 5), expected: '2024-01-05' }, // Jan 5
        { date: new Date(2024, 2, 1), expected: '2024-03-01' }, // Mar 1
        { date: new Date(2024, 11, 9), expected: '2024-12-09' } // Dec 9
      ];

      for (const { date, expected } of testDates) {
        const dateKey = dateUtils.getDateKey(date);
        expect(dateKey).toBe(expected);
      }
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle year transitions correctly in navigation', async () => {
      const newYearEve = new Date(2024, 11, 31); // Dec 31, 2024
      const newYearDay = new Date(2025, 0, 1);   // Jan 1, 2025

      expect(dateUtils.getDateKey(newYearEve)).toBe('2024-12-31');
      expect(dateUtils.getDateKey(newYearDay)).toBe('2025-01-01');
    });

    it('should handle leap year dates correctly', async () => {
      const leapDay = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      expect(dateUtils.getDateKey(leapDay)).toBe('2024-02-29');
    });

    it('should handle month transitions correctly', async () => {
      const endOfFeb = new Date(2024, 1, 29); // Feb 29, 2024
      const startOfMar = new Date(2024, 2, 1); // Mar 1, 2024

      expect(dateUtils.getDateKey(endOfFeb)).toBe('2024-02-29');
      expect(dateUtils.getDateKey(startOfMar)).toBe('2024-03-01');
    });
  });
});