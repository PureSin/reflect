import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Focus from '@tiptap/extension-focus';
import Typography from '@tiptap/extension-typography';
import { textUtils, sessionStorage } from '../../lib/utils';
import { getDailyPrompt } from '../../services/prompts';
import { Entry } from '../../types';
import { dbService } from '../../services/database';
import { Maximize2, Minimize2, Save } from 'lucide-react';
import { SpeechToTextButton } from './SpeechToTextButton';

interface EditorProps {
  entry?: Entry;
  targetDate?: Date;
  onSave?: (entry: Entry) => void;
  onContentChange?: (content: string, wordCount: number) => void;
  className?: string;
}

const AUTOSAVE_DELAY = 30000; // 30 seconds
const SESSION_KEY = 'reflect-draft';

export const Editor: React.FC<EditorProps> = ({
  entry,
  targetDate,
  onSave,
  onContentChange,
  className = ''
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [showPrompt, setShowPrompt] = useState(true);
  const [dailyPrompt] = useState(() => getDailyPrompt());
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Focus.configure({
        className: 'has-focus',
        mode: 'all'
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'What\'s the heading?';
          }
          return showPrompt ? dailyPrompt.text : 'Start writing...';
        },
        showOnlyWhenEditable: true
      })
    ],
    content: entry?.content || sessionStorage.load(SESSION_KEY) || '',
    editorProps: {
      attributes: {
        class: 'prose prose-gray dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-6',
        spellcheck: 'true'
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      const words = textUtils.countWords(text);
      
      setWordCount(words);
      setShowPrompt(text.length === 0);
      
      // Save to session storage immediately
      sessionStorage.save(SESSION_KEY, html);
      
      // Clear existing autosave timeout
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      
      // Set new autosave timeout
      autosaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(html, text, words);
      }, AUTOSAVE_DELAY);
      
      onContentChange?.(html, words);
    }
  });

  const handleAutoSave = useCallback(async (content: string, plainText: string, wordCount: number) => {
    if (!content.trim() || content === '<p></p>') return;
    
    setIsSaving(true);
    try {
      const tags = textUtils.extractTags(plainText);
      const readingTime = textUtils.estimateReadingTime(wordCount);
      
      if (entry) {
        // Update existing entry
        await dbService.updateEntry(entry.id, {
          content,
          plainText,
          metadata: {
            wordCount,
            readingTime,
            tags,
            mood: entry.metadata.mood
          }
        });
      } else {
        // Create new entry with target date
        const newEntry = await dbService.createEntry({
          content,
          plainText,
          metadata: {
            wordCount,
            readingTime,
            tags
          }
        }, targetDate);
        onSave?.(newEntry);
      }
      
      setLastSaved(new Date());
      // Clear session storage after successful save
      sessionStorage.remove(SESSION_KEY);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [entry, targetDate, onSave]);

  const handleManualSave = useCallback(() => {
    if (!editor) return;
    
    const content = editor.getHTML();
    const text = editor.getText();
    const words = textUtils.countWords(text);
    
    handleAutoSave(content, text, words);
  }, [editor, handleAutoSave]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    
    if (!isFullscreen) {
      // Entering fullscreen
      if (containerRef.current && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      // Exiting fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
      
      // Keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleManualSave();
            break;
          case 'Enter':
            if (e.shiftKey) {
              e.preventDefault();
              toggleFullscreen();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleManualSave, toggleFullscreen]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup autosave timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`
        ${isFullscreen 
          ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' 
          : 'relative'
        } 
        ${className}
      `}
    >
      {/* Editor Header */}
      <div className={`
        flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700
        ${isFullscreen ? 'bg-white dark:bg-gray-900' : ''}
      `}>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {wordCount} words
            {wordCount > 0 && (
              <span className="ml-2">
                {textUtils.estimateReadingTime(wordCount)} min read
              </span>
            )}
          </div>
          
          {lastSaved && (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
          
          {isSaving && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center">
              <Save className="w-3 h-3 mr-1 animate-pulse" />
              Saving...
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <SpeechToTextButton editor={editor} />
          
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen (Ctrl+Shift+Enter)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* Editor Content */}
      <div className={`
        ${isFullscreen 
          ? 'h-[calc(100vh-80px)] overflow-y-auto' 
          : 'min-h-[500px]'
        }
      `}>
        <EditorContent
          editor={editor}
          className="h-full"
        />
      </div>
      
      {/* Writing Tips (only show when not fullscreen) */}
      {!isFullscreen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>Keyboard shortcuts: <kbd>Ctrl+S</kbd> Save, <kbd>Ctrl+Shift+Enter</kbd> Fullscreen</div>
            <div>Auto-save every 30 seconds • Use #tags to organize your thoughts</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;