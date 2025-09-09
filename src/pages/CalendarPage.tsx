import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from '../components/Calendar';
import BatchAnalysisButton from '../components/AI/BatchAnalysisButton';
import DemoDataGenerator from '../components/DemoDataGenerator';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Entry } from '../types';
import { BatchAnalysisResult } from '../types/dashboard.types';
import { dateUtils } from '../lib/utils';
import { Plus, BarChart } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();
  const calendarRef = useRef<any>(null);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Navigate to create new entry for this date
    navigate(`/entry/new?date=${dateUtils.getDateKey(date)}`);
  };

  const handleEntryClick = (entry: Entry) => {
    navigate(`/entry/${entry.id}`);
  };

  const handleBatchAnalysisComplete = (result: BatchAnalysisResult) => {
    console.log('Enhanced batch analysis completed:', result);
    
    // Show completion summary
    const dailyProcessed = result.dailyAnalysis.processedCount;
    const summariesGenerated = result.weeklySummaries.generatedCount;
    const totalErrors = result.dailyAnalysis.errors.length + result.weeklySummaries.errors.length;
    
    let message = `Analysis complete! `;
    if (dailyProcessed > 0) {
      message += `${dailyProcessed} entries analyzed. `;
    }
    if (summariesGenerated > 0) {
      message += `${summariesGenerated} weekly summaries generated. `;
    }
    if (totalErrors > 0) {
      message += `${totalErrors} errors occurred.`;
    }
    
    // Force calendar refresh to show new weekly summary indicators
    if (calendarRef.current && calendarRef.current.forceRefresh) {
      calendarRef.current.forceRefresh();
    }
    
    // You could show a toast notification here
    console.log(message);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Journal Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your writing journey and browse entries by date
            </p>
          </div>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Write Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          {/* Calendar */}
          <Calendar
            ref={calendarRef}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onEntryClick={handleEntryClick}
          />
        </div>
        
        <div>
          {/* Batch Analysis */}
          <BatchAnalysisButton 
            onAnalysisComplete={handleBatchAnalysisComplete} 
            className="mb-4"
          />
          
          {/* Demo Data Generator */}
          <DemoDataGenerator />
          
          {/* Dashboard Link */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <BarChart className="w-10 h-10 text-blue-500 shrink-0 mt-1" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Happiness Metrics Dashboard
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
                  Visualize your emotional patterns and insights from journal entries
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-white dark:bg-blue-950 border-blue-200 dark:border-blue-700"
                  onClick={() => navigate('/insights')}
                >
                  View Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-300 mb-2">
          How to use the calendar
        </h3>
        <ul className="text-emerald-800 dark:text-emerald-400 space-y-1">
          <li>• Click on any date to create a new entry or view existing ones</li>
          <li>• Hover over dates with entries to see a preview</li>
          <li>• Color intensity shows how much you wrote that day</li>
          <li>• Weekly summary indicators appear on Mondays - click to view/generate summaries</li>
          <li>• The flame icon shows your current writing streak</li>
          <li>• Use the Enhanced Analyze button to process both entries and weekly summaries</li>
        </ul>
      </div>
    </div>
  );
};

export default CalendarPage;