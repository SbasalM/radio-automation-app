import { Router, Request, Response } from 'express'
import { createLogger } from '../utils/logger'
import { asyncHandler } from '../utils/errorHandler'
import { StorageService } from '../services/storage'
import { FileWatcherService } from '../services/fileWatcher'
import { ApiResponse, ScanFilesRequest } from '../types'

const router = Router()
const logger = createLogger()
const storage = StorageService.getInstance()

// GET /api/system/status - Get overall system status
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const systemStatus = await storage.getSystemStatus()
  const watcherStatus = FileWatcherService.getInstance().getStatus()
  
  const response: ApiResponse = {
    success: true,
    data: {
      ...systemStatus,
      fileWatcher: watcherStatus
    }
  }
  
  res.json(response)
}))

// POST /api/files/scan - Manual scan for files
router.post('/scan', asyncHandler(async (req: Request, res: Response) => {
  const { directories, force }: ScanFilesRequest = req.body
  
  logger.info('Manual file scan initiated', { directories, force })
  
  // For now, this is a placeholder
  // In a real implementation, this would trigger a manual scan
  // of the specified directories or all watched directories
  
  const response: ApiResponse = {
    success: true,
    message: 'File scan initiated',
    data: {
      scannedDirectories: directories || ['all'],
      filesFound: 0, // Placeholder
      timestamp: new Date().toISOString()
    }
  }
  
  res.json(response)
}))

export default router 