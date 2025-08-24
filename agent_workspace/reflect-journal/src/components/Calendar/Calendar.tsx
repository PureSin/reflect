import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Flame, Heart, Activity, Users, BookOpen, Sparkles, FileText, Brain } from 'lucide-react';
import { dbService } from '../../services/database';
import { calendarWeeklySummaryService } from '../../services/calendarWeeklySummaryService';
import { dateUtils, cn } from '../../lib/utils';
import { Entry } from '../../types';
import { AIAnalysis, SentimentType, SENTIMENT_LABELS } from '../../types/ai.types';
import { WeeklySummary, WeeklySummaryAnalysis } from '../../types/weekly.types';
import WeeklySummaryModal from '../WeeklySummary/WeeklySummaryModal';

interface CalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEntryClick?: (entry: Entry) => void;
  className?: string;
}

interface CalendarData {
  [key: string]: {
    wordCount: number;
    preview: string;
    entry?: Entry;
    aiAnalysis?: AIAnalysis;
  };
}

interface WeeklyData {
  [key: string]: {
    weekStart: Date;
    weekEnd: Date;
    hasSummary: boolean;
    entryCount: number;
    summary?: WeeklySummary;
    analysis?: WeeklySummaryAnalysis;
  };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Calendar = forwardRef<{ forceRefresh: () => void }, CalendarProps>((
  {
    selectedDate = new Date(),
    onDateSelect,
    onEntryClick,
    className = ''
  },
  ref
) => {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [weeklyData, setWeeklyData] = useState<WeeklyData>({});
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<{ weekStart: Date; weekEnd: Date; entryCount: number } | null>(null);
  const [showWeeklySummaryModal, setShowWeeklySummaryModal] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const current = new Date(startDate);

    // Generate 6 weeks (42 days) to fill the calendar grid
    for (let i = 0; i < 42; i++) {
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: dateUtils.isToday(current),
        isSelected: selectedDate && dateUtils.isSameDay(current, selectedDate),
        dateKey: dateUtils.getDateKey(current)
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [year, month, selectedDate]);

  // Load calendar data
  const loadCalendarData = async () => {
    setLoading(true);
    try {
      // Load daily entry data
      const data = await dbService.getCalendarData(year, month);
      const calendarEntries: CalendarData = {};
      
      // Convert Map to object and load full entries for current month
      for (const [dateKey, info] of data.entries()) {
        const entryDate = new Date(dateKey);
        const entry = await dbService.getEntryByDate(entryDate);
        
        calendarEntries[dateKey] = {
          wordCount: info.wordCount,
          preview: info.preview,
          entry,
          aiAnalysis: info.aiAnalysis // Include AI analysis data that was already fetched
        };
      }
      
      setCalendarData(calendarEntries);
      
      // Load weekly summary data
      const weeklyDataMap = await calendarWeeklySummaryService.getWeeklySummaryIndicators(year, month);
      const weeklyEntries: WeeklyData = {};
      
      for (const [weekKey, weekInfo] of weeklyDataMap.entries()) {
        weeklyEntries[weekKey] = weekInfo;
      }
      
      setWeeklyData(weeklyEntries);
      
      // Load current streak
      const currentStreak = await dbService.getCurrentStreak();
      setStreak(currentStreak);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [year, month]);

  // Expose forceRefresh method to parent components
  useImperativeHandle(ref, () => ({
    forceRefresh: loadCalendarData
  }));

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDateClick = (date: Date) => {
    const dateKey = dateUtils.getDateKey(date);
    const dayData = calendarData[dateKey];
    
    if (dayData?.entry) {
      onEntryClick?.(dayData.entry);
    } else {
      onDateSelect?.(date);
    }
  };

  const handleWeekClick = (weekStart: Date, weekEnd: Date, entryCount: number) => {
    setSelectedWeek({ weekStart, weekEnd, entryCount });
    setShowWeeklySummaryModal(true);
  };

  const getWeekDataForDate = (date: Date) => {
    const { weekKey } = calendarWeeklySummaryService.getWeekForDate(date);
    return weeklyData[weekKey];
  };

  const isDateInSelectedWeek = (date: Date) => {
    if (!hoveredWeek) return false;
    const weekInfo = weeklyData[hoveredWeek];
    if (!weekInfo) return false;
    
    return calendarWeeklySummaryService.isDateInWeek(date, weekInfo.weekStart, weekInfo.weekEnd);
  };

  const getDateIntensity = (dateKey: string): string => {
    const data = calendarData[dateKey];
    if (!data) return '';
    
    // If AI analysis is available, color-code based on overall happiness score
    if (data.aiAnalysis) {
      const score = data.aiAnalysis.happiness.overallScore;
      
      if (score >= 7) return 'bg-green-300 dark:bg-green-700'; // Good/high scores (above 7/10)
      if (score >= 5) return 'bg-yellow-300 dark:bg-yellow-700'; // Medium scores (around 5/10)
      if (score >= 3) return 'bg-orange-300 dark:bg-orange-700'; // Below average
      return 'bg-red-300 dark:bg-red-700'; // Low scores (below 3/10)
    }
    
    // Otherwise use word count coloring for non-analyzed entries
    const { wordCount } = data;
    if (wordCount === 0) return '';
    if (wordCount < 100) return 'bg-emerald-200 dark:bg-emerald-800';
    if (wordCount < 300) return 'bg-emerald-300 dark:bg-emerald-700';
    if (wordCount < 500) return 'bg-emerald-400 dark:bg-emerald-600';
    return 'bg-emerald-500 dark:bg-emerald-500';
  };

  const formatTooltip = (dateKey: string): React.ReactNode => {
    const data = calendarData[dateKey];
    if (!data) return 'No entry';
    
    const date = new Date(dateKey);
    
    // If AI analysis is available, show it instead of content preview
    if (data.aiAnalysis) {
      const { happiness, sentiment } = data.aiAnalysis;
      
      return (
        <div className="space-y-2">
          <div className="font-semibold">{dateUtils.formatDate(date)} - {data.wordCount} words</div>
          
          <div className="flex items-center">
            <Heart className="w-4 h-4 mr-1 text-red-500" />
            <span className="font-medium">Overall: {happiness.overallScore.toFixed(1)}/10</span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div className="flex items-center">
              <Activity className="w-3 h-3 mr-1 text-blue-500" />
              <span>Life: {happiness.lifeEvaluation.toFixed(1)}</span>
            </div>
            <div className="flex items-center">
              <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
              <span>Positive: {happiness.positiveAffect.toFixed(1)}</span>
            </div>
            <div className="flex items-center">
              <Activity className="w-3 h-3 mr-1 text-purple-500" />
              <span>Stress: {happiness.negativeAffect.toFixed(1)}</span>
            </div>
            <div className="flex items-center">
              <Users className="w-3 h-3 mr-1 text-green-500" />
              <span>Social: {happiness.socialSupport.toFixed(1)}</span>
            </div>
            <div className="flex items-center" style={{ gridColumn: '1 / -1' }}>
              <BookOpen className="w-3 h-3 mr-1 text-indigo-500" />
              <span>Growth: {happiness.personalGrowth.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="text-xs pt-1 border-t border-gray-700 dark:border-gray-300">
            <div className="font-medium">Sentiment: {SENTIMENT_LABELS[sentiment.sentiment]}</div>
          </div>
        </div>
      );
    }
    
    // Otherwise show normal entry preview
    return `${dateUtils.formatDate(date)}\n${data.wordCount} words\n\n${data.preview}...`;
  };

  const formatWeeklyTooltip = (weekKey: string): React.ReactNode => {
    const weekData = weeklyData[weekKey];
    if (!weekData) return 'No weekly data';
    
    const weekRange = `${dateUtils.formatDate(weekData.weekStart)} - ${dateUtils.formatDate(weekData.weekEnd)}`;
    
    if (weekData.hasSummary && weekData.analysis) {
      const { analysis } = weekData;
      
      return (
        <div className="space-y-2">
          <div className="font-semibold">{weekRange}</div>
          <div className="text-sm">{weekData.entryCount} entries this week</div>
          
          <div className="flex items-center">
            <FileText className="w-4 h-4 mr-1 text-emerald-500" />
            <span className="font-medium">Weekly Summary Available</span>
          </div>
          
          <div className="flex items-center">
            <Heart className="w-4 h-4 mr-1 text-red-500" />
            <span className="font-medium">Overall: {analysis.happiness.overallScore.toFixed(1)}/10</span>
          </div>
          
          <div className="text-xs">
            <div className="font-medium">Sentiment: {SENTIMENT_LABELS[analysis.sentiment.sentiment]}</div>
            {analysis.weeklyThemes.length > 0 && (
              <div className="mt-1">Themes: {analysis.weeklyThemes.slice(0, 2).join(', ')}</div>
            )}
          </div>
        </div>
      );
    } else if (weekData.entryCount >= 2) {
      return (
        <div className="space-y-1">
          <div className="font-semibold">{weekRange}</div>
          <div className="text-sm">{weekData.entryCount} entries this week</div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">
            Click to generate weekly summary
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-1">
          <div className="font-semibold">{weekRange}</div>
          <div className="text-sm">{weekData.entryCount} entries this week</div>
          <div className="text-xs text-gray-500">
            Need at least 2 entries for weekly summary
          </div>
        </div>
      );
    }
  };

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2" />
            Journal Calendar
          </h2>
          
          {streak > 0 && (
            <div className="flex items-center text-orange-500 dark:text-orange-400">
              <Flame className="w-5 h-5 mr-1" />
              <span className="font-semibold">{streak}</span>
              <span className="text-sm ml-1">day{streak !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            disabled={loading}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {MONTHS[month]} {year}
          </h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            disabled={loading}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400">Loading calendar...</div>
          </div>
        ) : (
          <>
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth, isToday, isSelected, dateKey }) => {
                const hasEntry = !!calendarData[dateKey];
                const intensity = getDateIntensity(dateKey);
                const weekData = getWeekDataForDate(date);
                const isInHoveredWeek = isDateInSelectedWeek(date);
                
                return (
                  <div
                    key={dateKey}
                    className="relative"
                    onMouseEnter={() => setHoveredDate(dateKey)}
                    onMouseLeave={() => setHoveredDate(null)}
                  >
                    <button
                      onClick={() => handleDateClick(date)}
                      className={cn(
                        'w-full h-12 p-1 text-sm rounded-lg transition-all duration-200 relative',
                        'hover:bg-gray-100 dark:hover:bg-gray-800',
                        {
                          'text-gray-900 dark:text-white': isCurrentMonth,
                          'text-gray-400 dark:text-gray-600': !isCurrentMonth,
                          'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-900': isSelected,
                          'font-semibold bg-emerald-50 dark:bg-emerald-900/20': isToday,
                          'ring-1 ring-blue-300 dark:ring-blue-600': isInHoveredWeek && isCurrentMonth,
                          [intensity]: hasEntry && isCurrentMonth
                        }
                      )}
                    >
                      <span className={cn(
                        'relative z-10',
                        {
                          'text-white': (
                            intensity.includes('emerald-400') || 
                            intensity.includes('emerald-500') ||
                            intensity.includes('green-700') ||
                            intensity.includes('red-700') ||
                            intensity.includes('orange-700') ||
                            intensity.includes('yellow-700')
                          ),
                          'text-gray-900 dark:text-white': !intensity || (
                            intensity.includes('emerald-200') || 
                            intensity.includes('emerald-300') ||
                            intensity.includes('green-300') ||
                            intensity.includes('yellow-300') ||
                            intensity.includes('orange-300') ||
                            intensity.includes('red-300')
                          )
                        }
                      )}>
                        {date.getDate()}
                      </span>
                      
                      {hasEntry && (
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
                          <div className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            intensity || 'bg-emerald-500'
                          )} />
                          {calendarData[dateKey].aiAnalysis && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                          )}
                        </div>
                      )}
                      
                      {/* Weekly summary indicator */}
                      {weekData && date.getDay() === 1 && isCurrentMonth && ( // Show on Mondays
                        <div 
                          className="absolute -top-1 -right-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWeekClick(weekData.weekStart, weekData.weekEnd, weekData.entryCount);
                          }}
                          onMouseEnter={() => setHoveredWeek(calendarWeeklySummaryService.getWeekKey(weekData.weekStart, weekData.weekEnd))}
                          onMouseLeave={() => setHoveredWeek(null)}
                        >
                          {weekData.hasSummary ? (
                            <FileText className="w-3 h-3 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-900 rounded-full p-0.5 shadow-sm" />
                          ) : weekData.entryCount >= 2 ? (
                            <Brain className="w-3 h-3 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 rounded-full p-0.5 shadow-sm" />
                          ) : null}
                        </div>
                      )}
                    </button>
                    
                    {/* Daily tooltip */}
                    {hoveredDate === dateKey && calendarData[dateKey] && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg p-3 shadow-lg max-w-sm w-80">
                          {typeof formatTooltip(dateKey) === 'string' ? (
                            <div className="whitespace-pre-line">
                              {formatTooltip(dateKey)}
                            </div>
                          ) : (
                            formatTooltip(dateKey)
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Weekly tooltip */}
                    {hoveredWeek && weekData && date.getDay() === 1 && isCurrentMonth && hoveredWeek === calendarWeeklySummaryService.getWeekKey(weekData.weekStart, weekData.weekEnd) && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg p-3 shadow-lg max-w-sm w-80">
                          {typeof formatWeeklyTooltip(hoveredWeek) === 'string' ? (
                            <div className="whitespace-pre-line">
                              {formatWeeklyTooltip(hoveredWeek)}
                            </div>
                          ) : (
                            formatWeeklyTooltip(hoveredWeek)
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="flex flex-col space-y-2">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Word Count</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
              <span>No entry</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-emerald-200 dark:bg-emerald-800 rounded" />
              <span>1-99 words</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-emerald-300 dark:bg-emerald-700 rounded" />
              <span>100-299 words</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-emerald-400 dark:bg-emerald-600 rounded" />
              <span>300-499 words</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-500 rounded" />
              <span>500+ words</span>
            </div>
          </div>
          
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1 mt-2">AI Analysis Scores</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded" />
              <span>AI Analyzed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-300 dark:bg-green-700 rounded" />
              <span>High (7-10)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-300 dark:bg-yellow-700 rounded" />
              <span>Medium (5-6.9)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-300 dark:bg-orange-700 rounded" />
              <span>Below Average (3-4.9)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-300 dark:bg-red-700 rounded" />
              <span>Low (0-2.9)</span>
            </div>
          </div>
          
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1 mt-2">Weekly Summaries</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <FileText className="w-3 h-3 text-emerald-600" />
              <span>Summary Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <Brain className="w-3 h-3 text-blue-600" />
              <span>Can Generate Summary</span>
            </div>
            <div className="text-xs italic">
              Weekly indicators appear on Mondays - click to view/generate summaries
            </div>
          </div>
        </div>
      </div>
      
      {/* Weekly Summary Modal */}
      {selectedWeek && (
        <WeeklySummaryModal
          isOpen={showWeeklySummaryModal}
          onClose={() => {
            setShowWeeklySummaryModal(false);
            setSelectedWeek(null);
          }}
          weekStart={selectedWeek.weekStart}
          weekEnd={selectedWeek.weekEnd}
          entryCount={selectedWeek.entryCount}
          onSummaryGenerated={() => {
            // Refresh weekly data after summary generation
            const loadWeeklyData = async () => {
              const weeklyDataMap = await calendarWeeklySummaryService.getWeeklySummaryIndicators(year, month);
              const weeklyEntries: WeeklyData = {};
              
              for (const [weekKey, weekInfo] of weeklyDataMap.entries()) {
                weeklyEntries[weekKey] = weekInfo;
              }
              
              setWeeklyData(weeklyEntries);
            };
            loadWeeklyData();
          }}
        />
      )}
    </div>
  );
});

Calendar.displayName = 'Calendar';

export default Calendar;