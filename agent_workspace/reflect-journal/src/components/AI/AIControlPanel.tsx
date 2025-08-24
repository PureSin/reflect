import React, { useState } from 'react';
import { Brain, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useLLM } from '../../contexts/LLMContext';
import { LoadingState } from '../../types/ai.types';

interface AIControlPanelProps {
  className?: string;
}

export const AIControlPanel: React.FC<AIControlPanelProps> = ({ className }) => {
  const { loadingState, isModelReady, loadModel, unloadModel, webGPUSupported, checkWebGPUSupport } = useLLM();
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadModel = async () => {
    setIsLoading(true);
    try {
      await loadModel();
    } catch (error) {
      console.error('Failed to load model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnloadModel = async () => {
    try {
      await unloadModel();
    } catch (error) {
      console.error('Failed to unload model:', error);
    }
  };

  const getStatusColor = () => {
    switch (loadingState.stage) {
      case 'ready': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'idle': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-blue-600';
    }
  };

  const getStatusIcon = () => {
    switch (loadingState.stage) {
      case 'ready': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'loading':
      case 'downloading':
      case 'compiling':
      case 'initializing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      default: return <Brain className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStageText = () => {
    switch (loadingState.stage) {
      case 'idle': return 'Not loaded';
      case 'checking-support': return 'Checking WebGPU support...';
      case 'initializing': return 'Initializing engine...';
      case 'downloading': return 'Downloading model (~1.8GB)...';
      case 'loading': return 'Loading model into memory...';
      case 'compiling': return 'Compiling for your device...';
      case 'ready': return 'Ready for AI analysis';
      case 'error': return loadingState.error || 'Error occurred';
      default: return 'Unknown status';
    }
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* WebGPU Support Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">WebGPU Support:</span>
          <span className={`text-sm px-2 py-1 rounded ${
            webGPUSupported === null ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : 
            webGPUSupported ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 
            'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
          }`}>
            {webGPUSupported === null ? 'Checking...' : webGPUSupported ? 'Supported' : 'Not Supported'}
          </span>
        </div>

        {/* Model Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Model Status:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`text-sm ${getStatusColor()}`}>
                {getStageText()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {loadingState.isLoading && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${loadingState.progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {Math.round(loadingState.progress)}% complete
              </div>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3">
          {!isModelReady ? (
            <button 
              onClick={handleLoadModel} 
              disabled={isLoading || loadingState.isLoading || !webGPUSupported}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLoading || loadingState.isLoading || !webGPUSupported 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isLoading || loadingState.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isLoading || loadingState.isLoading ? 'Loading...' : 'Load AI Model'}
            </button>
          ) : (
            <button 
              onClick={handleUnloadModel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Brain className="w-4 h-4" />
              Unload Model
            </button>
          )}
        </div>

        {/* Info Messages */}
        {!webGPUSupported && (
          <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            WebGPU is required for AI features. Please use a compatible browser like Chrome 113+ or Edge 113+.
          </div>
        )}

        {webGPUSupported && !isModelReady && (
          <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <Brain className="w-4 h-4 inline mr-1" />
            Load the AI model (Qwen2.5-1.5B-Instruct) to enable sentiment analysis and happiness metrics for your journal entries.
            <br /><strong>Note:</strong> First-time loading requires downloading ~1.8GB.
          </div>
        )}

        {isModelReady && (
          <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="w-4 h-4 inline mr-1" />
            AI analysis is ready! Look for the "Analyze with AI" button in your journal entries.
          </div>
        )}
      </div>
    </div>
  );
};

export default AIControlPanel;
