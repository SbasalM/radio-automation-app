import { Router, Request, Response } from 'express'
import { createLogger } from '../utils/logger'
import { asyncHandler, validationError } from '../utils/errorHandler'
import { StorageService } from '../services/storage'
import { FileWatcherService } from '../services/fileWatcher'
import { ApiResponse } from '../types'

const router = Router()
const logger = createLogger()
const storage = StorageService.getInstance()

// GET /api/queue - Get current file queue
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const queue = await storage.getQueue()
  
  const response: ApiResponse = {
    success: true,
    data: queue
  }
  
  res.json(response)
}))

// POST /api/queue/:id/retry - Retry failed file
router.post('/:id/retry', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  if (!id) {
    throw validationError('File ID is required')
  }
  
  const fileWatcher = FileWatcherService.getInstance()
  await fileWatcher.retryFile(id)
  
  logger.info(`Retry initiated for file: ${id}`)
  
  const response: ApiResponse = {
    success: true,
    message: 'File retry initiated'
  }
  
  res.json(response)
}))

// DELETE /api/queue/:id - Remove from queue
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  if (!id) {
    throw validationError('File ID is required')
  }
  
  const removed = await storage.removeFromQueue(id)
  
  if (!removed) {
    return res.status(404).json({
      success: false,
      error: 'File not found in queue'
    })
  }
  
  logger.info(`Removed file from queue: ${id}`)
  
  const response: ApiResponse = {
    success: true,
    message: 'File removed from queue'
  }
  
  return res.json(response)
}))

// DELETE /api/queue - Clear entire queue
router.delete('/', asyncHandler(async (req: Request, res: Response) => {
  await storage.clearQueue()
  
  logger.info('Queue cleared')
  
  const response: ApiResponse = {
    success: true,
    message: 'Queue cleared'
  }
  
  res.json(response)
}))

export default router 