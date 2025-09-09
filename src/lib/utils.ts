import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Text utilities
export const textUtils = {
  countWords: (text: string): number => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  },

  estimateReadingTime: (wordCount: number): number => {
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  },

  stripHtml: (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  },

  truncate: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  },

  extractTags: (text: string): string[] => {
    const tagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = text.match(tagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }
};

// Date utilities
export const dateUtils = {
  formatDate: (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  },

  formatTime: (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  },

  isToday: (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  },

  isSameDay: (date1: Date, date2: Date): boolean => {
    return date1.toDateString() === date2.toDateString();
  },

  getDateKey: (date: Date): string => {
    return date.toISOString().split('T')[0];
  },

  startOfDay: (date: Date): Date => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  },

  endOfDay: (date: Date): Date => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
};

// Theme utilities
export const themeUtils = {
  getSystemTheme: (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  },

  applyTheme: (theme: 'light' | 'dark' | 'auto') => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      const systemTheme = themeUtils.getSystemTheme();
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }
};

// Storage utilities for session data
export const sessionStorage = {
  save: (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(key, JSON.stringify(data));
    }
  },

  load: <T>(key: string): T | null => {
    if (typeof window !== 'undefined') {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
    return null;
  },

  remove: (key: string) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(key);
    }
  }
};