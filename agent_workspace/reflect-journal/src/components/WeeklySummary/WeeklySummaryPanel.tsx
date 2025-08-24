import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import {
  Calendar as CalendarIcon,
  FileText,
  Brain,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { weeklySummaryManager } from '../../services/weeklySummaryManager';
import { WeeklySummary, WeeklySummaryAnalysis, WeeklySummaryStats } from '../../types/weekly.types';
import { dateUtils } from '../../lib/utils';
import { SENTIMENT_COLORS } from '../../types/ai.types';

interface WeeklySummaryPanelProps {
  className?: string;
  onSummaryGenerated?: (summary: WeeklySummary) => void;
}

interface WeekStatus {
  weekStart: Date;
  weekEnd: Date;
  entryCount: number;
  hasSummary: boolean;
}

export const WeeklySummaryPanel: React.FC<WeeklySummaryPanelProps> = ({
  className = '',
  onSummaryGenerated
}) => {
  const [stats, setStats] = useState<WeeklySummaryStats | null>(null);
  const [eligibleWeeks, setEligibleWeeks] = useState<WeekStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0, currentWeek: '' });
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null);
  const [currentSummary, setCurrentSummary] = useState<{ summary: WeeklySummary; analysis?: WeeklySummaryAnalysis } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load statistics
      const statsData = await weeklySummaryManager.getStatistics();
      setStats(statsData);
      
      // Load eligible weeks for the past 3 months
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      
      const weeks = await weeklySummaryManager.getEligibleWeeks(startDate, endDate);
      setEligibleWeeks(weeks);
      
    } catch (err) {
      console.error('Error loading weekly summary data:', err);
      setError('Failed to load weekly summary data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateWeekSummary = async (weekStart: Date) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await weeklySummaryManager.generateWeekSummary(weekStart);
      
      if (result) {
        setCurrentSummary(result);
        onSummaryGenerated?.(result.summary);
        
        // Refresh the data
        await loadData();
      } else {
        setError('Failed to generate weekly summary. Insufficient entries or processing error.');
      }
    } catch (err) {
      console.error('Error generating weekly summary:', err);
      setError('Error generating weekly summary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    try {
      setBatchProcessing(true);
      setError(null);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      
      const result = await weeklySummaryManager.batchGenerateSummaries(
        startDate,
        endDate,
        (completed, total, currentWeek) => {
          setBatchProgress({ completed, total, currentWeek });
        }
      );
      
      if (result.errors.length > 0) {
        setError(`Batch processing completed with ${result.failed} errors: ${result.errors.join(', ')}`);
      }
      
      // Refresh data
      await loadData();
      
    } catch (err) {
      console.error('Error in batch generation:', err);
      setError('Batch generation failed');
    } finally {
      setBatchProcessing(false);
      setBatchProgress({ completed: 0, total: 0, currentWeek: '' });
    }
  };

  const handleViewSummary = async (weekStart: Date) => {
    try {
      setIsLoading(true);
      const result = await weeklySummaryManager.getOrCreateWeeklySummary(weekStart);
      
      if (result) {
        setCurrentSummary(result);
        setSelectedWeek(weekStart);
      }
    } catch (err) {
      console.error('Error viewing summary:', err);
      setError('Failed to load weekly summary');
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    return SENTIMENT_COLORS[sentiment as keyof typeof SENTIMENT_COLORS] || '#6b7280';
  };

  const getProgressionBadgeColor = (progression: string) => {
    switch (progression) {
      case 'improving':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'declining':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'mixed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading weekly summaries...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-500" />
              Weekly Summary Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalWeeks}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Weeks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.averageHappiness.toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Happiness</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.averageWordCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Words</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.commonThemes.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Key Themes</div>
              </div>
            </div>
            
            {stats.commonThemes.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Top Themes:</div>
                <div className="flex flex-wrap gap-2">
                  {stats.commonThemes.slice(0, 5).map((theme, index) => (
                    <Badge key={index} variant="outline">
                      {theme.theme} ({theme.frequency})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Batch Generation Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2 text-green-500" />
            Generate Weekly Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Batch Generate Summaries</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Generate summaries for all eligible weeks (last 3 months)
                </div>
              </div>
              <Button 
                onClick={handleBatchGenerate}
                disabled={isBatchProcessing || isLoading}
                className="min-w-[120px]"
              >
                {isBatchProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                {isBatchProcessing ? 'Processing...' : 'Generate All'}
              </Button>
            </div>
            
            {isBatchProcessing && (
              <div className="space-y-2">
                <Progress value={(batchProgress.completed / batchProgress.total) * 100} />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {batchProgress.completed} of {batchProgress.total} weeks completed
                  {batchProgress.currentWeek && (
                    <span className="ml-2">• Currently processing: {batchProgress.currentWeek}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Eligible Weeks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2 text-blue-500" />
            Eligible Weeks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {eligibleWeeks.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No eligible weeks found. Write more journal entries to generate weekly summaries.
              </div>
            ) : (
              eligibleWeeks.map((week, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {week.hasSummary ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {dateUtils.formatDate(week.weekStart)} - {dateUtils.formatDate(week.weekEnd)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {week.entryCount} entries • {week.hasSummary ? 'Summary available' : 'No summary yet'}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {week.hasSummary ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewSummary(week.weekStart)}
                        disabled={isLoading}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleGenerateWeekSummary(week.weekStart)}
                        disabled={isLoading || isBatchProcessing}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Generate
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Summary Display */}
      {currentSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-emerald-500" />
              Weekly Summary
              {selectedWeek && (
                <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                  ({dateUtils.formatDate(selectedWeek)})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Text */}
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {currentSummary.summary.summary}
                </p>
              </div>
              
              {/* Analysis */}
              {currentSummary.analysis && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getSentimentColor(currentSummary.analysis.sentiment.sentiment) }}
                      />
                      <span className="text-sm font-medium">
                        {currentSummary.analysis.sentiment.sentiment.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1 text-emerald-500" />
                      <span className="text-sm font-medium">
                        {currentSummary.analysis.happiness.overallScore.toFixed(1)}/10
                      </span>
                    </div>
                    <Badge className={getProgressionBadgeColor(currentSummary.analysis.emotionalArc.progression)}>
                      {currentSummary.analysis.emotionalArc.progression}
                    </Badge>
                  </div>
                  
                  {currentSummary.analysis.weeklyThemes.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-1">Weekly Themes:</div>
                      <div className="flex flex-wrap gap-1">
                        {currentSummary.analysis.weeklyThemes.map((theme, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {currentSummary.analysis.growthAreas.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-1">Growth Areas:</div>
                      <div className="flex flex-wrap gap-1">
                        {currentSummary.analysis.growthAreas.map((area, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/30">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeeklySummaryPanel;
