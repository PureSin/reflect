import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LoadingState, ModelConfig, ChatCompletion } from '../../types/ai.types'

// Mock the AI worker
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null
}

// Mock Worker constructor
global.Worker = vi.fn(() => mockWorker) as any

// Mock navigator.gpu
Object.defineProperty(navigator, 'gpu', {
  value: {
    requestAdapter: vi.fn(() => Promise.resolve({}))
  },
  configurable: true
})

// Import LLMService after mocking
import llmService from '../../services/llmService'

describe('LLMService', () => {
  // Use the singleton instance
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    llmService.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default model config', () => {
      expect(llmService).toBeDefined()
      expect(mockWorker.postMessage).not.toHaveBeenCalled()
    })

    it('should create worker instance', () => {
      expect(global.Worker).toHaveBeenCalledWith(
        expect.stringContaining('ai.worker'),
        { type: 'module' }
      )
    })

    it('should set up worker event listeners', () => {
      expect(mockWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
      expect(mockWorker.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
    })
  })

  describe('WebGPU Support Detection', () => {
    it('should check WebGPU support', async () => {
      // Mock worker response
      const checkPromise = llmService.checkWebGPUSupport()
      
      // Simulate worker response
      const responseMessage = {
        data: {
          id: 'msg_1',
          type: 'SUCCESS',
          payload: { supported: true }
        }
      }
      
      if (mockWorker.onmessage) {
        mockWorker.onmessage(responseMessage as MessageEvent)
      }
      
      const result = await checkPromise
      expect(typeof result).toBe('boolean')
    })

    it('should handle missing WebGPU API', async () => {
      // Temporarily remove WebGPU
      const originalGpu = navigator.gpu
      delete (navigator as any).gpu
      
      const result = await llmService.checkWebGPUSupport()
      
      expect(result.supported).toBe(false)
      expect(result.error).toContain('WebGPU')
      
      // Restore
      Object.defineProperty(navigator, 'gpu', {
        value: originalGpu,
        configurable: true
      })
    })

    it('should handle WebGPU adapter request failure', async () => {
      vi.mocked(navigator.gpu!.requestAdapter).mockRejectedValue(new Error('No adapter'))
      
      const result = await llmService.checkWebGPUSupport()
      
      expect(result.supported).toBe(false)
      expect(result.error).toBe('No adapter')
    })
  })

  describe('Model Loading', () => {
    it('should send load model message to worker', async () => {
      const progressCallback = vi.fn()
      llmService.setProgressCallback(progressCallback)
      
      // Start loading
      const loadPromise = llmService.loadModel()
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        id: expect.any(String),
        type: 'LOAD_MODEL',
        payload: undefined
      })
      
      // Simulate successful loading
      const successMessage = {
        data: {
          id: 'msg_1',
          type: 'SUCCESS',
          payload: { loaded: true }
        }
      }
      
      if (mockWorker.onmessage) {
        mockWorker.onmessage(successMessage as MessageEvent)
      }
      
      await loadPromise
    })

    it('should track loading progress', async () => {
      const progressCallback = vi.fn()
      llmService.setProgressCallback(progressCallback)
      
      llmService.loadModel()
      
      // Simulate progress update from worker
      const progressMessage = {
        data: {
          type: 'PROGRESS',
          payload: {
            isLoading: true,
            progress: 50,
            stage: 'downloading',
            error: null
          }
        }
      }
      
      // Trigger the message handler
      if (mockWorker.onmessage) {
        mockWorker.onmessage(progressMessage as MessageEvent)
      }
      
      expect(progressCallback).toHaveBeenCalledWith({
        isLoading: true,
        progress: 50,
        stage: 'downloading',
        error: null
      })
    })

    it('should handle model loading success', async () => {
      const progressCallback = vi.fn()
      
      const loadPromise = llmService.loadModel(progressCallback)
      
      // Simulate successful loading
      const successMessage = {
        data: {
          id: expect.any(String),
          type: 'SUCCESS',
          payload: { modelLoaded: true }
        }
      }
      
      // Trigger the message handler
      if (mockWorker.onmessage) {
        mockWorker.onmessage(successMessage as MessageEvent)
      }
      
      await expect(loadPromise).resolves.toBeUndefined()
      expect(llmService.isModelReady()).toBe(true)
    })

    it('should handle model loading error', async () => {
      const progressCallback = vi.fn()
      
      const loadPromise = llmService.loadModel(progressCallback)
      
      // Simulate error
      const errorMessage = {
        data: {
          id: expect.any(String),
          type: 'ERROR',
          payload: { message: 'Failed to load model' }
        }
      }
      
      // Trigger the message handler
      if (mockWorker.onmessage) {
        mockWorker.onmessage(errorMessage as MessageEvent)
      }
      
      await expect(loadPromise).rejects.toThrow('Failed to load model')
      expect(llmService.isModelReady()).toBe(false)
    })
  })

  describe('Chat Completion', () => {
    beforeEach(() => {
      // Mock model as ready
      vi.spyOn(llmService, 'isModelReady').mockReturnValue(true)
    })

    it('should send chat completion request to worker', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      
      const completionPromise = llmService.chatCompletion(messages, { temperature: 0.5, max_tokens: 100 })
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        id: expect.any(String),
        type: 'CHAT_COMPLETION',
        payload: {
          messages,
          options: {
            temperature: 0.5,
            max_tokens: 100,
            stream: false
          }
        }
      })
      
      // Simulate response
      const responseMessage = {
        data: {
          id: 'msg_1',
          type: 'SUCCESS',
          payload: {
            response: 'Hello there!'
          }
        }
      }
      
      if (mockWorker.onmessage) {
        mockWorker.onmessage(responseMessage as MessageEvent)
      }
      
      const result = await completionPromise
      expect(result).toBe('Hello there!')
    })

    it('should reject if model is not ready', async () => {
      vi.spyOn(llmService, 'isModelReady').mockReturnValue(false)
      
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      
      await expect(llmService.chatCompletion(messages))
        .rejects.toThrow('Model not loaded')
    })

    it('should handle chat completion error', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      
      const completionPromise = llmService.chatCompletion(messages)
      
      // Simulate error
      const errorMessage = {
        data: {
          id: 'msg_1',
          type: 'ERROR',
          payload: { error: 'Chat completion failed' }
        }
      }
      
      if (mockWorker.onmessage) {
        mockWorker.onmessage(errorMessage as MessageEvent)
      }
      
      await expect(completionPromise).rejects.toThrow('Chat completion failed')
    })
  })

  describe('Model Management', () => {
    it('should unload model', async () => {
      // Mock model as ready
      vi.spyOn(llmService, 'isModelReady').mockReturnValue(true)
      
      const unloadPromise = llmService.unloadModel()
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        id: expect.any(String),
        type: 'UNLOAD_MODEL'
      })
      
      // Simulate success
      const successMessage = {
        data: {
          id: expect.any(String),
          type: 'SUCCESS',
          payload: { modelUnloaded: true }
        }
      }
      
      if (mockWorker.onmessage) {
        mockWorker.onmessage(successMessage as MessageEvent)
      }
      
      await expect(unloadPromise).resolves.toBeUndefined()
    })

    it('should get current loading state', () => {
      const state = llmService.getLoadingState()
      
      expect(state).toEqual({
        isLoading: false,
        progress: 0,
        stage: 'idle',
        error: null
      })
    })

    it('should cleanup worker on destroy', () => {
      llmService.cleanup()
      
      expect(mockWorker.terminate).toHaveBeenCalled()
    })
  })

  describe('Text Analysis', () => {
    it('should analyze text with system prompt', async () => {
      vi.spyOn(llmService, 'isModelReady').mockReturnValue(true)
      
      const analysisPromise = llmService.analyzeText('Test content', 'You are a helpful assistant')
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        id: expect.any(String),
        type: 'CHAT_COMPLETION',
        payload: {
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Test content' }
          ],
          options: {
            temperature: 0.3,
            max_tokens: 500,
            stream: false
          }
        }
      })
      
      // Simulate response
      const responseMessage = {
        data: {
          id: 'msg_1',
          type: 'SUCCESS',
          payload: { response: 'Analysis result' }
        }
      }
      
      if (mockWorker.onmessage) {
        mockWorker.onmessage(responseMessage as MessageEvent)
      }
      
      const result = await analysisPromise
      expect(result).toBe('Analysis result')
    })

    it('should get and update model config', () => {
      const config = llmService.getModelConfig()
      expect(config.model).toBe('Qwen2.5-1.5B-Instruct-q4f32_1-MLC')
      
      llmService.updateModelConfig({ temperature: 0.5 })
      const updatedConfig = llmService.getModelConfig()
      expect(updatedConfig.temperature).toBe(0.5)
    })
  })
})