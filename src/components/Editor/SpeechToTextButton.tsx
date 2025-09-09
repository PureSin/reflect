import React, { useCallback, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Editor } from '@tiptap/react';

interface SpeechToTextButtonProps {
  editor: Editor | null;
  className?: string;
}

export const SpeechToTextButton: React.FC<SpeechToTextButtonProps> = ({
  editor,
  className = ''
}) => {
  // Define callback functions BEFORE using them in the hook
  const handleSpeechResult = useCallback((transcript: string, isFinal: boolean) => {
    console.log('Speech result received:', { transcript, isFinal, editorExists: !!editor });
    
    if (!editor || !transcript.trim()) {
      console.log('Skipping speech result - no editor or empty transcript');
      return;
    }

    try {
      if (isFinal) {
        // Insert final transcript at current cursor position
        const currentPos = editor.state.selection.from;
        const textToInsert = transcript.trim();
        
        // Add a space before if cursor is not at the beginning and previous char is not a space
        const docText = editor.state.doc.textContent;
        const needsSpaceBefore = currentPos > 0 && docText.charAt(currentPos - 1) !== ' ' && docText.charAt(currentPos - 1) !== '';
        const finalText = (needsSpaceBefore ? ' ' : '') + textToInsert + ' ';
        
        console.log('Inserting final text at position:', currentPos, 'Text:', finalText);
        
        // Insert the text and update cursor position
        editor
          .chain()
          .focus()
          .insertContentAt(currentPos, finalText)
          .run();
        
        console.log('Text inserted successfully');
      } else {
        // Handle interim results - show them visually but don't insert yet
        console.log('Interim result:', transcript);
      }
    } catch (error) {
      console.error('Error inserting speech text into editor:', error);
    }
  }, [editor]);

  const handleSpeechError = useCallback((errorMessage: string) => {
    console.error('Speech recognition error:', errorMessage);
    // Error handling is managed by the hook
  }, []);

  const {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: 'en-US',
    onResult: handleSpeechResult,
    onError: handleSpeechError
  });

  const handleToggleListening = useCallback(() => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (!editor) {
      console.warn('Editor not available');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      // Focus editor before starting speech recognition
      editor.commands.focus();
      startListening();
    }
  }, [isListening, isSupported, editor, startListening, stopListening]);

  // Show error notification
  useEffect(() => {
    if (error) {
      console.error('Speech recognition error:', error);
      // You could show a toast notification here
    }
  }, [error]);

  if (!isSupported) {
    return (
      <button
        className={`p-2 text-gray-400 cursor-not-allowed ${className}`}
        disabled
        title="Speech recognition not supported in this browser"
      >
        <MicOff className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggleListening}
        className={`
          p-2 transition-colors rounded-md relative
          ${isListening 
            ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30' 
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }
          ${error ? 'text-red-500' : ''}
          ${className}
        `}
        title={isListening ? 'Stop voice input (Click to stop)' : 'Start voice input (Click to speak)'}
      >
        {isListening ? (
          <>
            <Mic className="w-4 h-4" />
            {/* Listening indicator */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            {error && (
              <AlertCircle className="absolute -top-1 -right-1 w-3 h-3 text-red-500" />
            )}
          </>
        )}
      </button>
      
      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-red-600 text-white text-xs rounded whitespace-nowrap z-10">
          {error}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-600" />
        </div>
      )}
      
      {/* Listening status indicator */}
      {isListening && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-green-600 text-white text-xs rounded whitespace-nowrap z-10">
          Listening... Speak now
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-green-600" />
        </div>
      )}
    </div>
  );
};

export default SpeechToTextButton;
