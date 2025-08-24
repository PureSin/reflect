import * as webllm from '@mlc-ai/web-llm';
import { LoadingState, ModelConfig, ChatCompletion } from '../types/ai.types';

/**
 * Core service for managing WebLLM model loading and inference
 * Provides on-device AI processing with privacy-first approach
 */
class LLMService {
  private engine: webllm.MLCEngine | null = null;
  private modelConfig: ModelConfig;
  private loadingState: LoadingState = {
    isLoading: false,
    progress: 0,
    stage: 'idle',
    error: null
  };
  private progressCallback?: (state: LoadingState) => void;

  constructor() {
    this.modelConfig = {
      model: 'Qwen/Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
      model_id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
      temperature: 0.7,
      max_tokens: 1000
    };
  }

  /**
   * Check if WebGPU is supported in the current browser
   */
  async checkWebGPUSupport(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported in this browser');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn('WebGPU adapter not available');
        return false;
      }

      console.log('WebGPU support detected');
      return true;
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
    if (this.engine) {
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

      // Check WebGPU support
      const hasWebGPU = await this.checkWebGPUSupport();
      if (!hasWebGPU) {
        throw new Error('WebGPU not supported. Please use a compatible browser with WebGPU enabled.');
      }

      this.updateLoadingState({
        progress: 10,
        stage: 'initializing'
      });

      // Initialize the engine with progress callback
      this.engine = new webllm.MLCEngine();
      
      this.updateLoadingState({
        progress: 20,
        stage: 'downloading'
      });

      // Set up progress monitoring for model loading
      const initProgressCallback = (report: webllm.InitProgressReport) => {
        const progressPercentage = Math.round(report.progress * 100);
        let stage: LoadingState['stage'] = 'downloading';
        
        if (report.text.includes('Loading model')) {
          stage = 'loading';
        } else if (report.text.includes('Compiling')) {
          stage = 'compiling';
        } else if (report.text.includes('Initializing')) {
          stage = 'initializing';
        }

        this.updateLoadingState({
          progress: 20 + (progressPercentage * 0.8), // Map to 20-100%
          stage
        });
      };

      // Load the model
      await this.engine.reload(this.modelConfig.model, undefined, {
        initProgressCallback
      });

      this.updateLoadingState({
        isLoading: false,
        progress: 100,
        stage: 'ready',
        error: null
      });

      console.log('WebLLM model loaded successfully');
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
    return this.engine !== null && this.loadingState.stage === 'ready';
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
    if (!this.engine) {
      throw new Error('Model not loaded. Please load the model first.');
    }

    try {
      const completion = await this.engine.chat.completions.create({
        messages,
        model: this.modelConfig.model_id,
        temperature: options?.temperature ?? this.modelConfig.temperature,
        max_tokens: options?.max_tokens ?? this.modelConfig.max_tokens,
        stream: options?.stream ?? false
      });

      if ('choices' in completion && completion.choices.length > 0) {
        return completion.choices[0].message?.content || '';
      }

      throw new Error('No response generated');
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
    if (this.engine) {
      try {
        await this.engine.unload();
        this.engine = null;
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
}

// Export singleton instance
export const llmService = new LLMService();
export default llmService;
