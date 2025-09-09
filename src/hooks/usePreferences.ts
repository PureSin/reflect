import { useState, useEffect } from 'react';
import { dbService } from '../services/database';
import { UserPreferences } from '../types';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await dbService.getPreferences();
        setPreferences(prefs);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const updatePreferences = async (updates: Partial<Omit<UserPreferences, 'id'>>) => {
    if (!preferences) return;

    try {
      await dbService.updatePreferences(updates);
      setPreferences({ ...preferences, ...updates });
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  return {
    preferences,
    updatePreferences,
    loading
  };
};