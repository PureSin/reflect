import React, { useState } from 'react';
import { dbService } from '../services/database';
import { Download, FileText, Database } from 'lucide-react';

export const ExportPage: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [exportStats, setExportStats] = useState<{ entries: number; size: string } | null>(null);

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const data = await dbService.exportData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `reflect-journal-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportStats({
        entries: data.entries.length,
        size: (blob.size / 1024).toFixed(2) + ' KB'
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    setExporting(true);
    try {
      const data = await dbService.exportData();
      let markdownContent = '# Reflect Journal Export\n\n';
      
      data.entries.forEach(entry => {
        const date = new Date(entry.targetDate).toLocaleDateString();
        markdownContent += `## ${date}\n\n`;
        
        // Convert HTML to markdown (basic conversion)
        let content = entry.content
          .replace(/<h1>/g, '# ')
          .replace(/<\/h1>/g, '\n\n')
          .replace(/<h2>/g, '## ')
          .replace(/<\/h2>/g, '\n\n')
          .replace(/<h3>/g, '### ')
          .replace(/<\/h3>/g, '\n\n')
          .replace(/<strong>/g, '**')
          .replace(/<\/strong>/g, '**')
          .replace(/<em>/g, '*')
          .replace(/<\/em>/g, '*')
          .replace(/<p>/g, '')
          .replace(/<\/p>/g, '\n\n')
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<[^>]*>/g, ''); // Remove remaining HTML tags
        
        markdownContent += content + '\n\n';
        
        if (entry.metadata.tags.length > 0) {
          markdownContent += `**Tags:** ${entry.metadata.tags.map(tag => `#${tag}`).join(', ')}\n\n`;
        }
        
        markdownContent += '---\n\n';
      });
      
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `reflect-journal-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportStats({
        entries: data.entries.length,
        size: (blob.size / 1024).toFixed(2) + ' KB'
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <Download className="w-8 h-8 mr-3" />
          Export Data
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Download your journal entries in different formats
        </p>
      </div>

      <div className="space-y-6">
        {/* JSON Export */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                <Database className="w-5 h-5 mr-2" />
                JSON Format
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Complete backup including all metadata, settings, and entry data. Best for importing back into Reflect.
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <li>• Preserves all formatting and metadata</li>
                <li>• Includes timestamps and word counts</li>
                <li>• Can be imported back to restore data</li>
                <li>• Machine-readable format</li>
              </ul>
            </div>
            <button
              onClick={handleExportJSON}
              disabled={exporting}
              className="ml-6 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {exporting ? 'Exporting...' : 'Export JSON'}
            </button>
          </div>
        </div>

        {/* Markdown Export */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Markdown Format
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Human-readable text format that works with most text editors and note-taking apps.
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <li>• Human-readable text format</li>
                <li>• Works with most text editors</li>
                <li>• Compatible with other note apps</li>
                <li>• Easy to read and share</li>
              </ul>
            </div>
            <button
              onClick={handleExportMarkdown}
              disabled={exporting}
              className="ml-6 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {exporting ? 'Exporting...' : 'Export Markdown'}
            </button>
          </div>
        </div>

        {/* Export Stats */}
        {exportStats && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-300 mb-2">
              Export Complete!
            </h3>
            <p className="text-emerald-800 dark:text-emerald-400">
              Successfully exported {exportStats.entries} entries ({exportStats.size})
            </p>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Privacy Notice
          </h3>
          <p className="text-blue-800 dark:text-blue-400 text-sm">
            Your exported data contains all your personal journal entries. Please store the exported files securely and only share them with trusted applications or people.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportPage;