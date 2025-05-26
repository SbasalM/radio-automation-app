import winston from 'winston'
import path from 'path'
import fs from 'fs'

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`
    }
    
    if (stack) {
      msg += `\n${stack}`
    }
    
    return msg
  })
)

export const createLogger = () => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      }),
      
      // File transport for general logs
      new winston.transports.File({
        filename: path.join(logsDir, 'app.log'),
        maxsize: parseInt((process.env.LOG_MAX_SIZE || '10MB').replace('MB', '')) * 1024 * 1024,
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
        tailable: true
      }),
      
      // File transport for errors only
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    ],
    
    // Handle exceptions and rejections
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'exceptions.log')
      })
    ],
    
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'rejections.log')
      })
    ]
  })
}

export default createLogger 