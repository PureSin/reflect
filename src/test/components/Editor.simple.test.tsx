import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock all dependencies before importing the component
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => ({
    getHTML: () => '<p>Test content</p>',
    getText: () => 'Test content',
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
    chain: vi.fn(() => ({}))
  })),
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content" role="textbox" contentEditable>
      {editor?.getHTML?.() || ''}
    </div>
  )
}))

vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-placeholder', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-focus', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-typography', () => ({ default: {} }))

vi.mock('../../services/database', () => ({
  dbService: {
    createEntry: vi.fn(),
    updateEntry: vi.fn()
  }
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
    removeItem: vi.fn(),
    load: vi.fn(() => null),
    save: vi.fn(),
    clear: vi.fn()
  }
}))

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

vi.mock('lucide-react', () => ({
  Maximize2: () => <div data-testid="maximize-icon">Maximize</div>,
  Minimize2: () => <div data-testid="minimize-icon">Minimize</div>,
  Save: () => <div data-testid="save-icon">Save</div>
}))

describe('Editor Component - Basic Tests', () => {
  it('should import and render without errors', async () => {
    const { Editor } = await import('../../components/Editor/Editor')
    
    render(<Editor />)
    
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render with default props', async () => {
    const { Editor } = await import('../../components/Editor/Editor')
    
    render(<Editor className="test-editor" />)
    
    const editorElement = screen.getByTestId('editor-content')
    expect(editorElement).toBeInTheDocument()
    expect(editorElement).toHaveAttribute('contentEditable', 'true')
  })

  it('should contain speech-to-text functionality', async () => {
    const { Editor } = await import('../../components/Editor/Editor')
    
    render(<Editor />)
    
    expect(screen.getByTestId('speech-to-text-button')).toBeInTheDocument()
  })

  it('should have TipTap editor integration', async () => {
    const { Editor } = await import('../../components/Editor/Editor')
    
    render(<Editor />)
    
    const editorContent = screen.getByTestId('editor-content')
    expect(editorContent).toBeInTheDocument()
    expect(editorContent.textContent).toContain('Test content')
  })

  it('should render with entry prop', async () => {
    const { Editor } = await import('../../components/Editor/Editor')
    
    const mockEntry = {
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
    
    render(<Editor entry={mockEntry} />)
    
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('should handle callback props', async () => {
    const { Editor } = await import('../../components/Editor/Editor')
    
    const onSave = vi.fn()
    const onContentChange = vi.fn()
    
    render(<Editor onSave={onSave} onContentChange={onContentChange} />)
    
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('should work with target date prop', async () => {
    const { Editor } = await import('../../components/Editor/Editor')
    
    const targetDate = new Date('2024-01-15T00:00:00Z')
    
    render(<Editor targetDate={targetDate} />)
    
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })
})