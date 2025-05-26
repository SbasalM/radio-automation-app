# Radio Automation Backend

A Node.js/Express backend for the Radio Automation Flow System that provides real file watching, processing, and management capabilities.

## Features

- **Real File Watching**: Uses Chokidar to monitor directories for new audio files
- **File Processing**: Automatic file copying, renaming, and organization based on show profiles
- **Show Management**: REST API for creating and managing radio show profiles
- **Queue Management**: Real-time file processing queue with retry capabilities
- **Storage**: JSON-based data persistence with automatic backups
- **Logging**: Comprehensive logging with Winston
- **Error Handling**: Robust error handling and graceful shutdown

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the backend directory:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
STORAGE_PATH=./data
LOG_LEVEL=info
WATCH_INTERVAL=5000
NODE_ENV=development

# File Processing Settings
MAX_FILE_SIZE=100MB
ALLOWED_EXTENSIONS=.mp3,.wav,.flac,.aac,.m4a
TEMP_DIR=./temp
OUTPUT_BASE_DIR=./output

# Security
CORS_ORIGIN=http://localhost:5173
API_RATE_LIMIT=100

# Logging
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=5
```

### 3. Development Mode
```bash
npm run dev
```

### 4. Production Build
```bash
npm run build
npm start
```

## API Endpoints

### Shows Management
- `GET /api/shows` - Get all show profiles
- `GET /api/shows/:id` - Get single show profile
- `POST /api/shows` - Create new show profile
- `PUT /api/shows/:id` - Update show profile
- `DELETE /api/shows/:id` - Delete show profile

### File Queue
- `GET /api/queue` - Get current file processing queue
- `POST /api/queue/:id/retry` - Retry failed file processing
- `DELETE /api/queue/:id` - Remove file from queue
- `DELETE /api/queue` - Clear entire queue

### File Watching
- `POST /api/watch/start` - Start watching specified shows
- `POST /api/watch/stop` - Stop all file watching
- `GET /api/watch/status` - Get watching status

### System
- `GET /api/system/status` - Get overall system status
- `POST /api/files/scan` - Trigger manual file scan

## How It Works

### File Processing Flow

1. **Show Configuration**: Create show profiles with file patterns and output directories
2. **File Watching**: Backend monitors specified directories using Chokidar
3. **Pattern Matching**: When files are detected, they're matched against show patterns
4. **Queue Processing**: Matched files are added to the processing queue
5. **File Operations**: Files are copied/moved to output directories with proper naming
6. **Status Updates**: Real-time status updates through the API

### Example Show Profile

```json
{
  "name": "Morning Show",
  "description": "Daily morning show files",
  "enabled": true,
  "filePatterns": [
    {
      "id": "pattern_1",
      "pattern": "MorningShow_*.mp3",
      "type": "watch"
    }
  ],
  "outputDirectory": "./output/morning-show",
  "autoProcessing": true
}
```

### File Pattern Matching

The system supports glob-style patterns:
- `*` - Matches any characters
- `?` - Matches single character
- `MorningShow_*.mp3` - Matches files like "MorningShow_Episode1.mp3"
- `News_202?_*.wav` - Matches files like "News_2024_Headlines.wav"

## Directory Structure

```
backend/
├── src/
│   ├── api/          # Express route handlers
│   ├── services/     # Business logic services
│   ├── utils/        # Utility functions
│   └── index.ts      # Main server entry point
├── data/             # JSON storage (created automatically)
├── logs/             # Application logs (created automatically)
├── temp/             # Temporary processing files
└── output/           # Default output directory
```

## Services

### StorageService
- JSON-based data persistence
- Automatic backups
- Show profile management
- Queue management

### FileWatcherService
- Chokidar-based file monitoring
- Real-time file detection
- Pattern matching
- Automatic processing triggers

### FileOperationsService
- File copying with progress tracking
- Conflict resolution
- File validation
- Metadata extraction

## Error Handling

The backend includes comprehensive error handling:
- File permission errors
- Network drive accessibility issues
- Invalid file patterns
- Processing failures
- Graceful shutdown on SIGTERM/SIGINT

## Logging

Winston-based logging with:
- Console output (development)
- File rotation
- Error-specific logs
- Configurable log levels

## Development

### Prerequisites
- Node.js 18+
- NPM or Yarn

### Scripts
- `npm run dev` - Development with hot reload
- `npm run build` - TypeScript compilation
- `npm run start` - Production server
- `npm run lint` - ESLint checking
- `npm run test` - Run tests (when implemented)

### Adding New Features

1. **New API Endpoints**: Add routes in `src/api/`
2. **Business Logic**: Add services in `src/services/`
3. **Utilities**: Add helpers in `src/utils/`
4. **Types**: Update shared types in `../shared/types.ts`

## Production Deployment

1. Build the application: `npm run build`
2. Set environment variables for production
3. Use a process manager like PM2:
   ```bash
   pm2 start dist/index.js --name radio-automation-backend
   ```
4. Set up reverse proxy (nginx) if needed
5. Configure log rotation
6. Set up monitoring and alerts

## Security Considerations

- CORS configured for frontend origin
- Helmet for security headers
- Input validation on all endpoints
- File path validation to prevent directory traversal
- Rate limiting (configurable)

## Troubleshooting

### Common Issues

1. **File Permission Errors**: Ensure backend has read/write access to watch and output directories
2. **Port Already in Use**: Change PORT in .env file
3. **Module Not Found**: Run `npm install` to install dependencies
4. **File Not Being Detected**: Check file patterns and ensure directories exist

### Debug Mode

Set `LOG_LEVEL=debug` in .env for detailed logging.

## Future Enhancements

- SQLite/PostgreSQL database support
- Audio processing (normalization, format conversion)
- FTP client integration
- Advanced metadata extraction
- WebSocket for real-time updates
- Clustering for high availability 