/**
 * Web Worker for AI processing using WebLLM
 * Handles all AI operations off the main thread to prevent UI blocking
 */

// Import WebLLM types and functions
import * as webllm from '@mlc-ai/web-llm';

// Types for worker communication
interface WorkerMessage {
  id: string;
  type: 'LOAD_MODEL' | 'CHAT_COMPLETION' | 'UNLOAD_MODEL' | 'CHECK_WEBGPU';
  payload?: any;
}

interface WorkerResponse {
  id?: string;
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
  payload?: any;
}

class AIWorker {
  private engine: webllm.MLCEngine | null = null;
  private modelConfig = {
    model: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    model_id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    temperature: 0.7,
    max_tokens: 1000
  };

  constructor() {
    // Listen for messages from main thread
    self.addEventListener('message', this.handleMessage.bind(this));
    console.log('AI Worker initialized');
  }

  private async handleMessage(event: MessageEvent<WorkerMessage>) {
    const { id, type, payload } = event.data;

    try {
      switch (type) {
        case 'CHECK_WEBGPU':
          const supported = await this.checkWebGPUSupport();
          this.postResponse('SUCCESS', { supported }, id);
          break;

        case 'LOAD_MODEL':
          await this.loadModel(id);
          break;

        case 'CHAT_COMPLETION':
          const chatResult = await this.chatCompletion(payload.messages, payload.options);
          this.postResponse('SUCCESS', { response: chatResult }, id);
          break;

        case 'UNLOAD_MODEL':
          await this.unloadModel();
          this.postResponse('SUCCESS', { unloaded: true }, id);
          break;

        default:
          throw new Error(`Unknown message type: ${type}`);
      }
    } catch (error) {
      this.postResponse('ERROR', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, id);
    }
  }

  private postResponse(type: WorkerResponse['type'], payload: any, id?: string) {
    const response: WorkerResponse = {
      id,
      type,
      payload
    };
    self.postMessage(response);
  }

  private async checkWebGPUSupport(): Promise<boolean> {
    try {
      // Check if WebGPU is available in the worker context
      const navigator_any = self.navigator as any;
      if (!navigator_any.gpu) {
        return false;
      }

      const adapter = await navigator_any.gpu.requestAdapter();
      return !!adapter;
    } catch (error) {
      console.error('WebGPU check failed in worker:', error);
      return false;
    }
  }

  private async loadModel(requestId: string): Promise<void> {
    if (this.engine) {
      this.postResponse('SUCCESS', { loaded: true }, requestId);
      return;
    }

    try {
      // Check WebGPU support first
      const hasWebGPU = await this.checkWebGPUSupport();
      if (!hasWebGPU) {
        throw new Error('WebGPU not supported in this environment');
      }

      this.postResponse('PROGRESS', { 
        progress: 10, 
        stage: 'checking-support',
        isLoading: true,
        error: null
      });

      // Initialize the WebLLM engine with progress callback
      const initProgressCallback = (report: any) => {
        console.log('Model loading progress:', report);
        
        let progress = 10;
        let stage = 'initializing';
        
        if (report.text.includes('fetching')) {
          progress = 20 + (report.progress || 0) * 0.5; // 20-70%
          stage = 'downloading';
        } else if (report.text.includes('loading')) {
          progress = 70 + (report.progress || 0) * 0.2; // 70-90%
          stage = 'loading';
        } else if (report.text.includes('compiling')) {
          progress = 90 + (report.progress || 0) * 0.1; // 90-100%
          stage = 'compiling';
        }
        
        this.postResponse('PROGRESS', {
          progress: Math.min(progress, 100),
          stage,
          isLoading: true,
          error: null
        });
      };

      // Create and initialize the engine
      this.engine = await webllm.CreateMLCEngine(
        this.modelConfig.model,
        {
          initProgressCallback,
          logLevel: 'INFO'
        }
      );
      
      this.postResponse('PROGRESS', { 
        progress: 100, 
        stage: 'ready',
        isLoading: false,
        error: null
      });
      
      this.postResponse('SUCCESS', { loaded: true }, requestId);
      console.log('Model loaded successfully in worker');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Model loading failed in worker:', error);
      
      this.postResponse('PROGRESS', {
        progress: 0,
        stage: 'error',
        isLoading: false,
        error: errorMessage
      });
      
      throw new Error(`Model loading failed: ${errorMessage}`);
    }
  }

  private async chatCompletion(messages: any[], options?: any): Promise<string> {
    if (!this.engine) {
      throw new Error('Model not loaded');
    }

    try {
      const completion = await this.engine.chat.completions.create({
        messages,
        model: this.modelConfig.model_id,
        temperature: options?.temperature ?? this.modelConfig.temperature,
        max_tokens: options?.max_tokens ?? this.modelConfig.max_tokens,
        stream: false
      });

      if ('choices' in completion && completion.choices.length > 0) {
        return completion.choices[0].message?.content || '';
      }

      throw new Error('No response generated');
    } catch (error) {
      console.error('Chat completion failed in worker:', error);
      throw error;
    }
  }

  private async unloadModel(): Promise<void> {
    if (this.engine) {
      try {
        // Note: WebLLM may not have an explicit unload method
        // Setting to null will allow garbage collection
        this.engine = null;
        console.log('Model unloaded in worker');
      } catch (error) {
        console.error('Error unloading model:', error);
        // Don't throw - we still want to clean up the reference
        this.engine = null;
      }
    }
  }
}

// Initialize the worker
new AIWorker();
