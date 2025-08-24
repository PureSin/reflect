import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EntriesPage from './pages/EntriesPage';
import CalendarPage from './pages/CalendarPage';
import EntryDetailPage from './pages/EntryDetailPage';
import SettingsPage from './pages/SettingsPage';
import ExportPage from './pages/ExportPage';
import ImportPage from './pages/ImportPage';
import InsightsPage from './pages/InsightsPage';
import WeeklySummaryPage from './pages/WeeklySummaryPage';
import { usePreferences } from './hooks/usePreferences';
import { themeUtils } from './lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LLMProvider } from './contexts/LLMContext';

function App() {
  const { preferences } = usePreferences();

  // Apply theme on app load and preferences change
  useEffect(() => {
    if (preferences?.theme) {
      themeUtils.applyTheme(preferences.theme);
    } else {
      // Apply system theme as default
      themeUtils.applyTheme('auto');
    }
  }, [preferences?.theme]);

  // Apply font size to root element
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing font size classes
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    
    // Apply font size based on preferences
    switch (preferences?.fontSize) {
      case 'small':
        root.classList.add('text-sm');
        break;
      case 'large':
        root.classList.add('text-lg');
        break;
      default:
        root.classList.add('text-base');
        break;
    }
  }, [preferences?.fontSize]);

  return (
    <ErrorBoundary>
      <LLMProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/entries" element={<EntriesPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/weekly-summaries" element={<WeeklySummaryPage />} />
              <Route path="/entry/:id" element={<EntryDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="/import" element={<ImportPage />} />
              
              {/* Catch all route - redirect to home */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Layout>
        </Router>
      </LLMProvider>
    </ErrorBoundary>
  );
}

export default App;