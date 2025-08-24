import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  Brain, 
  Loader2, 
  Play, 
  Square, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useLLM } from '../../contexts/LLMContext';
import { batchAnalysisService } from '../../services/batchAnalysisService';
import { BatchAnalysisProgress, BatchAnalysisResult } from '../../types/dashboard.types';
import { dateUtils } from '../../lib/utils';

interface BatchAnalysisButtonProps {
  onAnalysisComplete?: (result: BatchAnalysisResult) => void;
  className?: string;
}

interface EnhancedAnalysisStatistics {
  totalEntries: number;
  analyzedEntries: number;
  unanalyzedEntries: number;
  analysisRate: number;
  weeklySummaries: {
    totalEligibleWeeks: number;
    generatedSummaries: number;
    pendingSummaries: number;
    summaryRate: number;
  };
}

export const BatchAnalysisButton: React.FC<BatchAnalysisButtonProps> = ({ 
  onAnalysisComplete, 
  className 
}) => {
  const { isModelReady } = useLLM();
  const [progress, setProgress] = useState<BatchAnalysisProgress | null>(null);
  const [result, setResult] = useState<BatchAnalysisResult | null>(null);
  const [statistics, setStatistics] = useState<EnhancedAnalysisStatistics | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial statistics
  useEffect(() => {
    loadStatistics();
  }, []);

  // Set up progress callback
  useEffect(() => {
    batchAnalysisService.setProgressCallback(setProgress);
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await batchAnalysisService.getAnalysisStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load analysis statistics:', error);
    }
  };

  const handleStartAnalysis = async () => {
    if (!isModelReady) {
      setError('AI model not loaded. Please load the model first.');
      return;
    }

    try {
      setError(null);
      setResult(null);
      
      const analysisResult = await batchAnalysisService.analyzeAllEntries();
      setResult(analysisResult);
      
      // Refresh statistics after analysis
      await loadStatistics();
      
      onAnalysisComplete?.(analysisResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch analysis failed';
      setError(errorMessage);
      console.error('Batch analysis failed:', err);
    }
  };

  const handleStopAnalysis = () => {
    batchAnalysisService.stopBatchAnalysis();
  };

  const isRunning = progress?.isRunning ?? false;
  const totalPendingItems = (statistics?.unanalyzedEntries || 0) + (statistics?.weeklySummaries.pendingSummaries || 0);
  const hasWorkToDo = totalPendingItems > 0;
  
  // Calculate overall progress percentage
  const progressPercentage = progress ? 
    progress.total > 0 ? (progress.completed / progress.total) * 100 : 0 
    : 0;

  if (!isModelReady) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="text-center py-4">
            <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              AI Model Required
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Load the AI model to enable batch analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          AI Batch Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enhanced Statistics Display */}
        {statistics && (
          <div className="space-y-4">
            {/* Daily Analysis Statistics */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statistics.totalEntries}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total Entries
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {statistics.analyzedEntries}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Analyzed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {statistics.unanalyzedEntries}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Pending
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(statistics.analysisRate)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Complete
                </div>
              </div>
            </div>
            
            {/* Weekly Summary Statistics */}
            {statistics.weeklySummaries.totalEligibleWeeks > 0 && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {statistics.weeklySummaries.totalEligibleWeeks}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Eligible Weeks
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {statistics.weeklySummaries.generatedSummaries}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Summaries
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {statistics.weeklySummaries.pendingSummaries}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Pending
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(statistics.weeklySummaries.summaryRate)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Complete
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button 
              onClick={handleStartAnalysis}
              disabled={!hasWorkToDo}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {!hasWorkToDo 
                ? 'All Analysis Complete' 
                : `Analyze ${statistics?.unanalyzedEntries || 0} Entries` +
                  (statistics?.weeklySummaries.pendingSummaries ? ` + ${statistics.weeklySummaries.pendingSummaries} Summaries` : '')
              }
            </Button>
          ) : (
            <Button 
              onClick={handleStopAnalysis}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Analysis
            </Button>
          )}
          
          <Button 
            onClick={() => setShowDetails(!showDetails)}
            variant="outline"
            size="icon"
          >
            <TrendingUp className="w-4 h-4" />
          </Button>
        </div>

        {/* Enhanced Progress Display */}
        {progress && (
          <div className="space-y-4">
            {/* Phase Information */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Phase {progress.currentPhase === 'daily-analysis' ? 1 : progress.currentPhase === 'weekly-summaries' ? 2 : 3} of {progress.totalPhases}
              </span>
              <span className="text-gray-500">
                {progress.completed} / {progress.total}
              </span>
            </div>
            
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {progress.currentPhaseDescription}
            </div>
            
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
            
            {/* Current Item */}
            {progress.current && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isRunning ? 'Processing: ' : 'Last processed: '}
                <span className="font-medium">{progress.current}</span>
              </div>
            )}
            
            {/* Phase-specific Progress */}
            {progress.currentPhase === 'daily-analysis' && progress.dailyAnalysis.total > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Daily entries: {progress.dailyAnalysis.completed} / {progress.dailyAnalysis.total}
              </div>
            )}
            
            {progress.currentPhase === 'weekly-summaries' && progress.weeklySummaries.total > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Weekly summaries: {progress.weeklySummaries.completed} / {progress.weeklySummaries.total}
              </div>
            )}
            
            {/* Error Summary */}
            {progress.errors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                {progress.errors.length} error{progress.errors.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Results Display */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-green-900 dark:text-green-300">
                Analysis Complete
              </h4>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            
            {/* Daily Analysis Results */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="font-bold text-green-700 dark:text-green-300">
                  {result.dailyAnalysis.processedCount}
                </div>
                <div className="text-green-600 dark:text-green-400">Daily Processed</div>
              </div>
              
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                <div className="font-bold text-purple-700 dark:text-purple-300">
                  {result.weeklySummaries.generatedCount}
                </div>
                <div className="text-purple-600 dark:text-purple-400">Summaries</div>
              </div>
              
              <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <div className="font-bold text-red-700 dark:text-red-300">
                  {result.dailyAnalysis.errors.length + result.weeklySummaries.errors.length}
                </div>
                <div className="text-red-600 dark:text-red-400">Errors</div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Completed in {Math.round((result.endTime.getTime() - result.startTime.getTime()) / 1000)}s
              {result.weeklySummaries.totalEligibleWeeks > 0 && (
                <span className="ml-2">
                  • {result.weeklySummaries.analyzedCount} weekly analyses
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        {/* Enhanced Details Panel */}
        {showDetails && (
          <div className="border-t pt-4">
            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Details</h5>
            
            {/* Daily Analysis Errors */}
            {(result?.dailyAnalysis.errors.length > 0 || progress?.dailyAnalysis.errors.length > 0) && (
              <div className="mb-3">
                <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Daily Analysis Errors ({(result?.dailyAnalysis.errors.length || progress?.dailyAnalysis.errors.length || 0)})
                </h6>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {(result?.dailyAnalysis.errors || progress?.dailyAnalysis.errors || []).map((error, index) => (
                    <div key={index} className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/10 rounded">
                      {typeof error === 'string' ? error : `${error.entryTitle}: ${error.error}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Weekly Summary Errors */}
            {(result?.weeklySummaries.errors.length > 0 || progress?.weeklySummaries.errors.length > 0) && (
              <div>
                <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Weekly Summary Errors ({(result?.weeklySummaries.errors.length || progress?.weeklySummaries.errors.length || 0)})
                </h6>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {(result?.weeklySummaries.errors || progress?.weeklySummaries.errors || []).map((error, index) => (
                    <div key={index} className="text-sm text-purple-600 dark:text-purple-400 p-2 bg-purple-50 dark:bg-purple-900/10 rounded">
                      {typeof error === 'string' ? error : `${dateUtils.formatDate(error.weekStart)}: ${error.error}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* No Errors */}
            {!result?.dailyAnalysis.errors.length && !result?.weeklySummaries.errors.length && 
             !progress?.dailyAnalysis.errors.length && !progress?.weeklySummaries.errors.length && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No errors to display
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchAnalysisButton;
