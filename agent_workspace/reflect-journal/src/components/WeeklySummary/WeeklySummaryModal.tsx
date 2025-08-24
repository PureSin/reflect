import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import {
  Calendar as CalendarIcon,
  FileText,
  Brain,
  TrendingUp,
  Heart,
  Activity,
  Users,
  Sparkles,
  BookOpen,
  X,
  RefreshCw,
  AlertCircle,
  Plus
} from 'lucide-react';
import { WeeklySummary, WeeklySummaryAnalysis } from '../../types/weekly.types';
import { calendarWeeklySummaryService } from '../../services/calendarWeeklySummaryService';
import { dateUtils } from '../../lib/utils';
import { SENTIMENT_COLORS } from '../../types/ai.types';

interface WeeklySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: Date;
  weekEnd: Date;
  entryCount: number;
  onSummaryGenerated?: (summary: WeeklySummary) => void;
}

export const WeeklySummaryModal: React.FC<WeeklySummaryModalProps> = ({
  isOpen,
  onClose,
  weekStart,
  weekEnd,
  entryCount,
  onSummaryGenerated
}) => {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [analysis, setAnalysis] = useState<WeeklySummaryAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing summary when modal opens
  useEffect(() => {
    if (isOpen) {
      loadWeeklySummary();
    }
  }, [isOpen, weekStart, weekEnd]);

  const loadWeeklySummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await calendarWeeklySummaryService.getOrCreateWeeklySummaryForWeek(
        weekStart,
        weekEnd
      );
      
      if (result) {
        setSummary(result.summary);
        setAnalysis(result.analysis || null);
      } else {
        setSummary(null);
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Error loading weekly summary:', err);
      setError('Failed to load weekly summary');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const result = await calendarWeeklySummaryService.getOrCreateWeeklySummaryForWeek(
        weekStart,
        weekEnd
      );
      
      if (result) {
        setSummary(result.summary);
        setAnalysis(result.analysis || null);
        onSummaryGenerated?.(result.summary);
      } else {
        setError('Failed to generate weekly summary. Insufficient entries or processing error.');
      }
    } catch (err) {
      console.error('Error generating weekly summary:', err);
      setError('Error generating weekly summary');
    } finally {
      setIsGenerating(false);
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

  const weekRange = `${dateUtils.formatDate(weekStart)} - ${dateUtils.formatDate(weekEnd)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-blue-500" />
              Weekly Summary
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Week Info Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">{weekRange}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {entryCount} journal entries this week
                    {summary && (
                      <span className="ml-2">• {summary.wordCount} words in summary</span>
                    )}
                  </div>
                </div>
                
                {!summary && entryCount >= 2 && (
                  <Button 
                    onClick={generateSummary}
                    disabled={isGenerating || isLoading}
                    className="min-w-[140px]"
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate Summary'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading weekly summary...</span>
            </div>
          )}

          {/* Error State */}
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

          {/* No Summary Available */}
          {!isLoading && !summary && entryCount < 2 && (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Insufficient Entries</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  At least 2 journal entries are required to generate a weekly summary.
                  This week has {entryCount} entries.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Summary Content */}
          {summary && !isLoading && (
            <div className="space-y-6">
              {/* Summary Text */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <FileText className="w-5 h-5 mr-2 text-emerald-500" />
                    <h3 className="text-lg font-semibold">Weekly Narrative</h3>
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {summary.summary}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    Generated on {dateUtils.formatDate(summary.createdAt)}
                  </div>
                </CardContent>
              </Card>

              {/* Analysis */}
              {analysis && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <Brain className="w-5 h-5 mr-2 text-purple-500" />
                      <h3 className="text-lg font-semibold">AI Analysis</h3>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Quick Metrics */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: getSentimentColor(analysis.sentiment.sentiment) }}
                          />
                          <span className="text-sm font-medium capitalize">
                            {analysis.sentiment.sentiment.replace('-', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1 text-emerald-500" />
                          <span className="text-sm font-medium">
                            {analysis.happiness.overallScore.toFixed(1)}/10 Overall Happiness
                          </span>
                        </div>
                        
                        <Badge className={getProgressionBadgeColor(analysis.emotionalArc.progression)}>
                          {analysis.emotionalArc.progression} progression
                        </Badge>
                      </div>

                      {/* Detailed Happiness Metrics */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Happiness Breakdown</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="flex items-center">
                            <Activity className="w-4 h-4 mr-2 text-blue-500" />
                            <div className="text-sm">
                              <div className="font-medium">Life Evaluation</div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {analysis.happiness.lifeEvaluation.toFixed(1)}/10
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                            <div className="text-sm">
                              <div className="font-medium">Positive Affect</div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {analysis.happiness.positiveAffect.toFixed(1)}/10
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <Heart className="w-4 h-4 mr-2 text-red-500" />
                            <div className="text-sm">
                              <div className="font-medium">Stress Level</div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {analysis.happiness.negativeAffect.toFixed(1)}/10
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-green-500" />
                            <div className="text-sm">
                              <div className="font-medium">Social Support</div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {analysis.happiness.socialSupport.toFixed(1)}/10
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-2 text-indigo-500" />
                            <div className="text-sm">
                              <div className="font-medium">Personal Growth</div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {analysis.happiness.personalGrowth.toFixed(1)}/10
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Weekly Themes */}
                      {analysis.weeklyThemes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Weekly Themes</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.weeklyThemes.map((theme, index) => (
                              <Badge key={index} variant="outline">
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Growth Areas */}
                      {analysis.growthAreas.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Growth Areas</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.growthAreas.map((area, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className="bg-purple-50 text-purple-700 dark:bg-purple-900/30"
                              >
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Emotional Arc */}
                      {analysis.emotionalArc.description && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Emotional Journey</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {analysis.emotionalArc.description}
                          </p>
                          {analysis.emotionalArc.keyMoments.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1">Key Moments:</div>
                              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                {analysis.emotionalArc.keyMoments.map((moment, index) => (
                                  <li key={index}>• {moment}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklySummaryModal;
