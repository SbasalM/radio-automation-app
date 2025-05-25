# Radio Automation Flow System - Project Context

## What We're Building
A desktop application for radio stations to automate show ingestion, processing, and scheduling with intelligent promo insertion.

## Unique Selling Point
Automatic promo tagging - intelligently detects when voices stop speaking and inserts station promos.

## Tech Requirements
- Must work as a desktop app (later can be packaged with Electron)
- Stable, production-ready dependencies only
- Clean, modern UI with light/dark themes
- Real-time file processing capabilities

## Development Phases

### Phase 1: Foundation
- [x] Project setup with correct dependencies
- [x] Basic file structure
- [x] UI layout with navigation
- [x] Theme system (light/dark)
- [x] Basic routing

### Phase 2: File Management Core
- [x] Show profile data model
- [x] Watch folder implementation
- [x] File queue system  
- [x] Basic processing pipeline

### Phase 3: FTP Integration ⚡ CURRENT
- [ ] FTP connection profiles
- [ ] Download scheduler
- [ ] Pattern matching
- [ ] Queue integration

- Current Focus: FTP connection profiles and scheduling

### Phase 4: Audio Processing
- [ ] Waveform display
- [ ] Trim editor
- [ ] Audio normalization
- [ ] Export pipeline

### Phase 5: Promo Tagging System
- [ ] Voice activity detection
- [ ] Promo library management
- [ ] Auto-insertion algorithm
- [ ] Testing & refinement

### Phase 6: Polish & Deployment
- [ ] Email notifications
- [ ] Calendar integration
- [ ] Electron packaging
- [ ] Performance optimization