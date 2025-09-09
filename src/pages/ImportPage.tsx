import React, { useState, useRef } from 'react';
import { dbService } from '../services/database';
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

export const ImportPage: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    entriesCount?: number;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setImportResult({
        success: false,
        message: 'Please select a valid JSON file exported from Reflect.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImporting(true);
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate the import data structure
        if (!data.entries || !Array.isArray(data.entries)) {
          throw new Error('Invalid file format. Please select a valid Reflect export file.');
        }
        
        // Validate entries structure
        for (const entry of data.entries) {
          if (!entry.id || !entry.content || !entry.created || !entry.metadata) {
            throw new Error('Invalid entry format in the import file.');
          }
        }
        
        await dbService.importData(data);
        
        setImportResult({
          success: true,
          message: 'Import completed successfully!',
          entriesCount: data.entries.length
        });
      } catch (error) {
        console.error('Import failed:', error);
        setImportResult({
          success: false,
          message: error instanceof Error ? error.message : 'Import failed. Please check the file format.'
        });
      } finally {
        setImporting(false);
      }
    };
    
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <Upload className="w-8 h-8 mr-3" />
          Import Data
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Import journal entries from a previously exported file
        </p>
      </div>

      <div className="space-y-6">
        {/* Warning */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                Important Warning
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Importing will replace all existing entries and settings. This action cannot be undone. Consider exporting your current data first as a backup.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div
            className={`
              relative p-8 border-2 border-dashed rounded-lg transition-colors
              ${
                dragOver
                  ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <FileText className={`
                w-12 h-12 mx-auto mb-4
                ${
                  dragOver
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-gray-400 dark:text-gray-500'
                }
              `} />
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {dragOver ? 'Drop file here' : 'Import Journal Data'}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Drop your exported JSON file here or click to browse
              </p>
              
              <button
                onClick={handleBrowseClick}
                disabled={importing}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {importing ? 'Importing...' : 'Browse Files'}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className={`
            rounded-lg p-4 border
            ${
              importResult.success
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }
          `}>
            <div className="flex items-start">
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 mr-3" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
              )}
              <div>
                <h3 className={`
                  text-sm font-semibold mb-1
                  ${
                    importResult.success
                      ? 'text-emerald-800 dark:text-emerald-300'
                      : 'text-red-800 dark:text-red-300'
                  }
                `}>
                  {importResult.success ? 'Import Successful' : 'Import Failed'}
                </h3>
                <p className={`
                  text-sm
                  ${
                    importResult.success
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }
                `}>
                  {importResult.message}
                  {importResult.entriesCount !== undefined && (
                    <span className="block mt-1">
                      Imported {importResult.entriesCount} entries
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Import Instructions
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              Only JSON files exported from Reflect are supported
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              All existing data will be replaced during import
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              Make sure to backup your current data before importing
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              The import process may take a few moments for large files
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;