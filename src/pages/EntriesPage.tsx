import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Entry } from '../types';
import { dbService } from '../services/database';
import { dateUtils, textUtils } from '../lib/utils';
import { Search, Calendar, BookOpen, Clock, Tag, Sparkles } from 'lucide-react';

export const EntriesPage: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<'all' | 'tags' | 'fuzzy'>('all');
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const allEntries = await dbService.getAllEntries();
        setEntries(allEntries);
        setFilteredEntries(allEntries);
      } catch (error) {
        console.error('Failed to load entries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(entries);
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce search and suggestions
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        let results: Entry[];
        
        switch (searchMode) {
          case 'tags':
            const tags = searchQuery.split(' ').map(tag => tag.replace('#', ''));
            results = await dbService.searchEntriesByTags(tags);
            break;
          case 'fuzzy':
            results = await dbService.searchEntries(searchQuery, { fuzzy: true, suggest: true });
            break;
          default:
            results = await dbService.searchEntries(searchQuery, { suggest: true });
        }
        
        setFilteredEntries(results);
        
        // Get search suggestions
        if (searchMode !== 'tags') {
          const suggestions = await dbService.getSearchSuggestions(searchQuery);
          setSearchSuggestions(suggestions.slice(0, 5));
        }
      } catch (error) {
        console.error('Search failed:', error);
        setFilteredEntries([]);
        setSearchSuggestions([]);
      }
    }, 300);

    // Show suggestions if we have a query
    setShowSuggestions(searchQuery.trim().length > 0);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery, entries, searchMode]);

  const handleEntryClick = (entry: Entry) => {
    navigate(`/entry/${entry.id}`);
  };

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleSearchModeChange = (mode: 'all' | 'tags' | 'fuzzy') => {
    setSearchMode(mode);
    setShowSuggestions(false);
  };

  const handleSearchFocus = () => {
    if (searchQuery.trim() && searchSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading entries...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <BookOpen className="w-8 h-8 mr-3" />
              Journal Entries
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in your journal
            </p>
          </div>
          
          <button
            onClick={() => navigate('/calendar')}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendar View
          </button>
        </div>
      </div>

      {/* Enhanced Search */}
      <div className="mb-6">
        <div className="relative">
          <div className="flex space-x-2 mb-3">
            {/* Search Mode Buttons */}
            <button
              onClick={() => handleSearchModeChange('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                searchMode === 'all'
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Search className="w-3 h-3 inline mr-1" />
              All Content
            </button>
            <button
              onClick={() => handleSearchModeChange('tags')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                searchMode === 'tags'
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Tag className="w-3 h-3 inline mr-1" />
              Tags Only
            </button>
            <button
              onClick={() => handleSearchModeChange('fuzzy')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                searchMode === 'fuzzy'
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Sparkles className="w-3 h-3 inline mr-1" />
              Smart Search
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search entries... ${
                searchMode === 'tags' ? '(enter tag names)' :
                searchMode === 'fuzzy' ? '(smart/fuzzy search)' :
                '(full-text search)'
              }`}
              value={searchQuery}
              onChange={handleSearchQueryChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white"
            />
            
            {/* Search Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                <div className="p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggestions:</div>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {searchQuery && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''} found
              {searchMode === 'fuzzy' && ' (smart search enabled)'}
              {searchMode === 'tags' && ' (tag search)'}
            </div>
          )}
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'No entries found' : 'No entries yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Try a different search term' : 'Start writing to see your entries here'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Write First Entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => handleEntryClick(entry)}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 cursor-pointer transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dateUtils.formatDate(entry.targetDate)}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-3">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {dateUtils.formatTime(entry.created)}
                      </div>
                      <div>{entry.metadata.wordCount} words</div>
                      <div>{entry.metadata.readingTime} min read</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
                    {textUtils.truncate(entry.plainText, 200)}
                  </p>
                  
                  {entry.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {entry.metadata.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                      {entry.metadata.tags.length > 5 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          +{entry.metadata.tags.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EntriesPage;