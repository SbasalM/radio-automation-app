import { Router, Request, Response } from 'express'
import { createLogger } from '../utils/logger'
import { asyncHandler, validationError } from '../utils/errorHandler'
import { StorageService } from '../services/storage'
import { ApiResponse } from '../types'

const router = Router()
const logger = createLogger()
const storage = StorageService.getInstance()

// GET /api/shows - Get all shows
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const shows = await storage.getAllShows()
  
  const response: ApiResponse = {
    success: true,
    data: shows
  }
  
  res.json(response)
}))

// GET /api/shows/:id - Get single show
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  if (!id) {
    throw validationError('Show ID is required')
  }
  
  const show = await storage.getShow(id)
  
  if (!show) {
    return res.status(404).json({
      success: false,
      error: 'Show not found'
    })
  }
  
  const response: ApiResponse = {
    success: true,
    data: show
  }
  
  return res.json(response)
}))

// POST /api/shows - Create new show
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const showData = req.body
  
  // Basic validation
  if (!showData.name) {
    throw validationError('Show name is required')
  }
  
  if (!showData.outputDirectory) {
    throw validationError('Output directory is required')
  }
  
  if (!showData.filePatterns || !Array.isArray(showData.filePatterns)) {
    throw validationError('File patterns are required')
  }

  // Set defaults
  const newShowData = {
    name: showData.name,
    description: showData.description || '',
    enabled: showData.enabled !== undefined ? showData.enabled : true,
    filePatterns: showData.filePatterns.map((pattern: any, index: number) => ({
      id: `pattern_${index}`,
      pattern: pattern.pattern,
      type: pattern.type || 'watch',
      ftpProfileId: pattern.ftpProfileId
    })),
    outputDirectory: showData.outputDirectory,
    autoProcessing: showData.autoProcessing !== undefined ? showData.autoProcessing : true
  }
  
  const createdShow = await storage.createShow(newShowData)
  
  logger.info(`Created new show: ${createdShow.name} (${createdShow.id})`)
  
  const response: ApiResponse = {
    success: true,
    data: createdShow,
    message: 'Show created successfully'
  }
  
  res.status(201).json(response)
}))

// PUT /api/shows/:id - Update show
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const updateData = req.body
  
  if (!id) {
    throw validationError('Show ID is required')
  }
  
  const existingShow = await storage.getShow(id)
  if (!existingShow) {
    return res.status(404).json({
      success: false,
      error: 'Show not found'
    })
  }
  
  // Update file patterns with IDs if provided
  if (updateData.filePatterns && Array.isArray(updateData.filePatterns)) {
    updateData.filePatterns = updateData.filePatterns.map((pattern: any, index: number) => ({
      id: pattern.id || `pattern_${index}`,
      pattern: pattern.pattern,
      type: pattern.type || 'watch',
      ftpProfileId: pattern.ftpProfileId
    }))
  }
  
  const updatedShow = await storage.updateShow(id, updateData)
  
  if (!updatedShow) {
    return res.status(404).json({
      success: false,
      error: 'Show not found'
    })
  }
  
  logger.info(`Updated show: ${updatedShow.name} (${id})`)
  
  const response: ApiResponse = {
    success: true,
    data: updatedShow,
    message: 'Show updated successfully'
  }
  
  return res.json(response)
}))

// DELETE /api/shows/:id - Delete show
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  if (!id) {
    throw validationError('Show ID is required')
  }
  
  const deleted = await storage.deleteShow(id)
  
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Show not found'
    })
  }
  
  logger.info(`Deleted show: ${id}`)
  
  const response: ApiResponse = {
    success: true,
    message: 'Show deleted successfully'
  }
  
  return res.json(response)
}))

export default router 