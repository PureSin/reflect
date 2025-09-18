import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { HomePage } from '../../pages/HomePage';
import { dbService } from '../../services/database';
import { Entry } from '../../types';

// Mock the database service
vi.mock('../../services/database', () => ({
  dbService: {
    getEntryByDate: vi.fn(),
  }
}));

// Mock the LLM context
vi.mock('../../contexts/LLMContext', () => ({
  useLLM: () => ({
    isModelReady: false
  })
}));

// Mock the Editor component
vi.mock('../../components/Editor', () => ({
  default: ({ targetDate }: { targetDate?: Date }) => (
    <div data-testid="editor">
      {targetDate && (
        <div data-testid="target-date">
          {targetDate.toISOString()}
        </div>
      )}
    </div>
  )
}));

// Mock the AI components
vi.mock('../../components/AI', () => ({
  AIAnalysisButton: () => <div data-testid="ai-analysis">AI Analysis</div>
}));

describe('HomePage Date Parameter Parsing - Off-by-One Bug Tests', () => {
  let mockEntry: Entry;

  beforeEach(() => {
    mockEntry = {
      id: '1',
      content: '<p>Test entry content</p>',
      plainText: 'Test entry content',
      created: new Date(2024, 8, 20, 10, 0, 0),
      modified: new Date(2024, 8, 20, 10, 0, 0),
      targetDate: new Date(2024, 8, 20, 12, 0, 0),
      metadata: {
        wordCount: 100,
        readingTime: 1,
        tags: []
      }
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('URL date parameter parsing', () => {
    it('should parse date parameter correctly from URL and display correct date', async () => {
      // Mock database to return entry for Sept 20th
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(mockEntry);

      // Render with date parameter in URL
      render(
        <MemoryRouter initialEntries={['/?date=2024-09-20']}>
          <HomePage />
        </MemoryRouter>
      );

      // Wait for async loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Verify the correct date is displayed in the title
      expect(screen.getByText('September 20, 2024')).toBeInTheDocument();

      // Verify database was called with correct date
      const callArgs = vi.mocked(dbService.getEntryByDate).mock.calls[0][0];
      expect(callArgs.getFullYear()).toBe(2024);
      expect(callArgs.getMonth()).toBe(8); // September
      expect(callArgs.getDate()).toBe(20);
      expect(callArgs.getHours()).toBe(12); // noon
    });

    it('should handle date parameter without timezone shift', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      render(
        <MemoryRouter initialEntries={['/?date=2025-09-20']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should show Sept 20th, 2025 - not shifted to Sept 19th or 21st
      expect(screen.getByText('September 20, 2025')).toBeInTheDocument();

      // Verify database was queried for the correct date
      const callArgs = vi.mocked(dbService.getEntryByDate).mock.calls[0][0];
      expect(callArgs.getFullYear()).toBe(2025);
      expect(callArgs.getMonth()).toBe(8); // September
      expect(callArgs.getDate()).toBe(20);
    });

    it('should pass correct targetDate prop to Editor component', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      render(
        <MemoryRouter initialEntries={['/?date=2024-09-20']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('editor')).toBeInTheDocument();
      });

      // Verify Editor receives correct targetDate
      const targetDateElement = screen.getByTestId('target-date');
      const targetDateString = targetDateElement.textContent;
      
      // Parse the ISO string and verify it represents Sept 20th
      const targetDate = new Date(targetDateString!);
      expect(targetDate.getFullYear()).toBe(2024);
      expect(targetDate.getMonth()).toBe(8); // September
      expect(targetDate.getDate()).toBe(20);
    });

    it('should handle month boundaries in date parameters correctly', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      // Test end of month
      render(
        <MemoryRouter initialEntries={['/?date=2024-09-30']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('September 30, 2024')).toBeInTheDocument();

      const callArgs = vi.mocked(dbService.getEntryByDate).mock.calls[0][0];
      expect(callArgs.getMonth()).toBe(8); // September
      expect(callArgs.getDate()).toBe(30);
    });

    it('should handle year boundaries in date parameters correctly', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      // Test New Year's Eve
      render(
        <MemoryRouter initialEntries={['/?date=2024-12-31']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('December 31, 2024')).toBeInTheDocument();

      const callArgs = vi.mocked(dbService.getEntryByDate).mock.calls[0][0];
      expect(callArgs.getFullYear()).toBe(2024);
      expect(callArgs.getMonth()).toBe(11); // December
      expect(callArgs.getDate()).toBe(31);
    });

    it('should default to today when no date parameter is provided', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      const today = new Date();

      render(
        <MemoryRouter initialEntries={['/']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should show today's date
      const expectedDateString = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(today);

      expect(screen.getByText(expectedDateString)).toBeInTheDocument();

      // Verify database was called with today's date
      const callArgs = vi.mocked(dbService.getEntryByDate).mock.calls[0][0];
      expect(callArgs.getDate()).toBe(today.getDate());
      expect(callArgs.getMonth()).toBe(today.getMonth());
      expect(callArgs.getFullYear()).toBe(today.getFullYear());
    });

    it('should handle malformed date parameters gracefully', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      // Test with malformed date parameter
      render(
        <MemoryRouter initialEntries={['/?date=invalid-date']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should fall back to today when date parsing fails
      // Verify database was called with today's date
      const callArgs = vi.mocked(dbService.getEntryByDate).mock.calls[0][0];
      const today = new Date();
      expect(callArgs.getDate()).toBe(today.getDate());
      expect(callArgs.getMonth()).toBe(today.getMonth());
      expect(callArgs.getFullYear()).toBe(today.getFullYear());
    });
  });

  describe('regression test for calendar navigation bug', () => {
    it('should display the exact date that was clicked in calendar', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      // Simulate: User clicked Sept 20th in calendar
      // Should navigate to /?date=2024-09-20 and show Sept 20th page
      render(
        <MemoryRouter initialEntries={['/?date=2024-09-20']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // The bug was: clicking Sept 20th would show Sept 19th
      // This test ensures Sept 20th shows Sept 20th
      expect(screen.getByText('September 20, 2024')).toBeInTheDocument();
      expect(screen.queryByText('September 19, 2024')).not.toBeInTheDocument();
      expect(screen.queryByText('September 21, 2024')).not.toBeInTheDocument();
    });

    it('should create entries for the correct date when coming from calendar', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      render(
        <MemoryRouter initialEntries={['/?date=2024-09-20']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('editor')).toBeInTheDocument();
      });

      // Verify Editor gets the correct targetDate for new entries
      const targetDateElement = screen.getByTestId('target-date');
      const targetDate = new Date(targetDateElement.textContent!);
      
      // Entry should be created for Sept 20th, not shifted date
      expect(targetDate.getFullYear()).toBe(2024);
      expect(targetDate.getMonth()).toBe(8); // September
      expect(targetDate.getDate()).toBe(20);
    });

    it('should maintain date consistency across page reloads', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(mockEntry);

      // First render - user navigates to Sept 20th
      const { rerender } = render(
        <MemoryRouter initialEntries={['/?date=2024-09-20']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('September 20, 2024')).toBeInTheDocument();
      });

      // Simulate page reload (re-render with same URL)
      rerender(
        <MemoryRouter initialEntries={['/?date=2024-09-20']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('September 20, 2024')).toBeInTheDocument();
      });

      // Should still show Sept 20th after reload
      const callArgs = vi.mocked(dbService.getEntryByDate).mock.calls[0][0];
      expect(callArgs.getFullYear()).toBe(2024);
      expect(callArgs.getMonth()).toBe(8); // September
      expect(callArgs.getDate()).toBe(20);
    });
  });

  describe('timezone edge cases', () => {
    it('should handle dates near DST transitions correctly', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      // Test a date near potential DST transition (varies by timezone)
      render(
        <MemoryRouter initialEntries={['/?date=2024-03-10']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('March 10, 2024')).toBeInTheDocument();

      const callArgs = vi.mocked(dbService.getEntryByDate).mock.calls[0][0];
      expect(callArgs.getMonth()).toBe(2); // March
      expect(callArgs.getDate()).toBe(10);
    });

    it('should handle midnight times correctly across different timezones', async () => {
      vi.mocked(dbService.getEntryByDate).mockResolvedValue(undefined);

      render(
        <MemoryRouter initialEntries={['/?date=2024-09-20']}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('editor')).toBeInTheDocument();
      });

      // Our parsing creates dates at noon to avoid timezone edge cases
      const targetDateElement = screen.getByTestId('target-date');
      const targetDate = new Date(targetDateElement.textContent!);
      
      // Should be at noon (12:00), not midnight
      expect(targetDate.getHours()).toBe(12);
      expect(targetDate.getMinutes()).toBe(0);
      expect(targetDate.getSeconds()).toBe(0);
    });
  });
});