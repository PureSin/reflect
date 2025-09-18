# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The main application is now located in the root directory.

### Core Development
- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production  
- `pnpm run build:prod` - Build for production with optimizations
- `pnpm run lint` - Run ESLint code linting
- `pnpm run preview` - Preview production build

### Testing
- `pnpm run test` - Run unit and component tests
- `pnpm run test:ui` - Interactive test UI with Vitest
- `pnpm run test:coverage` - Generate test coverage report
- `pnpm run test:e2e` - Run end-to-end tests with Playwright
- `pnpm run test:e2e:ui` - Interactive E2E test runner

### Dependencies
All commands automatically run `pnpm install` first. Use pnpm as the package manager (not npm).

## Architecture Overview

### Application Structure
This is a privacy-focused, local-first journaling application built with React 18, TypeScript, and Vite.

### Key Technical Decisions
- **Local-First Storage**: All data stored in IndexedDB via Dexie.js - no external servers
- **AI Integration**: WebLLM (@mlc-ai/web-llm) for on-device AI analysis via Web Workers
- **Rich Text Editing**: TipTap editor with markdown support
- **Styling**: Tailwind CSS with shadcn/ui components
- **Search**: FlexSearch for full-text search across entries

### Data Layer (`src/services/database.ts`)
- **Primary Storage**: IndexedDB with versioned schema migrations
- **Core Tables**: entries, preferences, aiAnalyses, weeklySummaries, weeklySummaryAnalyses
- **Entry Model**: Each entry has targetDate (intended date) vs created (actual creation time)
- **Search Integration**: Automatic indexing with FlexSearch

### AI System Architecture
- **LLM Service** (`src/services/llmService.ts`): Manages WebLLM via Web Worker
- **AI Worker** (`src/workers/ai.worker.ts`): Isolates AI processing from main thread
- **Model**: Qwen2.5-1.5B-Instruct-q4f32_1-MLC (on-device, no external API)
- **Analysis Types**: Sentiment analysis, mood tracking, weekly summaries

### Component Structure
- **Pages**: React Router 6 with page components in `src/pages/`
- **Components**: Organized by feature in `src/components/` (AI/, Calendar/, Editor/, etc.)
- **UI Components**: shadcn/ui components in `src/components/ui/`
- **Services**: Business logic in `src/services/` (database, LLM, search, etc.)

### State Management
- **Local Storage**: IndexedDB for persistence
- **Preferences**: Managed via custom hooks (`usePreferences.ts`)
- **LLM Context**: React Context for AI state management (`src/contexts/LLMContext.tsx`)

### Build Configuration
- **Vite 6** with React plugin
- **Path Mapping**: `@/` aliases to `./src/`
- **Bundle Optimization**: Manual chunks for vendor, tiptap, and icons
- **TypeScript**: Strict mode with project references

### Import Conventions
- Use `@/` path alias for all src imports
- Components export via index files
- Services export singleton instances
- Types defined in dedicated `types/` folder

## Development Guidelines

### Working with AI Features
- AI processing runs in Web Worker to avoid blocking UI
- Always check `isModelReady()` before running AI analysis
- Handle loading states and progress updates via callbacks
- WebGPU support check required for optimal performance

### Database Operations
- Use `dbService` methods for all data operations
- Entry dates: `targetDate` for intended date, `created` for actual creation
- Search automatically indexes content - use `searchService` for queries
- Weekly summaries follow ISO week format (Monday to Sunday)

### TypeScript Development
- Strict typing enforced
- Main types in `src/types/index.ts`
- AI-specific types in `src/types/ai.types.ts`
- Weekly summary types in `src/types/weekly.types.ts`

## Testing Architecture

### Testing Framework
- **Vitest** - Fast unit testing with TypeScript support and jsdom environment
- **React Testing Library** - Component testing with user interaction simulation
- **Playwright** - End-to-end testing across Chrome, Firefox, and Safari
- **MSW** - Mock Service Worker for API and dependency mocking

### Test Structure
```
src/test/
├── components/          # Component tests
│   ├── Editor.simple.test.tsx
│   └── Calendar.simple.test.tsx
├── services/           # Service layer tests
│   ├── database.simple.test.ts
│   ├── llmService.test.ts
│   ├── sentimentService.test.ts
│   └── searchService.test.ts
└── setup.ts           # Global test configuration

e2e/
└── journal-workflow.spec.ts  # End-to-end user journeys
```

### Testing Guidelines
- **Unit Tests**: Focus on individual service methods and utilities
- **Component Tests**: Test rendering, props, and user interactions
- **Integration Tests**: Test component integration with services
- **E2E Tests**: Test complete user workflows and cross-browser compatibility
- **Mocking**: All external dependencies (IndexedDB, WebLLM, TipTap) are mocked
- **Coverage**: Aim for critical path coverage of database, AI, and editor functionality

### Running Tests
- Use `pnpm run test` for quick feedback during development
- Use `pnpm run test:coverage` to identify untested code
- Use `pnpm run test:e2e` before releases to verify user workflows
- Tests automatically run with proper mocking of browser APIs (IndexedDB, WebGPU, Speech Recognition)