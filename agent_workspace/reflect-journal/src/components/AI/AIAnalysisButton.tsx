import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Brain, Loader2, Heart, TrendingUp, MessageCircle, Star, AlertCircle } from 'lucide-react';
import { useLLM } from '../../contexts/LLMContext';
import { sentimentService } from '../../services/sentimentService';
import { metricsService } from '../../services/metricsService';
import { dbService } from '../../services/database';
import { SentimentAnalysis, HappinessMetrics, SENTIMENT_COLORS, SENTIMENT_LABELS } from '../../types/ai.types';
import { Entry } from '../../types';

interface AIAnalysisButtonProps {
  entry: Entry;
  onAnalysisComplete?: (sentiment: SentimentAnalysis | null, metrics: HappinessMetrics | null) => void;
  className?: string;
}

export const AIAnalysisButton: React.FC<AIAnalysisButtonProps> = ({ 
  entry, 
  onAnalysisComplete, 
  className 
}) => {
  const { isModelReady } = useLLM();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<SentimentAnalysis | null>(null);
  const [metricsResult, setMetricsResult] = useState<HappinessMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Load existing analysis on component mount
  useEffect(() => {
    const loadExistingAnalysis = async () => {
      setLoadingExisting(true);
      try {
        const existingAnalysis = await dbService.getAIAnalysisForEntry(entry.id);
        if (existingAnalysis) {
          setSentimentResult(existingAnalysis.sentiment);
          setMetricsResult(existingAnalysis.happiness);
        }
      } catch (error) {
        console.error('Failed to load existing analysis:', error);
      } finally {
        setLoadingExisting(false);
      }
    };

    loadExistingAnalysis();
  }, [entry.id]);

  const handleAnalyze = async () => {
    if (!isModelReady) {
      setError('AI model not loaded. Please load the model first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Run both analyses in parallel
      const [sentiment, metrics] = await Promise.all([
        sentimentService.analyzeSentiment(entry),
        metricsService.calculateEntryMetrics(entry)
      ]);
      
      setSentimentResult(sentiment);
      setMetricsResult(metrics);
      
      // Save results to database if both analyses succeeded
      if (sentiment && metrics) {
        try {
          await dbService.saveAIAnalysis({
            entryId: entry.id,
            sentiment,
            happiness: metrics
          });
          console.log('AI analysis results saved to database');
        } catch (dbError) {
          console.error('Failed to save analysis results:', dbError);
          // Don't show error to user since the analysis itself succeeded
        }
      }
      
      onAnalysisComplete?.(sentiment, metrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      console.error('AI analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    return SENTIMENT_COLORS[sentiment as keyof typeof SENTIMENT_COLORS] || '#6b7280';
  };

  const renderSentimentResult = () => {
    if (!sentimentResult) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Sentiment Analysis</h4>
          <Badge 
            style={{ 
              backgroundColor: getSentimentColor(sentimentResult.sentiment) + '20',
              color: getSentimentColor(sentimentResult.sentiment)
            }}
          >
            {SENTIMENT_LABELS[sentimentResult.sentiment]}
          </Badge>
        </div>
        
        <div className="text-sm text-gray-600">
          <div className="flex justify-between mb-1">
            <span>Confidence:</span>
            <span>{Math.round(sentimentResult.confidence * 100)}%</span>
          </div>
          
          {sentimentResult.explanation && (
            <p className="mt-2 italic">"{sentimentResult.explanation}"</p>
          )}
          
          {sentimentResult.keywords.length > 0 && (
            <div className="mt-2">
              <span className="font-medium">Key emotions: </span>
              {sentimentResult.keywords.join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMetricsResult = () => {
    if (!metricsResult) return null;

    const dimensions = [
      { key: 'lifeEvaluation', label: 'Life Satisfaction', icon: Heart },
      { key: 'positiveAffect', label: 'Positive Emotions', icon: Star },
      { key: 'socialSupport', label: 'Social Connection', icon: MessageCircle },
      { key: 'personalGrowth', label: 'Growth & Purpose', icon: TrendingUp }
    ];

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Happiness Metrics</h4>
          <Badge variant="outline">
            Overall: {metricsResult.overallScore.toFixed(1)}/10
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {dimensions.map(({ key, label, icon: Icon }) => {
            const value = metricsResult[key as keyof typeof metricsResult] as number;
            return (
              <div key={key} className="flex items-center gap-1">
                <Icon className="w-3 h-3 text-gray-500" />
                <span className="truncate">{label}:</span>
                <span className="font-medium">{value.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
        
        {metricsResult.insights.length > 0 && (
          <div className="mt-2">
            <span className="font-medium text-xs">Insights:</span>
            <ul className="text-xs text-gray-600 mt-1 space-y-1">
              {metricsResult.insights.slice(0, 2).map((insight, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (!isModelReady) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="text-sm text-gray-500">
          <Brain className="w-4 h-4 inline mr-1" />
          Load the AI model to enable analysis
        </div>
      </div>
    );
  }

  if (loadingExisting) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading analysis...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        {!sentimentResult && !metricsResult && (
          <div className="text-center">
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {(sentimentResult || metricsResult) && (
          <div className="space-y-4">
            {renderSentimentResult()}
            {sentimentResult && metricsResult && <Separator />}
            {renderMetricsResult()}
            
            <div className="pt-2 border-t">
              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Brain className="w-3 h-3" />
                )}
                {isAnalyzing ? 'Re-analyzing...' : 'Re-analyze'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalysisButton;
