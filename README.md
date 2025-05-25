# Radio Automation Flow System

A modern radio automation system built with React 18, TypeScript, and Tailwind CSS v3.

## Features

- **Dashboard**: Real-time monitoring of system status
- **Show Management**: Configure show profiles with file patterns and processing options
- **File Monitoring**: Watch folders for new audio files
- **FTP Integration**: Scheduled file uploads
- **Promo Tagging**: Automatic voice detection and tagging
- **Dark/Light Theme**: System-aware theme switching

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v3
- **Routing**: React Router DOM
- **State Management**: Zustand
- **Icons**: Lucide React
- **UI Components**: Custom shadcn/ui-inspired components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (Header, Sidebar, Layout)
│   └── ui/              # Reusable UI components (Card, Button)
├── features/
│   ├── dashboard/       # Dashboard feature components
│   └── shows/           # Show management feature components
├── hooks/               # Custom React hooks
├── services/            # Business logic and API calls
├── store/               # Zustand state management
├── types/               # TypeScript type definitions
└── utils/               # Helper functions
```

## Features Overview

### Dashboard
- Active monitor count
- Queued files status
- Daily processing statistics
- Next scheduled upload
- Recent activity log

### Show Management ✨ NEW
- Create and edit show profiles
- Configure file patterns for automated processing
- Set trim settings (start/end seconds, fade in/out)
- Enable/disable processing options (normalize, promo tagging)
- View statistics: total shows, active vs inactive
- Toggle show status directly from the table
- Delete show profiles with confirmation

### File Pattern Configuration
- Support for wildcard patterns (e.g., `ShowName_*.mp3`)
- Watch folder and FTP source types
- Multiple patterns per show
- Pattern validation and examples
- Help documentation built-in

### Theme Support
- Light mode
- Dark mode  
- System preference detection
- Persistent theme selection

### Navigation
- Responsive sidebar navigation
- Active route highlighting
- Clean, modern UI design

## Development

This project follows modern React development practices:

- Functional components with hooks
- TypeScript for type safety
- Tailwind CSS for styling
- Component composition patterns
- Custom hooks for reusable logic

## License

This project is licensed under the MIT License.
