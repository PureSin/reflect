import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, RefreshCcw, Download, 
  Filter, Heart, Activity, Users, BookOpen, Sparkles
} from 'lucide-react';
import { chartDataService } from '../services/chartDataService';
import { dateUtils } from '../lib/utils';

// Time range options
const timeRangeOptions = [
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'quarter', label: 'Last 90 Days' },
  { value: 'half-year', label: 'Last 180 Days' },
  { value: 'year', label: 'Last 365 Days' },
] as const;

type TimeRangePeriod = typeof timeRangeOptions[number]['value'];

interface ChartData {
  date: string;
  dateObj: Date;
  overallScore: number;
  lifeEvaluation: number;
  positiveAffect: number;
  negativeAffect: number;
  socialSupport: number;
  personalGrowth: number;
  entryId: string;
  entryTitle: string;
}

interface StatsData {
  overallScore: { avg: number; min: number; max: number; trend: 'improving' | 'declining' | 'stable' };
  lifeEvaluation: { avg: number; min: number; max: number; trend: 'improving' | 'declining' | 'stable' };
  positiveAffect: { avg: number; min: number; max: number; trend: 'improving' | 'declining' | 'stable' };
  negativeAffect: { avg: number; min: number; max: number; trend: 'improving' | 'declining' | 'stable' };
  socialSupport: { avg: number; min: number; max: number; trend: 'improving' | 'declining' | 'stable' };
  personalGrowth: { avg: number; min: number; max: number; trend: 'improving' | 'declining' | 'stable' };
}

const InsightsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRangePeriod>('month');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load chart data when timeRange changes
  useEffect(() => {
    loadChartData();
  }, [timeRange]);
  
  const loadChartData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const end = new Date();
      let start = new Date();
      
      switch (timeRange) {
        case 'week':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'half-year':
          start = new Date(end.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
      
      const data = await chartDataService.getAIAnalysisChartData({ start, end });
      setChartData(data.chartData);
      setStats(data.stats);
      setTotalEntries(data.totalEntries);
    } catch (err) {
      console.error('Failed to load chart data:', err);
      setError('Could not load insights data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const formatTooltipValue = (value: number, name: string) => {
    const labels: Record<string, string> = {
      overallScore: 'Overall Score',
      lifeEvaluation: 'Life Satisfaction',
      positiveAffect: 'Positive Emotions',
      negativeAffect: 'Stress Level',
      socialSupport: 'Social Connection',
      personalGrowth: 'Personal Growth'
    };
    return [value.toFixed(1), labels[name] || name];
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">
          Loading AI Analysis Trends
        </div>
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Analysis Trends
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your emotional metrics and happiness scores over time
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={loadChartData}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>
      
      {/* Time Range Selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {timeRangeOptions.map((option) => (
          <Button
            key={option.value}
            variant={timeRange === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(option.value)}
          >
            {option.label}
          </Button>
        ))}
        
        <div className="ml-auto text-sm text-gray-500 dark:text-gray-400 flex items-center">
          <span>
            {totalEntries} analyzed entries
          </span>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      
      {chartData.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <Heart className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No AI Analysis Data Available</h3>
            <p>Start analyzing your journal entries to see emotional trends and happiness metrics.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overall Metrics Summary */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center">
                    <Heart className="w-5 h-5 mr-2 text-red-500" />
                    Overall Happiness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-bold text-emerald-600">
                        {stats.overallScore.avg}
                      </div>
                      <div className="text-lg text-gray-500">/10</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(stats.overallScore.trend)}
                      <span className={`text-sm ${getTrendColor(stats.overallScore.trend)}`}>
                        {stats.overallScore.trend}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Range: {stats.overallScore.min} - {stats.overallScore.max}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-500" />
                    Social Connection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-bold text-blue-600">
                        {stats.socialSupport.avg}
                      </div>
                      <div className="text-lg text-gray-500">/10</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(stats.socialSupport.trend)}
                      <span className={`text-sm ${getTrendColor(stats.socialSupport.trend)}`}>
                        {stats.socialSupport.trend}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Range: {stats.socialSupport.min} - {stats.socialSupport.max}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-purple-500" />
                    Personal Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-bold text-purple-600">
                        {stats.personalGrowth.avg}
                      </div>
                      <div className="text-lg text-gray-500">/10</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(stats.personalGrowth.trend)}
                      <span className={`text-sm ${getTrendColor(stats.personalGrowth.trend)}`}>
                        {stats.personalGrowth.trend}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Range: {stats.personalGrowth.min} - {stats.personalGrowth.max}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Overall Happiness Score Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-500" />
                Overall Happiness Score Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="date" 
                      className="text-gray-600 dark:text-gray-400"
                      fontSize={12}
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      className="text-gray-600 dark:text-gray-400"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--background)', 
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }}
                      formatter={formatTooltipValue}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="overallScore" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#ef4444' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Individual Dimension Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Life Evaluation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Activity className="w-5 h-5 mr-2 text-emerald-500" />
                  Life Satisfaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 10]} fontSize={12} />
                      <Tooltip formatter={formatTooltipValue} />
                      <Line 
                        type="monotone" 
                        dataKey="lifeEvaluation" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {stats && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Avg: {stats.lifeEvaluation.avg}/10
                    </span>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(stats.lifeEvaluation.trend)}
                      <span className={getTrendColor(stats.lifeEvaluation.trend)}>
                        {stats.lifeEvaluation.trend}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Positive Affect */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Sparkles className="w-5 h-5 mr-2 text-amber-500" />
                  Positive Emotions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 10]} fontSize={12} />
                      <Tooltip formatter={formatTooltipValue} />
                      <Line 
                        type="monotone" 
                        dataKey="positiveAffect" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {stats && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Avg: {stats.positiveAffect.avg}/10
                    </span>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(stats.positiveAffect.trend)}
                      <span className={getTrendColor(stats.positiveAffect.trend)}>
                        {stats.positiveAffect.trend}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Stress Level (Negative Affect) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Activity className="w-5 h-5 mr-2 text-red-500" />
                  Stress Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 10]} fontSize={12} />
                      <Tooltip formatter={formatTooltipValue} />
                      <Line 
                        type="monotone" 
                        dataKey="negativeAffect" 
                        stroke="#dc2626" 
                        strokeWidth={2}
                        dot={{ fill: '#dc2626', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {stats && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Avg: {stats.negativeAffect.avg}/10
                    </span>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(stats.negativeAffect.trend === 'improving' ? 'declining' : stats.negativeAffect.trend === 'declining' ? 'improving' : 'stable')}
                      <span className={getTrendColor(stats.negativeAffect.trend === 'improving' ? 'declining' : stats.negativeAffect.trend === 'declining' ? 'improving' : 'stable')}>
                        {stats.negativeAffect.trend === 'improving' ? 'declining' : stats.negativeAffect.trend === 'declining' ? 'improving' : 'stable'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Social Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Users className="w-5 h-5 mr-2 text-blue-500" />
                  Social Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 10]} fontSize={12} />
                      <Tooltip formatter={formatTooltipValue} />
                      <Line 
                        type="monotone" 
                        dataKey="socialSupport" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {stats && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Avg: {stats.socialSupport.avg}/10
                    </span>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(stats.socialSupport.trend)}
                      <span className={getTrendColor(stats.socialSupport.trend)}>
                        {stats.socialSupport.trend}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Personal Growth - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-purple-500" />
                Personal Growth Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis domain={[0, 10]} fontSize={12} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Line 
                      type="monotone" 
                      dataKey="personalGrowth" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {stats && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Average: {stats.personalGrowth.avg}/10 | Range: {stats.personalGrowth.min} - {stats.personalGrowth.max}
                  </span>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(stats.personalGrowth.trend)}
                    <span className={getTrendColor(stats.personalGrowth.trend)}>
                      {stats.personalGrowth.trend}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
