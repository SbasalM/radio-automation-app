import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import { createLogger } from './utils/logger'
import { errorHandler } from './utils/errorHandler'
import { setupRoutes } from './api'
import { StorageService } from './services/storage'
import { FileWatcherService } from './services/fileWatcher'
import { waveformService } from './services/waveform-service'
import fs from 'fs-extra'
import { Request, Response, NextFunction } from 'express'
import multer from 'multer'

// Load environment variables
dotenv.config()

const logger = createLogger()

// Configure multer for file uploads
const upload = multer({
  dest: './temp-uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true)
    } else {
      cb(new Error('Only audio files are allowed'))
    }
  }
})

// Service instances
let storageService: StorageService
let fileWatcherService: FileWatcherService

const app = express()
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

// Middleware
app.use(helmet())

// Global CORS middleware for all routes (except audio)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip CORS for audio routes - handle them separately
  if (req.path.startsWith('/api/audio/')) {
    return next()
  }
  
  // Apply CORS for non-audio routes
  const corsOptions = {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      process.env.CORS_ORIGIN || 'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }
  
  cors(corsOptions)(req, res, next)
})

// Specific CORS middleware for audio routes - must come before audio endpoints
app.use('/api/audio', (req: Request, res: Response, next: NextFunction) => {
  // Set permissive CORS headers for audio streaming
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization, Cache-Control')
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')
  res.header('Access-Control-Max-Age', '86400')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  next()
})

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API routes
setupRoutes(app)

// Audio file serving endpoint for trim editor playback
app.get('/api/audio/:filename', (req: Request, res: Response): void => {
  try {
    const filename = req.params.filename
    const filePath = path.join(__dirname, '../watch', filename)
    
    logger.info(`Audio request for: ${filename}`)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn(`Audio file not found: ${filename}`)
      res.status(404).json({ error: 'Audio file not found' })
      return
    }
    
    // Get file stats
    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const range = req.headers.range
    
    logger.info(`Serving audio file: ${filename}, size: ${fileSize} bytes, range: ${range || 'none'}`)
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase()
    const contentType = ext === '.mp3' ? 'audio/mpeg' : 
                       ext === '.wav' ? 'audio/wav' : 
                       ext === '.flac' ? 'audio/flac' : 'audio/wav'
    
    logger.info(`Content-Type: ${contentType}`)
    
    if (range) {
      // Support range requests for audio seeking
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1
      
      logger.info(`Range request: ${start}-${end}/${fileSize}`)
      
      const file = fs.createReadStream(filePath, { start, end })
      const head = {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      }
      res.writeHead(206, head)
      file.pipe(res)
      return
    } else {
      // Normal request without range
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      }
      logger.info(`Full file request, headers: ${JSON.stringify(head)}`)
      res.writeHead(200, head)
      fs.createReadStream(filePath).pipe(res)
      return
    }
  } catch (error) {
    logger.error('Audio file serving error:', error)
    res.status(500).json({ error: 'Internal server error' })
    return
  }
})

// Temporary file upload endpoint for sample preview
app.post('/api/audio/upload-sample', upload.single('audio'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' })
      return
    }

    const tempFilePath = path.join(__dirname, '../watch', `temp_${Date.now()}_${req.file.originalname}`)
    
    // Move uploaded file to watch directory temporarily
    fs.moveSync(req.file.path, tempFilePath)
    
    res.json({ 
      success: true, 
      filename: path.basename(tempFilePath),
      originalName: req.file.originalname,
      size: req.file.size
    })
    return
  } catch (error) {
    logger.error('Sample file upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
    return
  }
})

// Waveform generation endpoint
app.post('/api/audio/waveform/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const filename = req.params.filename
    const width = parseInt(req.query.width as string) || 800
    const filePath = path.join(__dirname, '../watch', filename)
    
    logger.info(`Waveform request for: ${filename}, width: ${width}`)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn(`Audio file not found for waveform: ${filename}`)
      res.status(404).json({ error: 'Audio file not found' })
      return
    }
    
    // Generate waveform data
    const waveformData = await waveformService.generateWaveform(filePath, width)
    
    res.json({
      success: true,
      waveformData,
      filename
    })
    return
  } catch (error) {
    logger.error('Waveform generation error:', error)
    res.status(500).json({ error: 'Failed to generate waveform' })
    return
  }
})

// Audio metadata endpoint
app.get('/api/audio/metadata/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const filename = req.params.filename
    const filePath = path.join(__dirname, '../watch', filename)
    
    logger.info(`Metadata request for: ${filename}`)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn(`Audio file not found for metadata: ${filename}`)
      res.status(404).json({ error: 'Audio file not found' })
      return
    }
    
    // Get audio metadata
    const metadata = await waveformService.getAudioMetadata(filePath)
    
    res.json({
      success: true,
      metadata,
      filename
    })
    return
  } catch (error) {
    logger.error('Metadata extraction error:', error)
    res.status(500).json({ error: 'Failed to extract metadata' })
    return
  }
})

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  })
})

async function startServer() {
  try {
    // Initialize services
    logger.info('Initializing services...')
    
    // Initialize waveform service
    await waveformService.initialize()
    logger.info('Waveform service initialized')
    
    // Initialize storage
    storageService = StorageService.getInstance()
    await storageService.initialize()
    logger.info('Storage service initialized')

    // Initialize file watcher service
    fileWatcherService = FileWatcherService.getInstance()
    await fileWatcherService.initialize()
    logger.info('File watcher service initialized')

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Radio Automation Backend server running on port ${PORT}`)
      logger.info(`📁 Storage path: ${process.env.STORAGE_PATH || './data'}`)
      logger.info(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`)
    })

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
let isShuttingDown = false

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return
  isShuttingDown = true
  
  logger.info(`${signal} received, shutting down gracefully...`)
  
  try {
    await fileWatcherService.stop()
    logger.info('File watcher stopped')
    
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown:', error)
    process.exit(1)
  }
}

// Increase max listeners to avoid warnings
process.setMaxListeners(15)

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.once('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.once('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.once('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Start the server
startServer() 