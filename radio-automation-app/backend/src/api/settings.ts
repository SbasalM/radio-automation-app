import { Router, Request, Response } from 'express'
import path from 'path'
import { StorageService } from '../services/storage'
import { createLogger } from '../utils/logger'
import { asyncHandler, validationError } from '../utils/errorHandler'

const router = Router()
const storage = StorageService.getInstance()
const logger = createLogger()

// GET /api/settings - Get global settings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const settings = await storage.getSettings()
  
  res.json({
    success: true,
    data: settings
  })
}))

// PUT /api/settings - Update global settings
router.put('/', asyncHandler(async (req: Request, res: Response) => {
  const { globalWatchDirectory, globalOutputDirectory, watchInterval } = req.body
  
  // Validate the settings
  if (globalWatchDirectory && typeof globalWatchDirectory !== 'string') {
    throw validationError('globalWatchDirectory must be a string')
  }
  
  if (globalOutputDirectory && typeof globalOutputDirectory !== 'string') {
    throw validationError('globalOutputDirectory must be a string')
  }
  
  if (watchInterval && (typeof watchInterval !== 'number' || watchInterval < 1000)) {
    throw validationError('watchInterval must be a number >= 1000')
  }
  
  // Get current settings
  const currentSettings = await storage.getSettings()
  
  // Prepare updated settings - preserve user paths as provided
  const updatedSettings = {
    ...currentSettings,
    ...(globalWatchDirectory !== undefined && { globalWatchDirectory }),
    ...(globalOutputDirectory !== undefined && { globalOutputDirectory }),
    ...(watchInterval && { watchInterval })
  }
  
  // Update settings in storage
  await storage.updateSettings(updatedSettings)
  
  logger.info('Global settings updated:', updatedSettings)
  
  res.json({
    success: true,
    data: updatedSettings,
    message: 'Settings updated successfully'
  })
}))

export default router 