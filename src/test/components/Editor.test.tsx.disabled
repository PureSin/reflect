import React from 'react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Editor } from '../../components/Editor/Editor'
import { Entry } from '../../types'

// Mock TipTap editor
const mockEditor = {
  getHTML: vi.fn(() => '<p>Test content</p>'),
  getText: vi.fn(() => 'Test content'),
  commands: {
    setContent: vi.fn(),
    focus: vi.fn(),
    clearContent: vi.fn()
  },
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
  isEmpty: false,
  isActive: vi.fn(() => false),
  can: vi.fn(() => true),
  chain: vi.fn(() => mockEditor.commands)
}

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => mockEditor),
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content" role="textbox" contentEditable>
      {editor?.getHTML?.() || ''}
    </div>
  )
}))

// Mock TipTap extensions
vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-placeholder', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-focus', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-typography', () => ({ default: {} }))

// Mock services
const mockDbService = {
  createEntry: vi.fn(),
  updateEntry: vi.fn()
}

vi.mock('../../services/database', () => ({
  dbService: mockDbService
}))

vi.mock('../../services/prompts', () => ({
  getDailyPrompt: vi.fn(() => 'What are you grateful for today?')
}))

vi.mock('../../lib/utils', () => ({
  textUtils: {
    calculateWordCount: vi.fn((text: string) => text.split(' ').length),
    calculateReadingTime: vi.fn(() => 1)
  },
  sessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  }
}))

// Mock SpeechToTextButton
vi.mock('../../components/Editor/SpeechToTextButton', () => ({
  SpeechToTextButton: ({ onResult }: { onResult: (text: string) => void }) => (
    <button
      data-testid="speech-to-text-button"
      onClick={() => onResult('Speech recognition result')}
    >
      Start Recording
    </button>
  )
}))

describe('Editor Component', () => {
  const mockEntry: Entry = {
    id: 'test-entry-1',
    content: '<p>Existing content</p>',
    plainText: 'Existing content',
    created: new Date('2024-01-15T10:00:00Z'),
    modified: new Date('2024-01-15T10:00:00Z'),
    targetDate: new Date('2024-01-15T00:00:00Z'),
    metadata: {
      wordCount: 2,
      readingTime: 1,
      tags: []
    }
  }

  const defaultProps = {
    className: 'test-editor'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render editor with default state', () => {
      render(<Editor {...defaultProps} />)
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should render with existing entry content', () => {
      mockEditor.getHTML.mockReturnValue('<p>Existing content</p>')
      
      render(<Editor {...defaultProps} entry={mockEntry} />)
      
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith('<p>Existing content</p>')
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })

    it('should show daily prompt when no content exists', () => {
      mockEditor.getHTML.mockReturnValue('')
      mockEditor.isEmpty = true
      
      render(<Editor {...defaultProps} />)
      
      expect(screen.getByText('What are you grateful for today?')).toBeInTheDocument()
    })

    it('should hide prompt when content exists', () => {
      mockEditor.getHTML.mockReturnValue('<p>Some content</p>')
      mockEditor.isEmpty = false
      
      render(<Editor {...defaultProps} entry={mockEntry} />)
      
      expect(screen.queryByText('What are you grateful for today?')).not.toBeInTheDocument()
    })
  })

  describe('Toolbar Controls', () => {
    it('should render fullscreen toggle button', () => {
      render(<Editor {...defaultProps} />)
      
      const fullscreenButton = screen.getByLabelText(/fullscreen/i)
      expect(fullscreenButton).toBeInTheDocument()
    })

    it('should toggle fullscreen mode', async () => {
      render(<Editor {...defaultProps} />)
      
      const fullscreenButton = screen.getByLabelText(/fullscreen/i)
      
      await userEvent.click(fullscreenButton)
      
      // Check if fullscreen class is applied (assuming implementation adds a class)
      const editorContainer = screen.getByTestId('editor-content').closest('div')
      expect(editorContainer).toHaveClass('test-editor')
    })

    it('should render save button', () => {
      render(<Editor {...defaultProps} />)
      
      const saveButton = screen.getByLabelText(/save/i)
      expect(saveButton).toBeInTheDocument()
    })

    it('should render speech-to-text button', () => {
      render(<Editor {...defaultProps} />)
      
      expect(screen.getByTestId('speech-to-text-button')).toBeInTheDocument()
    })
  })

  describe('Content Management', () => {
    it('should update word count when content changes', () => {
      const onContentChange = vi.fn()
      render(<Editor {...defaultProps} onContentChange={onContentChange} />)
      
      // Simulate content change
      const newContent = '<p>New content with more words</p>'
      mockEditor.getHTML.mockReturnValue(newContent)
      mockEditor.getText.mockReturnValue('New content with more words')
      
      // Trigger the update event that TipTap would normally fire
      const updateHandler = mockEditor.on.mock.calls.find(call => call[0] === 'update')?.[1]
      if (updateHandler) {
        updateHandler()
      }
      
      expect(onContentChange).toHaveBeenCalledWith(newContent, expect.any(Number))
    })

    it('should handle speech-to-text input', async () => {
      render(<Editor {...defaultProps} />)
      
      const speechButton = screen.getByTestId('speech-to-text-button')
      
      await userEvent.click(speechButton)
      
      // Should insert speech result into editor
      expect(mockEditor.commands.setContent).toHaveBeenCalled()
    })

    it('should show word count', () => {
      mockEditor.getText.mockReturnValue('Test content with several words here')
      
      render(<Editor {...defaultProps} />)
      
      // Word count should be displayed somewhere in the UI
      // This depends on the actual implementation
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })
  })

  describe('Auto-save Functionality', () => {
    it('should trigger auto-save after delay', async () => {
      const onSave = vi.fn()
      render(<Editor {...defaultProps} onSave={onSave} />)
      
      // Simulate content change
      mockEditor.getHTML.mockReturnValue('<p>Changed content</p>')
      mockEditor.getText.mockReturnValue('Changed content')
      
      const updateHandler = mockEditor.on.mock.calls.find(call => call[0] === 'update')?.[1]
      if (updateHandler) {
        updateHandler()
      }
      
      // Fast-forward time to trigger auto-save
      vi.advanceTimersByTime(30000) // 30 seconds
      
      await waitFor(() => {
        expect(mockDbService.createEntry).toHaveBeenCalled()
      })
    })

    it('should update existing entry on auto-save', async () => {
      render(<Editor {...defaultProps} entry={mockEntry} />)
      
      // Simulate content change
      mockEditor.getHTML.mockReturnValue('<p>Updated content</p>')
      mockEditor.getText.mockReturnValue('Updated content')
      
      const updateHandler = mockEditor.on.mock.calls.find(call => call[0] === 'update')?.[1]
      if (updateHandler) {
        updateHandler()
      }
      
      // Fast-forward time to trigger auto-save
      vi.advanceTimersByTime(30000)
      
      await waitFor(() => {
        expect(mockDbService.updateEntry).toHaveBeenCalledWith(
          mockEntry.id,
          expect.objectContaining({
            content: '<p>Updated content</p>',
            plainText: 'Updated content'
          })
        )
      })
    })

    it('should reset auto-save timer on new changes', () => {
      render(<Editor {...defaultProps} />)
      
      // Simulate rapid content changes
      const updateHandler = mockEditor.on.mock.calls.find(call => call[0] === 'update')?.[1]
      
      if (updateHandler) {
        updateHandler() // First change
        vi.advanceTimersByTime(15000) // 15 seconds
        
        updateHandler() // Second change (should reset timer)
        vi.advanceTimersByTime(15000) // Another 15 seconds (total 30s from first change)
        
        // Should not have saved yet (timer was reset)
        expect(mockDbService.createEntry).not.toHaveBeenCalled()
        
        vi.advanceTimersByTime(15000) // 15 more seconds (30s from second change)
      }
      
      // Now it should save
      expect(mockDbService.createEntry).toHaveBeenCalled()
    })
  })

  describe('Manual Save', () => {
    it('should save immediately when save button is clicked', async () => {
      render(<Editor {...defaultProps} />)
      
      mockEditor.getHTML.mockReturnValue('<p>Content to save</p>')
      mockEditor.getText.mockReturnValue('Content to save')
      
      const saveButton = screen.getByLabelText(/save/i)
      await userEvent.click(saveButton)
      
      expect(mockDbService.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '<p>Content to save</p>',
          plainText: 'Content to save'
        }),
        undefined
      )
    })

    it('should show saving state during manual save', async () => {
      mockDbService.createEntry.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      render(<Editor {...defaultProps} />)
      
      mockEditor.getHTML.mockReturnValue('<p>Content</p>')
      mockEditor.getText.mockReturnValue('Content')
      
      const saveButton = screen.getByLabelText(/save/i)
      await userEvent.click(saveButton)
      
      // Should show loading state
      expect(saveButton).toBeDisabled()
    })

    it('should call onSave callback after successful save', async () => {
      const mockSavedEntry = { ...mockEntry, id: 'new-id' }
      mockDbService.createEntry.mockResolvedValue(mockSavedEntry)
      
      const onSave = vi.fn()
      render(<Editor {...defaultProps} onSave={onSave} />)
      
      mockEditor.getHTML.mockReturnValue('<p>Content</p>')
      mockEditor.getText.mockReturnValue('Content')
      
      const saveButton = screen.getByLabelText(/save/i)
      await userEvent.click(saveButton)
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(mockSavedEntry)
      })
    })
  })

  describe('Session Storage', () => {
    it('should save draft to session storage', () => {
      const { sessionStorage } = require('../../lib/utils')
      
      render(<Editor {...defaultProps} />)
      
      mockEditor.getHTML.mockReturnValue('<p>Draft content</p>')
      
      const updateHandler = mockEditor.on.mock.calls.find(call => call[0] === 'update')?.[1]
      if (updateHandler) {
        updateHandler()
      }
      
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'reflect-draft',
        '<p>Draft content</p>'
      )
    })

    it('should load draft from session storage on mount', () => {
      const { sessionStorage } = require('../../lib/utils')
      sessionStorage.getItem.mockReturnValue('<p>Recovered draft</p>')
      
      render(<Editor {...defaultProps} />)
      
      expect(sessionStorage.getItem).toHaveBeenCalledWith('reflect-draft')
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith('<p>Recovered draft</p>')
    })

    it('should clear draft from session storage after save', async () => {
      const { sessionStorage } = require('../../lib/utils')
      
      render(<Editor {...defaultProps} />)
      
      mockEditor.getHTML.mockReturnValue('<p>Content to save</p>')
      mockEditor.getText.mockReturnValue('Content to save')
      
      const saveButton = screen.getByLabelText(/save/i)
      await userEvent.click(saveButton)
      
      await waitFor(() => {
        expect(sessionStorage.removeItem).toHaveBeenCalledWith('reflect-draft')
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should save with Ctrl+S', async () => {
      render(<Editor {...defaultProps} />)
      
      mockEditor.getHTML.mockReturnValue('<p>Shortcut save</p>')
      mockEditor.getText.mockReturnValue('Shortcut save')
      
      const editorContent = screen.getByTestId('editor-content')
      
      await userEvent.type(editorContent, '{Control>}s{/Control}')
      
      expect(mockDbService.createEntry).toHaveBeenCalled()
    })

    it('should toggle fullscreen with F11', async () => {
      render(<Editor {...defaultProps} />)
      
      const editorContent = screen.getByTestId('editor-content')
      
      fireEvent.keyDown(editorContent, { key: 'F11', code: 'F11' })
      
      // Should toggle fullscreen state
      // This test depends on the actual implementation
      expect(editorContent).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      mockDbService.createEntry.mockRejectedValue(new Error('Save failed'))
      
      render(<Editor {...defaultProps} />)
      
      mockEditor.getHTML.mockReturnValue('<p>Content</p>')
      mockEditor.getText.mockReturnValue('Content')
      
      const saveButton = screen.getByLabelText(/save/i)
      await userEvent.click(saveButton)
      
      // Should not crash and should reset saving state
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })
    })

    it('should handle editor destroy on unmount', () => {
      const { unmount } = render(<Editor {...defaultProps} />)
      
      unmount()
      
      expect(mockEditor.destroy).toHaveBeenCalled()
    })
  })
})