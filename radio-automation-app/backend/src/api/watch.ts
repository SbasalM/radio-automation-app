import { Router, Request, Response } from 'express'
import { createLogger } from '../utils/logger'
import { asyncHandler, validationError } from '../utils/errorHandler'
import { FileWatcherService } from '../services/fileWatcher'
import { ApiResponse, StartWatchingRequest } from '../types'

const router = Router()
const logger = createLogger()

// POST /api/watch/start - Start watching folders
router.post('/start', asyncHandler(async (req: Request, res: Response) => {
  const { showIds }: StartWatchingRequest = req.body
  
  if (!showIds || !Array.isArray(showIds)) {
    throw validationError('Show IDs array is required')
  }
  
  const fileWatcher = FileWatcherService.getInstance()
  await fileWatcher.startWatchingShows(showIds)
  
  logger.info(`Started watching ${showIds.length} shows`)
  
  const response: ApiResponse = {
    success: true,
    message: `Started watching ${showIds.length} shows`
  }
  
  res.json(response)
}))

// POST /api/watch/stop - Stop watching folders
router.post('/stop', asyncHandler(async (req: Request, res: Response) => {
  const fileWatcher = FileWatcherService.getInstance()
  await fileWatcher.stopWatching()
  
  logger.info('Stopped all file watching')
  
  const response: ApiResponse = {
    success: true,
    message: 'Stopped all file watching'
  }
  
  res.json(response)
}))

// GET /api/watch/status - Get watching status
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const fileWatcher = FileWatcherService.getInstance()
  const status = fileWatcher.getStatus()
  
  const response: ApiResponse = {
    success: true,
    data: status
  }
  
  res.json(response)
}))

export default router 