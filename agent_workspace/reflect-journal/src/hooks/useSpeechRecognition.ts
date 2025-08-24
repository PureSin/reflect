import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

// Extend window interface for better TypeScript support
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export const useSpeechRecognition = ({
  continuous = true,
  interimResults = true,
  lang = 'en-US',
  onResult,
  onError,
  onStart,
  onEnd
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SpeechRecognition;
    
    console.log('Speech recognition browser support check:', {
      SpeechRecognition: !!window.SpeechRecognition,
      webkitSpeechRecognition: !!window.webkitSpeechRecognition,
      supported,
      userAgent: navigator.userAgent
    });
    
    setIsSupported(supported);

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    // Initialize speech recognition
    console.log('Initializing speech recognition with config:', {
      continuous,
      interimResults,
      lang,
      maxAlternatives: 1
    });
    
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    // Handle results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('Speech recognition result event:', {
        resultIndex: event.resultIndex,
        resultsLength: event.results.length,
        event
      });
      
      let interimText = '';
      let finalText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        
        console.log('Processing result:', {
          index: i,
          isFinal: result.isFinal,
          transcript: transcriptText,
          confidence: result[0].confidence
        });
        
        if (result.isFinal) {
          finalText += transcriptText;
        } else {
          interimText += transcriptText;
        }
      }
      
      // Update state
      if (finalText) {
        const cleanFinalText = finalText.trim();
        console.log('Final text to process:', cleanFinalText);
        setFinalTranscript(prev => prev + cleanFinalText + ' ');
        setTranscript(prev => prev + cleanFinalText + ' ');
        onResult?.(cleanFinalText, true);
        setInterimTranscript(''); // Clear interim results after final
      }
      
      if (interimText && !finalText) {
        const cleanInterimText = interimText.trim();
        console.log('Interim text to process:', cleanInterimText);
        setInterimTranscript(cleanInterimText);
        onResult?.(cleanInterimText, false);
      }
      
      // Clear error on successful result
      setError(null);
    };

    // Handle start
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
      onStart?.();
    };

    // Handle end
    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      isListeningRef.current = false;
      setInterimTranscript(''); // Clear interim results
      onEnd?.();
    };

    // Handle errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event);
      
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking closer to the microphone.';
          break;
        case 'audio-capture':
          errorMessage = 'Audio capture failed. Please check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error occurred. Please check your internet connection.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition was aborted.';
          break;
        case 'bad-grammar':
          errorMessage = 'Grammar error in speech recognition.';
          break;
        case 'language-not-supported':
          errorMessage = 'Language not supported.';
          break;
        default:
          errorMessage = event.message || `Speech recognition error: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsListening(false);
      isListeningRef.current = false;
      onError?.(errorMessage);
    };

    // Handle no match
    recognition.onnomatch = () => {
      console.warn('No speech match found');
      setError('No speech was recognized. Please try again.');
    };

    // Handle audio start
    recognition.onaudiostart = () => {
      console.log('Audio started');
    };

    // Handle audio end
    recognition.onaudioend = () => {
      console.log('Audio ended');
    };

    // Handle sound start
    recognition.onsoundstart = () => {
      console.log('Sound detected');
    };

    // Handle sound end
    recognition.onsoundend = () => {
      console.log('Sound ended');
    };

    // Handle speech start
    recognition.onspeechstart = () => {
      console.log('Speech started');
      // Clear any timeout when speech is detected
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // Handle speech end
    recognition.onspeechend = () => {
      console.log('Speech ended');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [continuous, interimResults, lang, onResult, onError, onStart, onEnd]);

  const startListening = useCallback(() => {
    console.log('Starting speech recognition...', {
      isSupported,
      recognitionExists: !!recognitionRef.current,
      isCurrentlyListening: isListeningRef.current
    });
    
    if (!isSupported) {
      const errorMsg = 'Speech recognition is not supported in this browser';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (!recognitionRef.current) {
      const errorMsg = 'Speech recognition is not initialized';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (isListeningRef.current) {
      console.log('Speech recognition is already active');
      return;
    }

    try {
      console.log('Clearing previous state and starting recognition...');
      setError(null);
      setInterimTranscript('');
      
      // Set a timeout to automatically stop if no speech is detected
      timeoutRef.current = setTimeout(() => {
        if (isListeningRef.current) {
          console.log('Stopping speech recognition due to timeout (30 seconds)');
          stopListening();
        }
      }, 30000); // 30 second timeout
      
      // Add a small delay to ensure browser is ready
      setTimeout(() => {
        if (recognitionRef.current && !isListeningRef.current) {
          console.log('Calling recognition.start()');
          recognitionRef.current.start();
        }
      }, 100);
      
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setError('Failed to start speech recognition. Please try again.');
      setIsListening(false);
      isListeningRef.current = false;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      console.log('Stopping speech recognition...');
      recognitionRef.current.stop();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
};

export default useSpeechRecognition;
