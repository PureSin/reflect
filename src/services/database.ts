import Dexie, { Table } from 'dexie';
import { Entry, UserPreferences } from '../types';
import { AIAnalysis } from '../types/ai.types';
import { WeeklySummary, WeeklySummaryAnalysis } from '../types/weekly.types';
import { searchService } from './searchService';

export class JournalDatabase extends Dexie {
  entries!: Table<Entry>;
  preferences!: Table<UserPreferences>;
  aiAnalyses!: Table<AIAnalysis>;
  weeklySummaries!: Table<WeeklySummary>;
  weeklySummaryAnalyses!: Table<WeeklySummaryAnalysis>;

  constructor() {
    super('ReflectJournal');
    
    this.version(1).stores({
      entries: 'id, created, modified, [metadata.wordCount]',
      preferences: 'id'
    });
    
    // Version 2 adds AI analyses table
    this.version(2).stores({
      entries: 'id, created, modified, [metadata.wordCount]',
      preferences: 'id',
      aiAnalyses: 'id, entryId, createdAt'
    });
    
    // Version 3 adds targetDate field for entries
    this.version(3).stores({
      entries: 'id, created, modified, targetDate, [metadata.wordCount]',
      preferences: 'id',
      aiAnalyses: 'id, entryId, createdAt'
    }).upgrade(tx => {
      // Migrate existing entries to have targetDate = created
      return tx.table('entries').toCollection().modify(entry => {
        entry.targetDate = entry.created;
      });
    });
    
    // Version 4 adds weekly summaries and analyses
    this.version(4).stores({
      entries: 'id, created, modified, targetDate, [metadata.wordCount]',
      preferences: 'id',
      aiAnalyses: 'id, entryId, createdAt',
      weeklySummaries: 'id, weekStartDate, weekEndDate, [year+weekNumber], createdAt',
      weeklySummaryAnalyses: 'id, weeklySummaryId, createdAt'
    });
  }
}

export const db = new JournalDatabase();

// Database service functions
export const dbService = {
  // Entry operations
  async createEntry(entry: Omit<Entry, 'id' | 'created' | 'modified' | 'targetDate'>, targetDate?: Date): Promise<Entry> {
    const now = new Date();
    const entryTargetDate = targetDate || now;
    const newEntry: Entry = {
      id: crypto.randomUUID(),
      created: now,
      modified: now,
      targetDate: entryTargetDate,
      ...entry
    };
    
    await db.entries.add(newEntry);
    
    // Add to search index
    searchService.addEntry(newEntry);
    
    return newEntry;
  },

  async updateEntry(id: string, updates: Partial<Omit<Entry, 'id' | 'created'>>): Promise<void> {
    await db.entries.update(id, {
      ...updates,
      modified: new Date()
    });
    
    // Update search index
    const updatedEntry = await this.getEntry(id);
    if (updatedEntry) {
      searchService.updateEntry(updatedEntry);
    }
  },

  async deleteEntry(id: string): Promise<void> {
    await db.entries.delete(id);
    
    // Remove from search index
    searchService.removeEntry(id);
  },

  async getEntry(id: string): Promise<Entry | undefined> {
    return await db.entries.get(id);
  },

  async getAllEntries(): Promise<Entry[]> {
    const entries = await db.entries.orderBy('targetDate').reverse().toArray();
    
    // Initialize search index if it's empty
    const stats = searchService.getStats();
    if (stats.totalEntries === 0 && entries.length > 0) {
      searchService.initializeIndex(entries);
    }
    
    return entries;
  },

  async getEntriesByDateRange(startDate: Date, endDate: Date): Promise<Entry[]> {
    return await db.entries
      .where('targetDate')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  async getEntryByDate(date: Date): Promise<Entry | undefined> {
    // Create proper local date boundaries to avoid timezone issues
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    
    // Use targetDate to find entries for the specific date
    const entries = await db.entries
      .where('targetDate')
      .between(startOfDay, endOfDay, true, true)
      .toArray();
    
    return entries[0]; // Return first entry for the day
  },

  async searchEntries(query: string, options?: {
    limit?: number;
    suggest?: boolean;
    fuzzy?: boolean;
  }): Promise<Entry[]> {
    if (!query.trim()) {
      return [];
    }
    
    // Use FlexSearch for advanced search
    return await searchService.search(query, options);
  },

  async searchEntriesByTags(tags: string[]): Promise<Entry[]> {
    return await searchService.searchByTags(tags);
  },

  async searchEntriesByDateRange(
    startDate: Date, 
    endDate: Date, 
    query?: string
  ): Promise<Entry[]> {
    return await searchService.searchByDateRange(startDate, endDate, query);
  },

  async getSearchSuggestions(query: string): Promise<string[]> {
    return await searchService.getSuggestions(query);
  },

  // Calendar data
  async getCalendarData(year: number, month: number): Promise<Map<string, { wordCount: number; preview: string; aiAnalysis?: AIAnalysis }>> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    // Use targetDate for calendar display instead of created
    const entries = await db.entries
      .where('targetDate')
      .between(startDate, endDate, true, true)
      .toArray();
      
    const calendarData = new Map<string, { wordCount: number; preview: string; aiAnalysis?: AIAnalysis }>();
    
    // Process each entry and fetch its AI analysis if available
    for (const entry of entries) {
      // Use local timezone for consistent date keys
      const year = entry.targetDate.getFullYear();
      const month = String(entry.targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(entry.targetDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const aiAnalysis = await this.getAIAnalysisForEntry(entry.id);
      
      calendarData.set(dateKey, {
        wordCount: entry.metadata.wordCount,
        preview: entry.plainText.substring(0, 100),
        aiAnalysis: aiAnalysis
      });
    }
    
    return calendarData;
  },

  // Streak calculation
  async getCurrentStreak(): Promise<number> {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    while (true) {
      // Check if there's an entry with targetDate for this day
      const entry = await this.getEntryByDate(currentDate);
      if (entry) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  },

  // Preferences
  async getPreferences(): Promise<UserPreferences> {
    const existing = await db.preferences.get('default');
    if (existing) {
      return existing;
    }
    
    // Default preferences
    const defaultPrefs: UserPreferences = {
      id: 'default',
      theme: 'auto',
      fontSize: 'medium',
      dailyPrompts: true,
      autoSave: true
    };
    
    await db.preferences.add(defaultPrefs);
    return defaultPrefs;
  },

  async updatePreferences(updates: Partial<Omit<UserPreferences, 'id'>>): Promise<void> {
    await db.preferences.update('default', updates);
  },

  // AI Analysis operations
  async saveAIAnalysis(analysis: Omit<AIAnalysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIAnalysis> {
    const now = new Date();
    const newAnalysis: AIAnalysis = {
      ...analysis,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    
    // Remove any existing analysis for this entry first
    await this.deleteAIAnalysisForEntry(analysis.entryId);
    
    await db.aiAnalyses.add(newAnalysis);
    return newAnalysis;
  },

  async getAIAnalysisForEntry(entryId: string): Promise<AIAnalysis | undefined> {
    return await db.aiAnalyses.where('entryId').equals(entryId).first();
  },

  async deleteAIAnalysisForEntry(entryId: string): Promise<void> {
    await db.aiAnalyses.where('entryId').equals(entryId).delete();
  },

  async getAllAIAnalyses(): Promise<AIAnalysis[]> {
    return await db.aiAnalyses.orderBy('createdAt').reverse().toArray();
  },

  async getAIAnalysesByDateRange(startDate: Date, endDate: Date): Promise<AIAnalysis[]> {
    return await db.aiAnalyses
      .where('createdAt')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  async getRecentAIAnalyses(limit: number = 10): Promise<AIAnalysis[]> {
    return await db.aiAnalyses.orderBy('createdAt').reverse().limit(limit).toArray();
  },

  // Export/Import
  async exportData(): Promise<{ entries: Entry[]; preferences: UserPreferences; aiAnalyses: AIAnalysis[]; weeklySummaries: WeeklySummary[]; weeklySummaryAnalyses: WeeklySummaryAnalysis[] }> {
    const entries = await this.getAllEntries();
    const preferences = await this.getPreferences();
    const aiAnalyses = await this.getAllAIAnalyses();
    const weeklySummaries = await this.getAllWeeklySummaries();
    const weeklySummaryAnalyses = await this.getAllWeeklySummaryAnalyses();
    return { entries, preferences, aiAnalyses, weeklySummaries, weeklySummaryAnalyses };
  },

  async importData(data: { entries: Entry[]; preferences?: UserPreferences; aiAnalyses?: AIAnalysis[]; weeklySummaries?: WeeklySummary[]; weeklySummaryAnalyses?: WeeklySummaryAnalysis[] }): Promise<void> {
    // Clear existing data
    await db.entries.clear();
    await db.aiAnalyses.clear();
    await db.weeklySummaries.clear();
    await db.weeklySummaryAnalyses.clear();
    
    // Import entries
    await db.entries.bulkAdd(data.entries);
    
    // Import AI analyses if provided
    if (data.aiAnalyses) {
      await db.aiAnalyses.bulkAdd(data.aiAnalyses);
    }
    
    // Import weekly summaries if provided
    if (data.weeklySummaries) {
      await db.weeklySummaries.bulkAdd(data.weeklySummaries);
    }
    
    // Import weekly summary analyses if provided
    if (data.weeklySummaryAnalyses) {
      await db.weeklySummaryAnalyses.bulkAdd(data.weeklySummaryAnalyses);
    }
    
    // Import preferences if provided
    if (data.preferences) {
      await db.preferences.put(data.preferences);
    }
    
    // Reinitialize search index with imported data
    searchService.initializeIndex(data.entries);
  },

  // Weekly Summary operations
  async saveWeeklySummary(summary: Omit<WeeklySummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeeklySummary> {
    const now = new Date();
    const newSummary: WeeklySummary = {
      ...summary,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    
    // Remove any existing summary for this week first
    await this.deleteWeeklySummaryByWeek(summary.weekStartDate, summary.weekEndDate);
    
    await db.weeklySummaries.add(newSummary);
    return newSummary;
  },

  async getWeeklySummary(id: string): Promise<WeeklySummary | undefined> {
    return await db.weeklySummaries.get(id);
  },

  async getWeeklySummaryByWeek(weekStartDate: Date, weekEndDate: Date): Promise<WeeklySummary | undefined> {
    return await db.weeklySummaries
      .where('weekStartDate')
      .equals(weekStartDate)
      .and(summary => summary.weekEndDate.getTime() === weekEndDate.getTime())
      .first();
  },

  async getWeeklySummariesByDateRange(startDate: Date, endDate: Date): Promise<WeeklySummary[]> {
    return await db.weeklySummaries
      .where('weekStartDate')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  async getAllWeeklySummaries(): Promise<WeeklySummary[]> {
    return await db.weeklySummaries.orderBy('weekStartDate').reverse().toArray();
  },

  async updateWeeklySummary(id: string, updates: Partial<Omit<WeeklySummary, 'id' | 'createdAt'>>): Promise<void> {
    await db.weeklySummaries.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  },

  async deleteWeeklySummary(id: string): Promise<void> {
    await db.weeklySummaries.delete(id);
    
    // Also delete associated analysis
    await db.weeklySummaryAnalyses.where('weeklySummaryId').equals(id).delete();
  },

  async deleteWeeklySummaryByWeek(weekStartDate: Date, weekEndDate: Date): Promise<void> {
    const existingSummary = await this.getWeeklySummaryByWeek(weekStartDate, weekEndDate);
    if (existingSummary) {
      await this.deleteWeeklySummary(existingSummary.id);
    }
  },

  // Weekly Summary Analysis operations
  async saveWeeklySummaryAnalysis(analysis: Omit<WeeklySummaryAnalysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeeklySummaryAnalysis> {
    const now = new Date();
    const newAnalysis: WeeklySummaryAnalysis = {
      ...analysis,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    
    // Remove any existing analysis for this weekly summary first
    await this.deleteWeeklySummaryAnalysisForSummary(analysis.weeklySummaryId);
    
    await db.weeklySummaryAnalyses.add(newAnalysis);
    return newAnalysis;
  },

  async getWeeklySummaryAnalysisForSummary(weeklySummaryId: string): Promise<WeeklySummaryAnalysis | undefined> {
    return await db.weeklySummaryAnalyses.where('weeklySummaryId').equals(weeklySummaryId).first();
  },

  async deleteWeeklySummaryAnalysisForSummary(weeklySummaryId: string): Promise<void> {
    await db.weeklySummaryAnalyses.where('weeklySummaryId').equals(weeklySummaryId).delete();
  },

  async getAllWeeklySummaryAnalyses(): Promise<WeeklySummaryAnalysis[]> {
    return await db.weeklySummaryAnalyses.orderBy('createdAt').reverse().toArray();
  },

  async getWeeklySummaryAnalysesByDateRange(startDate: Date, endDate: Date): Promise<WeeklySummaryAnalysis[]> {
    // Get weekly summaries in date range first, then get their analyses
    const summaries = await this.getWeeklySummariesByDateRange(startDate, endDate);
    const analyses: WeeklySummaryAnalysis[] = [];
    
    for (const summary of summaries) {
      const analysis = await this.getWeeklySummaryAnalysisForSummary(summary.id);
      if (analysis) {
        analyses.push(analysis);
      }
    }
    
    return analyses;
  },

  // Weekly utility functions
  getWeekBounds(date: Date): { weekStartDate: Date; weekEndDate: Date; weekNumber: number; year: number } {
    const d = new Date(date);
    
    // Get Monday of the week (ISO week starts on Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    // Get Sunday of the week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    // Calculate week number (ISO week)
    const yearStart = new Date(monday.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((monday.getTime() - yearStart.getTime()) / 86400000) + yearStart.getDay() + 1) / 7);
    
    return {
      weekStartDate: monday,
      weekEndDate: sunday,
      weekNumber,
      year: monday.getFullYear()
    };
  },

  async getWeeksWithEntries(startDate: Date, endDate: Date): Promise<Array<{ weekStart: Date; weekEnd: Date; entryCount: number; entries: Entry[] }>> {
    const entries = await this.getEntriesByDateRange(startDate, endDate);
    const weekMap = new Map<string, { weekStart: Date; weekEnd: Date; entries: Entry[] }>();
    
    entries.forEach(entry => {
      const { weekStartDate, weekEndDate } = this.getWeekBounds(entry.targetDate);
      // Use local timezone for consistent week keys
      const startYear = weekStartDate.getFullYear();
      const startMonth = String(weekStartDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(weekStartDate.getDate()).padStart(2, '0');
      const endYear = weekEndDate.getFullYear();
      const endMonth = String(weekEndDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(weekEndDate.getDate()).padStart(2, '0');
      const weekKey = `${startYear}-${startMonth}-${startDay}-${endYear}-${endMonth}-${endDay}`;
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekStart: weekStartDate,
          weekEnd: weekEndDate,
          entries: []
        });
      }
      
      weekMap.get(weekKey)!.entries.push(entry);
    });
    
    return Array.from(weekMap.values())
      .map(week => ({
        ...week,
        entryCount: week.entries.length
      }))
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }
};