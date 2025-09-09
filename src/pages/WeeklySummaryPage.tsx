import React from 'react';
import { WeeklySummaryPanel } from '../components/WeeklySummary';
import { WeeklySummary } from '../types/weekly.types';

export const WeeklySummaryPage: React.FC = () => {
  const handleSummaryGenerated = (summary: WeeklySummary) => {
    console.log('Weekly summary generated:', summary);
    // You could show a toast notification or update other UI elements here
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Weekly Summaries
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          AI-powered weekly summaries that combine your daily journal entries into insightful narratives
        </p>
      </div>

      {/* Weekly Summary Panel */}
      <WeeklySummaryPanel 
        onSummaryGenerated={handleSummaryGenerated}
        className=""
      />
      
      {/* Instructions */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
          How Weekly Summaries Work
        </h3>
        <ul className="text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Write at least 2 journal entries in a week to generate a summary</li>
          <li>• AI analyzes your entries to create a cohesive weekly narrative</li>
          <li>• Each summary includes emotional analysis and happiness metrics</li>
          <li>• Identify themes, growth areas, and emotional patterns over time</li>
          <li>• Use batch generation to create summaries for multiple weeks at once</li>
        </ul>
      </div>
    </div>
  );
};

export default WeeklySummaryPage;
