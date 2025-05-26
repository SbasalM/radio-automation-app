import { Request, Response, NextFunction } from 'express'
import { createLogger } from './logger'

const logger = createLogger()

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export class CustomError extends Error implements AppError {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal Server Error'
  
  // Log the error
  logger.error('Error occurred:', {
    message: error.message,
    statusCode,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDevelopment && { stack: error.stack }),
    ...(isDevelopment && { details: error })
  })
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(`Not found - ${req.originalUrl}`, 404)
  next(error)
}

// Validation error helper
export const validationError = (message: string) => {
  return new CustomError(message, 400)
}

// File operation error helper
export const fileError = (message: string, statusCode: number = 500) => {
  return new CustomError(`File operation failed: ${message}`, statusCode)
} 