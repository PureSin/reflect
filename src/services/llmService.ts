import { LoadingState, ModelConfig, ChatCompletion } from '../types/ai.types';

/**
 * Core service for managing WebLLM via Web Worker
 * Provides on-device AI processing without blocking the main thread
 */
class LLMService {
  private worker: Worker | null = null;
  private modelConfig: ModelConfig;
  private loadingState: LoadingState = {
    isLoading: false,
    progress: 0,
    stage: 'idle',
    error: null
  };
  private progressCallback?: (state: LoadingState) => void;
  private messageCallbacks: Map<string, { resolve: Function; reject: Function }> = new Map();
  private messageCounter = 0;

  constructor() {
    this.modelConfig = {
      model: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
      model_id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
      temperature: 0.7,
      max_tokens: 1000
    };
    this.initializeWorker();
  }

  /**
   * Initialize the Web Worker for AI processing
   */
  private initializeWorker(): void {
    try {
      // Import the worker - Vite will handle the TypeScript compilation
      this.worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' });
      
      this.worker.onmessage = (event) => {
        const { id, type, payload } = event.data;
        
        if (type === 'PROGRESS') {
          this.updateLoadingState(payload);
        } else if (id && this.messageCallbacks.has(id)) {
          const { resolve, reject } = this.messageCallbacks.get(id)!;
          this.messageCallbacks.delete(id);
          
          if (type === 'SUCCESS') {
            resolve(payload);
          } else if (type === 'ERROR') {
            reject(new Error(payload.error));
          }
        }
      };
      
      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.updateLoadingState({
          isLoading: false,
          stage: 'error',
          error: 'Worker initialization failed'
        });
      };
    } catch (error) {
      console.error('Failed to initialize AI worker:', error);
      this.updateLoadingState({
        isLoading: false,
        stage: 'error',
        error: 'Web Worker not supported'
      });
    }
  }

  /**
   * Send message to worker and get response
   */
  private sendWorkerMessage(type: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      const id = `msg_${++this.messageCounter}`;
      this.messageCallbacks.set(id, { resolve, reject });
      
      // Set timeout for worker messages
      setTimeout(() => {
        if (this.messageCallbacks.has(id)) {
          this.messageCallbacks.delete(id);
          reject(new Error('Worker message timeout'));
        }
      }, 60000); // 60 second timeout
      
      this.worker.postMessage({ id, type, payload });
    });
  }

  /**
   * Check if WebGPU is supported in the current browser
   */
  async checkWebGPUSupport(): Promise<boolean> {
    try {
      const result = await this.sendWorkerMessage('CHECK_WEBGPU');
      return result.supported;
    } catch (error) {
      console.error('Error checking WebGPU support:', error);
      return false;
    }
  }

  /**
   * Set callback for progress updates during model loading
   */
  setProgressCallback(callback: (state: LoadingState) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Update loading state and notify callback
   */
  private updateLoadingState(updates: Partial<LoadingState>): void {
    this.loadingState = { ...this.loadingState, ...updates };
    if (this.progressCallback) {
      this.progressCallback(this.loadingState);
    }
  }

  /**
   * Load the WebLLM model with progress tracking
   */
  async loadModel(): Promise<void> {
    if (this.loadingState.stage === 'ready') {
      console.log('Model already loaded');
      return;
    }

    try {
      this.updateLoadingState({
        isLoading: true,
        progress: 0,
        stage: 'checking-support',
        error: null
      });

      const result = await this.sendWorkerMessage('LOAD_MODEL');
      
      if (result.loaded) {
        this.updateLoadingState({
          isLoading: false,
          progress: 100,
          stage: 'ready',
          error: null
        });
        console.log('WebLLM model loaded successfully in worker');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to load WebLLM model:', error);
      
      this.updateLoadingState({
        isLoading: false,
        progress: 0,
        stage: 'error',
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Check if the model is loaded and ready
   */
  isModelReady(): boolean {
    return this.loadingState.stage === 'ready';
  }

  /**
   * Get current loading state
   */
  getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  /**
   * Run a chat completion with the loaded model
   */
  async chatCompletion(messages: ChatCompletion['messages'], options?: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }): Promise<string> {
    if (!this.isModelReady()) {
      throw new Error('Model not loaded. Please load the model first.');
    }

    try {
      const result = await this.sendWorkerMessage('CHAT_COMPLETION', {
        messages,
        options: {
          temperature: options?.temperature ?? this.modelConfig.temperature,
          max_tokens: options?.max_tokens ?? this.modelConfig.max_tokens,
          stream: options?.stream ?? false
        }
      });

      return result.response || '';
    } catch (error) {
      console.error('Chat completion error:', error);
      throw error;
    }
  }

  /**
   * Simple text completion for analysis tasks
   */
  async analyzeText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ChatCompletion['messages'] = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });

    return this.chatCompletion(messages, {
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 500
    });
  }

  /**
   * Unload the model and free resources
   */
  async unloadModel(): Promise<void> {
    try {
      if (this.worker) {
        await this.sendWorkerMessage('UNLOAD_MODEL');
      }
      
      this.updateLoadingState({
        isLoading: false,
        progress: 0,
        stage: 'idle',
        error: null
      });
      
      console.log('Model unloaded successfully');
    } catch (error) {
      console.error('Error unloading model:', error);
    }
  }

  /**
   * Get model configuration
   */
  getModelConfig(): ModelConfig {
    return { ...this.modelConfig };
  }

  /**
   * Update model configuration
   */
  updateModelConfig(config: Partial<ModelConfig>): void {
    this.modelConfig = { ...this.modelConfig, ...config };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.messageCallbacks.clear();
  }
}

// Export singleton instance
export const llmService = new LLMService();
export default llmService;
