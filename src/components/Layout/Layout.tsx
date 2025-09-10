import React, { useEffect } from 'react';
import { BookOpen, Calendar, Settings, Home, Download, Upload, BarChart, FileText, Github, MessageSquare } from 'lucide-react';
import { usePreferences } from '../../hooks/usePreferences';
import { themeUtils, cn } from '../../lib/utils';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const navigation: NavItem[] = [
  {
    name: 'Today',
    href: '/',
    icon: Home,
    description: 'Write your daily entry'
  },
  {
    name: 'Journal',
    href: '/entries',
    icon: BookOpen,
    description: 'Browse all entries'
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    description: 'Calendar view'
  },
  {
    name: 'Weekly',
    href: '/weekly-summaries',
    icon: FileText,
    description: 'AI weekly summaries'
  },
  {
    name: 'Insights',
    href: '/insights',
    icon: BarChart,
    description: 'Happiness metrics'
  }
];

const secondaryNav: NavItem[] = [
  {
    name: 'Export',
    href: '/export',
    icon: Download,
    description: 'Export your data'
  },
  {
    name: 'Import',
    href: '/import',
    icon: Upload,
    description: 'Import entries'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'App preferences'
  }
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { preferences } = usePreferences();
  const location = useLocation();

  // Apply theme on preferences change
  useEffect(() => {
    if (preferences?.theme) {
      themeUtils.applyTheme(preferences.theme);
    }
  }, [preferences?.theme]);

  const isActiveRoute = (href: string): boolean => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Reflect
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    {
                      'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300': isActive,
                      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700': !isActive
                    }
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 transition-colors',
                      {
                        'text-emerald-600 dark:text-emerald-400': isActive,
                        'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300': !isActive
                      }
                    )}
                  />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Secondary Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-1">
              {secondaryNav.map((item) => {
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      {
                        'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300': isActive,
                        'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700': !isActive
                      }
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-4 w-4 transition-colors',
                        {
                          'text-emerald-600 dark:text-emerald-400': isActive,
                          'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300': !isActive
                        }
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Feedback Button */}
          <div className="mt-4 px-3">
            <a
              href="https://github.com/PureSin/reflect/issues/new?template=bug_report.md"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MessageSquare className="mr-3 h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
              File Feedback
            </a>
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <div>Local-first journaling</div>
            <div className="mt-1">Your data stays private</div>
            <a 
              href="https://github.com/PureSin/reflect" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center space-x-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <Github className="w-3 h-3" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64">
        <main className="py-6 px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;