import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { LoadingState, ModelConfig } from '../types/ai.types';
import { llmService } from '../services/llmService';

interface LLMContextType {
  // Loading state
  loadingState: LoadingState;
  isModelReady: boolean;
  
  // Model management
  loadModel: () => Promise<void>;
  unloadModel: () => Promise<void>;
  
  // Analysis functions
  analyzeText: (prompt: string, systemPrompt?: string) => Promise<string>;
  chatCompletion: (messages: any[], options?: any) => Promise<string>;
  
  // Configuration
  modelConfig: ModelConfig;
  updateModelConfig: (config: Partial<ModelConfig>) => void;
  
  // WebGPU support
  webGPUSupported: boolean | null;
  checkWebGPUSupport: () => Promise<boolean>;
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

interface LLMProviderProps {
  children: ReactNode;
}

export const LLMProvider: React.FC<LLMProviderProps> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    stage: 'idle',
    error: null
  });
  const [isModelReady, setIsModelReady] = useState(false);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(llmService.getModelConfig());

  // Set up progress callback
  useEffect(() => {
    llmService.setProgressCallback((state: LoadingState) => {
      setLoadingState(state);
      setIsModelReady(state.stage === 'ready');
    });

    // Initialize with current state
    setLoadingState(llmService.getLoadingState());
    setIsModelReady(llmService.isModelReady());
  }, []);

  // Check WebGPU support on mount
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await llmService.checkWebGPUSupport();
        setWebGPUSupported(supported);
      } catch (error) {
        console.error('Error checking WebGPU support:', error);
        setWebGPUSupported(false);
      }
    };

    checkSupport();
  }, []);

  const loadModel = useCallback(async () => {
    try {
      await llmService.loadModel();
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }, []);

  const unloadModel = useCallback(async () => {
    try {
      await llmService.unloadModel();
    } catch (error) {
      console.error('Failed to unload model:', error);
      throw error;
    }
  }, []);

  const analyzeText = useCallback(async (prompt: string, systemPrompt?: string) => {
    if (!isModelReady) {
      throw new Error('Model not ready. Please load the model first.');
    }
    return llmService.analyzeText(prompt, systemPrompt);
  }, [isModelReady]);

  const chatCompletion = useCallback(async (messages: any[], options?: any) => {
    if (!isModelReady) {
      throw new Error('Model not ready. Please load the model first.');
    }
    return llmService.chatCompletion(messages, options);
  }, [isModelReady]);

  const updateModelConfig = useCallback((config: Partial<ModelConfig>) => {
    llmService.updateModelConfig(config);
    setModelConfig(llmService.getModelConfig());
  }, []);

  const checkWebGPUSupport = useCallback(async () => {
    const supported = await llmService.checkWebGPUSupport();
    setWebGPUSupported(supported);
    return supported;
  }, []);

  const contextValue: LLMContextType = {
    loadingState,
    isModelReady,
    loadModel,
    unloadModel,
    analyzeText,
    chatCompletion,
    modelConfig,
    updateModelConfig,
    webGPUSupported,
    checkWebGPUSupport
  };

  return (
    <LLMContext.Provider value={contextValue}>
      {children}
    </LLMContext.Provider>
  );
};

/**
 * Hook to access LLM context
 */
export const useLLM = (): LLMContextType => {
  const context = useContext(LLMContext);
  if (context === undefined) {
    throw new Error('useLLM must be used within an LLMProvider');
  }
  return context;
};

export default LLMContext;
