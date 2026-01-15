# Reflect - Personal Journal

A privacy-focused, local-first journaling application built with React, TypeScript, and modern web technologies. All your journal entries are stored locally on your device, ensuring complete privacy.

## 🌟 Features

### Core Functionality
- **Local-First Storage**: All data stored in IndexedDB - no external servers
- **Rich Text Editor**: TipTap-based editor with markdown support
- **Auto-Save**: Automatic saving every 30 seconds
- **Daily Prompts**: Inspirational writing prompts to spark creativity
- **Calendar View**: Visual calendar showing entry history and streaks
- **Full-Screen Mode**: Distraction-free writing environment
- **Export/Import**: Backup and restore your data in JSON or Markdown

### User Experience
- **Clean, Minimal Design**: Optimized for long-form writing
- **Dark/Light Theme**: Automatic system theme detection with manual override
- **Responsive Design**: Works on desktop and mobile devices
- **Offline Support**: Works completely offline
- **Keyboard Shortcuts**: Efficient navigation and editing

## 🚀 Live Demo

**Deployed Application**: [https://reflect.kelvinhamma.com/](https://reflect.kelvinhamma.com/)

## 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS + Tailwind Typography
- **Editor**: TipTap (rich text editor)
- **Database**: IndexedDB via Dexie.js
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📁 Project Structure

```
src/
├── components/
│   ├── Editor/           # TipTap rich text editor
│   ├── Calendar/         # Calendar view component
│   └── Layout/           # Main application layout
├── hooks/
│   └── usePreferences.ts # User preferences management
├── pages/
│   ├── HomePage.tsx      # Daily entry page
│   ├── EntriesPage.tsx   # All entries list
│   ├── CalendarPage.tsx  # Calendar navigation
│   ├── EntryDetailPage.tsx # Individual entry editing
│   ├── SettingsPage.tsx  # App preferences
│   ├── ExportPage.tsx    # Data export
│   └── ImportPage.tsx    # Data import
├── services/
│   ├── database.ts       # IndexedDB operations
│   └── prompts.ts        # Daily writing prompts
├── types/
│   └── index.ts          # TypeScript interfaces
└── lib/
    └── utils.ts          # Utility functions
```

## 🗄 Database Schema

### Entry Interface
```typescript
interface Entry {
  id: string;           // UUID v4
  content: string;      // Rich text content (HTML)
  plainText: string;    // Plain text for search
  created: Date;
  modified: Date;
  metadata: {
    wordCount: number;
    readingTime: number;
    mood?: string;
    tags: string[];
  };
}
```

### User Preferences
```typescript
interface UserPreferences {
  id: string;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  dailyPrompts: boolean;
  autoSave: boolean;
}
```

## ⌨️ Keyboard Shortcuts

- `Ctrl+S` / `Cmd+S`: Manual save
- `Ctrl+Shift+Enter`: Toggle fullscreen mode
- `ESC`: Exit fullscreen mode
- Standard formatting: `Ctrl+B` (bold), `Ctrl+I` (italic)

## 🎨 Design Philosophy

### Visual Design
- **Minimalist**: Clean, distraction-free interface
- **Typography-First**: Excellent readability with comfortable line spacing
- **Color Palette**: Calm grays, warm whites, gentle emerald accents
- **Responsive**: Desktop-first with mobile support

### User Experience
- **Privacy-Focused**: No data collection or external tracking
- **Fast & Reliable**: Instant loading with offline support
- **Intuitive**: Natural writing workflow with helpful prompts
- **Accessible**: WCAG 2.1 compliant design

## 🔧 Development

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd reflect-journal

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

### Available Scripts

#### Development
- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

#### Testing
- `pnpm run test` - Run unit and component tests
- `pnpm run test:ui` - Interactive test UI with Vitest
- `pnpm run test:coverage` - Generate test coverage report
- `pnpm run test:e2e` - Run end-to-end tests with Playwright
- `pnpm run test:e2e:ui` - Interactive E2E test runner

## 🏗 Architecture Decisions

### Local-First Approach
- **Why**: Complete privacy and offline functionality
- **How**: IndexedDB for persistent storage, no external APIs
- **Benefits**: No vendor lock-in, works anywhere, fast performance

### Technology Choices
- **React**: Mature ecosystem, excellent TypeScript support
- **TipTap**: Extensible, headless editor with rich features
- **Dexie.js**: Robust IndexedDB wrapper with TypeScript support
- **Tailwind CSS**: Utility-first styling for rapid development

## 📱 PWA Features

- Offline functionality
- Install to home screen
- Background sync (future enhancement)
- Service worker for caching

## 🧪 Testing

### Test Coverage
The application includes comprehensive testing across multiple layers:

- **Unit Tests**: Service layer functions (database, AI, search)
- **Component Tests**: UI components with user interaction simulation
- **Integration Tests**: Page-level functionality and workflows
- **End-to-End Tests**: Complete user journeys across browsers

### Testing Technologies
- **Vitest** - Fast unit testing with TypeScript support
- **React Testing Library** - Component testing with accessibility focus
- **Playwright** - Cross-browser E2E testing (Chrome, Firefox, Safari)
- **MSW** - Mock Service Worker for dependency isolation

### Running Tests
```bash
# Run all unit and component tests
pnpm run test

# Interactive test UI for development
pnpm run test:ui

# Generate coverage report
pnpm run test:coverage

# End-to-end tests across browsers
pnpm run test:e2e
```

## 🔒 Privacy & Security

- **No Data Collection**: All data stays on your device
- **No External Requests**: No analytics, tracking, or third-party services
- **Open Source**: Transparent code for security audits
- **Local Encryption**: Data encrypted in IndexedDB (browser-level)

## 📋 Feature Roadmap

### Near Term
- [x] Search functionality across all entries
- [x] Comprehensive testing suite (unit, component, E2E)
- [ ] Tag management and filtering
- [ ] Mood tracking with analytics
- [ ] Entry templates

### Long Term
- [ ] End-to-end encryption
- [ ] Cross-device sync (optional)
- [ ] Rich media support (images, audio)
- [ ] Advanced analytics and insights

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests for any improvements.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [TipTap](https://tiptap.dev/) for the excellent rich text editor
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Lucide](https://lucide.dev/) for the beautiful icon set
- [Dexie.js](https://dexie.org/) for IndexedDB management

---

**Built with ❤️ for writers, thinkers, and anyone who values privacy.**