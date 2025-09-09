export interface Entry {
  id: string;
  content: string;
  plainText: string;
  created: Date;
  modified: Date;
  targetDate: Date; // The intended date for this journal entry
  metadata: {
    wordCount: number;
    readingTime: number;
    mood?: string;
    tags: string[];
  };
}

export interface UserPreferences {
  id: string;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  dailyPrompts: boolean;
  autoSave: boolean;
}

export interface CalendarEntry {
  date: string; // YYYY-MM-DD format
  hasEntry: boolean;
  wordCount: number;
  preview?: string;
}

export interface WritingPrompt {
  id: string;
  text: string;
  category: 'reflection' | 'gratitude' | 'challenge' | 'general';
}