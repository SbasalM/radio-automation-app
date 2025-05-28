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
import fs from 'fs'
import { Request, Response, NextFunction } from 'express'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const logger = createLogger()

// Middleware
app.use(helmet())
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    process.env.CORS_ORIGIN || 'http://localhost:5173'
  ],
  credentials: true
}))
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
app.get('/api/audio/:filename', (req, res) => {
  try {
    const filename = req.params.filename
    const filePath = path.join(__dirname, '../watch', filename)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' })
    }
    
    // Set appropriate headers for audio streaming
    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const range = req.headers.range
    
    if (range) {
      // Support range requests for audio seeking
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1
      const file = fs.createReadStream(filePath, { start, end })
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/wav',
      }
      res.writeHead(206, head)
      file.pipe(res)
      return // Explicit return after piping
    } else {
      // Send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
      }
      res.writeHead(200, head)
      fs.createReadStream(filePath).pipe(res)
      return // Explicit return after piping
    }
  } catch (error) {
    logger.error('Error serving audio file:', error)
    return res.status(500).json({ error: 'Internal server error' })
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
    
    // Initialize storage
    await StorageService.getInstance().initialize()
    logger.info('Storage service initialized')

    // Initialize file watcher service
    const fileWatcher = FileWatcherService.getInstance()
    await fileWatcher.initialize()
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
    const fileWatcher = FileWatcherService.getInstance()
    await fileWatcher.stop()
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