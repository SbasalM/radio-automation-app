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

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const logger = createLogger()

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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