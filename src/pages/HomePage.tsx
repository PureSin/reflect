import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '../components/Editor';
import { AIAnalysisButton } from '../components/AI';
import { useLLM } from '../contexts/LLMContext';
import { dbService } from '../services/database';
import { Entry } from '../types';
import { dateUtils } from '../lib/utils';
import { Calendar, BookOpen } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [currentEntry, setCurrentEntry] = useState<Entry | undefined>();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isModelReady } = useLLM();
  
  // Get target date from URL params or default to today
  const getTargetDate = (): Date => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      // Parse YYYY-MM-DD format and ensure we stay in local timezone
      const [year, month, day] = dateParam.split('-').map(Number);
      
      // Validate the parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return new Date(); // fallback to today if parsing fails
      }
      
      // Create date at noon local time to avoid any timezone edge cases
      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
      
      // Check if the created date is valid
      if (isNaN(date.getTime())) {
        return new Date(); // fallback to today if date is invalid
      }
      
      return date;
    }
    return new Date(); // default to today
  };
  
  const targetDate = getTargetDate();

  useEffect(() => {
    const loadEntry = async () => {
      try {
        const entry = await dbService.getEntryByDate(targetDate);
        setCurrentEntry(entry);
      } catch (error) {
        console.error('Failed to load entry:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [targetDate]);

  const handleSave = (entry: Entry) => {
    setCurrentEntry(entry);
  };

  const handleAnalysisComplete = (sentiment: any, metrics: any) => {
    console.log('AI Analysis completed on Today view:', { sentiment, metrics });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {dateUtils.formatDate(targetDate)}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {currentEntry ? 'Continue writing your thoughts...' : 'Start your daily reflection...'}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/entries')}
              className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              All Entries
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <Editor
          entry={currentEntry}
          targetDate={targetDate}
          onSave={handleSave}
        />
      </div>

      {/* AI Analysis - Only show for saved entries */}
      {currentEntry && (
        <div className="mb-6">
          <AIAnalysisButton 
            entry={currentEntry}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </div>
      )}
      
      {/* Show informational message if conditions aren't met */}
      {(!currentEntry || !isModelReady) && (
        <div className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {!currentEntry && "Save your journal entry to enable AI analysis"}
            {currentEntry && !isModelReady && "Load the AI model in Settings to enable analysis"}
          </p>
          {!isModelReady && (
            <button
              onClick={() => navigate('/settings')}
              className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Go to Settings
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;