import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '../components/Editor';
import { dbService } from '../services/database';
import { Entry } from '../types';
import { dateUtils } from '../lib/utils';
import { ArrowLeft, Trash2, Calendar } from 'lucide-react';
import { AIAnalysisButton } from '../components/AI';

export const EntryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | undefined>();
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const isNewEntry = id === 'new';
  const dateParam = searchParams.get('date');
  const entryDate = dateParam ? new Date(dateParam) : new Date();

  useEffect(() => {
    const loadEntry = async () => {
      if (isNewEntry) {
        setLoading(false);
        return;
      }
      
      if (!id) {
        navigate('/');
        return;
      }

      try {
        const entryData = await dbService.getEntry(id);
        if (!entryData) {
          navigate('/entries');
          return;
        }
        setEntry(entryData);
      } catch (error) {
        console.error('Failed to load entry:', error);
        navigate('/entries');
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [id, isNewEntry, navigate]);

  const handleSave = (savedEntry: Entry) => {
    setEntry(savedEntry);
    if (isNewEntry) {
      navigate(`/entry/${savedEntry.id}`, { replace: true });
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    
    try {
      await dbService.deleteEntry(entry.id);
      navigate('/entries');
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading entry...</div>
      </div>
    );
  }

  const displayDate = entry ? entry.targetDate : entryDate;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {isNewEntry ? 'New Entry' : 'Edit Entry'}
              </h1>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
                <Calendar className="w-4 h-4 mr-1" />
                {dateUtils.formatDate(displayDate)}
                {entry && (
                  <span className="ml-2 text-sm">
                    {dateUtils.formatTime(entry.created)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {entry && !isNewEntry && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                title="Delete entry"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <Editor
          entry={entry}
          targetDate={isNewEntry && dateParam ? new Date(dateParam) : undefined}
          onSave={handleSave}
        />
      </div>

      {/* AI Analysis */}
      {entry && (
        <div className="mb-6">
          <AIAnalysisButton 
            entry={entry}
            onAnalysisComplete={(sentiment, metrics) => {
              console.log('AI Analysis completed:', { sentiment, metrics });
            }}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Entry
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this entry? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntryDetailPage;