import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with testing-library matchers
expect.extend(matchers)

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock IndexedDB for testing
const mockIndexedDB = (() => {
  let store: { [key: string]: any } = {}
  
  return {
    open: () => ({
      result: {
        createObjectStore: () => ({}),
        transaction: () => ({
          objectStore: () => ({
            add: (value: any) => ({ result: value }),
            get: (key: string) => ({ result: store[key] }),
            put: (value: any) => { store[value.id] = value; return { result: value } },
            delete: (key: string) => { delete store[key]; return { result: undefined } },
            getAll: () => ({ result: Object.values(store) })
          })
        })
      },
      addEventListener: () => {},
      removeEventListener: () => {}
    }),
    deleteDatabase: () => ({ result: undefined })
  }
})()

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB
})

// Mock Web Workers
class MockWorker {
  url: string
  onmessage: ((event: MessageEvent) => void) | null = null
  
  constructor(url: string) {
    this.url = url
  }
  
  postMessage(message: any) {
    // Mock worker responses
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data: { type: 'SUCCESS', payload: {} } }))
      }
    }, 0)
  }
  
  terminate() {}
}

Object.defineProperty(window, 'Worker', {
  value: MockWorker
})

// Mock navigator.gpu for WebGPU tests
Object.defineProperty(navigator, 'gpu', {
  value: {
    requestAdapter: () => Promise.resolve(null)
  }
})

// Mock SpeechRecognition
const mockSpeechRecognition = {
  start: () => {},
  stop: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
}

Object.defineProperty(window, 'SpeechRecognition', {
  value: function() { return mockSpeechRecognition }
})

Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: function() { return mockSpeechRecognition }
})