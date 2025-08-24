import FlexSearch from 'flexsearch';
import { Entry } from '../types';

interface SearchIndex {
  id: string;
  content: string;
  plainText: string;
  title: string;
  tags: string;
  created: string;
}

export class SearchService {
  private index: any;
  private documentIndex: any;
  private entries: Map<string, Entry> = new Map();

  constructor() {
    // Create a simple index for quick searches
    this.index = new (FlexSearch as any).Index({
      tokenize: 'forward',
      resolution: 9
    });

    // Create a document index for complex searches  
    this.documentIndex = new (FlexSearch as any).Document({
      document: {
        id: 'id',
        index: ['content', 'plainText', 'title', 'tags'],
        store: true
      },
      tokenize: 'forward',
      resolution: 9
    });
  }

  /**
   * Add or update an entry in the search index
   */
  addEntry(entry: Entry): void {
    this.entries.set(entry.id, entry);
    
    // Add to simple index
    const searchText = `${entry.content} ${entry.plainText} ${entry.metadata.tags.join(' ')}`;
    this.index.add(entry.id, searchText);

    // Add to document index
    const searchDoc: SearchIndex = {
      id: entry.id,
      content: entry.content,
      plainText: entry.plainText,
      title: this.extractTitle(entry.content) || 'Untitled',
      tags: entry.metadata.tags.join(' '),
      created: entry.created.toISOString()
    };
    
    this.documentIndex.add(searchDoc);
  }

  /**
   * Remove an entry from the search index
   */
  removeEntry(entryId: string): void {
    this.entries.delete(entryId);
    this.index.remove(entryId);
    this.documentIndex.remove(entryId);
  }

  /**
   * Update an entry in the search index
   */
  updateEntry(entry: Entry): void {
    this.removeEntry(entry.id);
    this.addEntry(entry);
  }

  /**
   * Search entries with various options
   */
  async search(
    query: string, 
    options: {
      limit?: number;
      suggest?: boolean;
      fuzzy?: boolean;
      field?: keyof SearchIndex;
    } = {}
  ): Promise<Entry[]> {
    const { limit = 50, suggest = true, fuzzy = true, field } = options;
    
    if (!query.trim()) {
      return [];
    }

    let results: any[];

    if (field) {
      // Search in specific field
      results = await this.documentIndex.search(query, {
        index: [field],
        limit,
        suggest,
        ...(fuzzy && { enrich: true })
      });
    } else {
      // Search in all fields
      results = await this.documentIndex.search(query, {
        limit,
        suggest,
        ...(fuzzy && { enrich: true })
      });
    }

    // Extract entry IDs from results
    const entryIds = this.extractEntryIds(results);
    
    // Return matching entries
    return entryIds
      .map(id => this.entries.get(id))
      .filter((entry): entry is Entry => entry !== undefined)
      .slice(0, limit);
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query.trim()) {
      return [];
    }

    const suggestions = await this.index.search(query, {
      limit,
      suggest: true
    });

    return Array.isArray(suggestions) ? suggestions.slice(0, limit) : [];
  }

  /**
   * Search by tags
   */
  async searchByTags(tags: string[], limit: number = 50): Promise<Entry[]> {
    const tagQuery = tags.map(tag => `#${tag}`).join(' ');
    return this.search(tagQuery, { limit, field: 'tags' });
  }

  /**
   * Search by date range
   */
  async searchByDateRange(
    startDate: Date, 
    endDate: Date, 
    query?: string
  ): Promise<Entry[]> {
    const allEntries = Array.from(this.entries.values());
    
    let filteredEntries = allEntries.filter(entry => {
      const entryDate = new Date(entry.created);
      return entryDate >= startDate && entryDate <= endDate;
    });

    if (query) {
      const searchResults = await this.search(query);
      const searchIds = new Set(searchResults.map(e => e.id));
      filteredEntries = filteredEntries.filter(entry => searchIds.has(entry.id));
    }

    return filteredEntries.sort((a, b) => 
      new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }

  /**
   * Initialize the search index with existing entries
   */
  initializeIndex(entries: Entry[]): void {
    this.clear();
    entries.forEach(entry => this.addEntry(entry));
  }

  /**
   * Clear the entire search index
   */
  clear(): void {
    this.entries.clear();
    this.index.clear();
    this.documentIndex.clear();
  }

  /**
   * Get search statistics
   */
  getStats(): { totalEntries: number; indexSize: number } {
    return {
      totalEntries: this.entries.size,
      indexSize: this.entries.size // Approximation
    };
  }

  /**
   * Extract title from content (first heading or first line)
   */
  private extractTitle(content: string): string | null {
    // Try to find first heading
    const headingMatch = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // Fall back to first line of plain text
    const textMatch = content.match(/<p[^>]*>([^<]+)<\/p>/i);
    if (textMatch) {
      const firstLine = textMatch[1].trim();
      return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
    }

    return null;
  }

  /**
   * Extract entry IDs from FlexSearch results
   */
  private extractEntryIds(results: any[]): string[] {
    if (!Array.isArray(results)) {
      return [];
    }

    const ids: string[] = [];
    
    for (const result of results) {
      if (typeof result === 'string') {
        ids.push(result);
      } else if (result && typeof result === 'object') {
        if (result.result && Array.isArray(result.result)) {
          ids.push(...result.result);
        } else if (result.id) {
          ids.push(result.id);
        }
      }
    }

    return [...new Set(ids)]; // Remove duplicates
  }
}

// Create singleton instance
export const searchService = new SearchService();