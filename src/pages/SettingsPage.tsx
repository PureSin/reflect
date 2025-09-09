import React from 'react';
import { usePreferences } from '../hooks/usePreferences';
import { themeUtils } from '../lib/utils';
import { Settings as SettingsIcon, Palette, Type, Bell, Save, Brain } from 'lucide-react';
import { AIControlPanel } from '../components/AI';

export const SettingsPage: React.FC = () => {
  const { preferences, updatePreferences, loading } = usePreferences();

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    updatePreferences({ theme });
    themeUtils.applyTheme(theme);
  };

  const handleFontSizeChange = (fontSize: 'small' | 'medium' | 'large') => {
    updatePreferences({ fontSize });
  };

  const handleTogglePrompts = () => {
    updatePreferences({ dailyPrompts: !preferences?.dailyPrompts });
  };

  const handleToggleAutoSave = () => {
    updatePreferences({ autoSave: !preferences?.autoSave });
  };

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <SettingsIcon className="w-8 h-8 mr-3" />
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Customize your journaling experience
        </p>
      </div>

      <div className="space-y-8">
        {/* AI Features */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            AI Features
          </h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enable on-device AI analysis for sentiment detection and happiness metrics. 
              All processing happens locally - your data never leaves your device.
            </p>
          </div>
          
          <AIControlPanel />
        </div>
        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            Appearance
          </h2>
          
          <div className="space-y-6">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'auto', label: 'Auto' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value as any)}
                    className={`
                      p-3 text-sm rounded-lg border transition-colors
                      ${
                        preferences.theme === option.value
                          ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Size
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFontSizeChange(option.value as any)}
                    className={`
                      p-3 text-sm rounded-lg border transition-colors
                      ${
                        preferences.fontSize === option.value
                          ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Writing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Type className="w-5 h-5 mr-2" />
            Writing
          </h2>
          
          <div className="space-y-6">
            {/* Daily Prompts */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Daily Writing Prompts
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Show inspirational prompts when starting a new entry
                </p>
              </div>
              <button
                onClick={handleTogglePrompts}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${
                    preferences.dailyPrompts
                      ? 'bg-emerald-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${
                      preferences.dailyPrompts ? 'translate-x-6' : 'translate-x-1'
                    }
                  `}
                />
              </button>
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto Save
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically save your entries every 30 seconds
                </p>
              </div>
              <button
                onClick={handleToggleAutoSave}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${
                    preferences.autoSave
                      ? 'bg-emerald-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${
                      preferences.autoSave ? 'translate-x-6' : 'translate-x-1'
                    }
                  `}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Data */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Save className="w-5 h-5 mr-2" />
            Privacy & Data
          </h2>
          
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-2">
                Local-First Privacy
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-400">
                All your journal entries are stored locally on your device. No data is sent to external servers, ensuring complete privacy.
              </p>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>• Data is stored in your browser's IndexedDB</p>
              <p>• Works completely offline</p>
              <p>• Export your data anytime</p>
              <p>• No account registration required</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;