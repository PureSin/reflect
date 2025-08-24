import React, { useState } from 'react';
import { Button } from './ui/button';
import { createDemoAnalysisData } from '../utils/demo-data';

const DemoDataGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateData = async () => {
    setIsGenerating(true);
    setError(null);
    setIsComplete(false);
    
    try {
      await createDemoAnalysisData();
      setIsComplete(true);
    } catch (err) {
      setError('Failed to generate demo data');
      console.error('Demo data generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        Demo Data Generator
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Generate AI analysis for existing entries to see the calendar features.
      </p>
      
      <Button
        onClick={handleGenerateData}
        disabled={isGenerating}
        variant="outline"
        size="sm"
      >
        {isGenerating ? 'Generating...' : 'Generate Demo Data'}
      </Button>
      
      {isComplete && (
        <div className="mt-2 text-sm text-green-600 dark:text-green-400">
          Demo data generated successfully! Refresh the page to see the changes.
        </div>
      )}
      
      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default DemoDataGenerator;
