import { Router, Request, Response } from 'express'
import Client from 'ftp'
import { createLogger } from '../utils/logger'

const router = Router()
const logger = createLogger()

interface FTPProfile {
  id: string
  host: string
  port: number
  username: string
  password?: string
  encryptedPassword?: string
  protocol: 'ftp' | 'ftps'
  basePath?: string
}

// Simple password decryption helper for backend
// In a production environment, you'd want proper encryption utilities
function decryptPassword(encryptedPassword: string): string {
  // For now, assume password comes decrypted from frontend
  // The frontend handles the encryption/decryption
  return encryptedPassword
}

// FTP connection helper
async function createFTPConnection(profile: FTPProfile): Promise<Client> {
  return new Promise((resolve, reject) => {
    const client = new Client()
    
    // Use proper password (decrypted if encrypted, otherwise plain password)
    const password = profile.encryptedPassword ? decryptPassword(profile.encryptedPassword) : profile.password
    
    const connectionConfig = {
      host: profile.host,
      port: profile.port || 21,
      user: profile.username,
      password: password,
      secure: profile.protocol === 'ftps',
      secureOptions: { rejectUnauthorized: false } // For self-signed certificates
    }
    
    // Set timeouts
    const timeout = setTimeout(() => {
      client.destroy()
      reject(new Error('Connection timeout'))
    }, 30000)
    
    client.on('ready', () => {
      clearTimeout(timeout)
      resolve(client)
    })
    
    client.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
    
    client.connect(connectionConfig)
  })
}

// Test FTP connection
router.post('/test-connection', async (req: Request, res: Response): Promise<void> => {
  let client: Client | null = null
  
  try {
    const profile = req.body as FTPProfile
    logger.info(`🔗 Testing real FTP connection to ${profile.host}:${profile.port}`)
    logger.info(`🔐 Backend Test Connection - Password length: ${profile.password?.length}`)
    logger.info(`🔐 Backend Test Connection - Password starts with: ${profile.password?.substring(0, 10)}`)
    
    client = await createFTPConnection(profile)
    
    // Test basic functionality
    await new Promise<string>((resolve, reject) => {
      client!.pwd((err, directory) => {
        if (err) {
          reject(err)
        } else {
          logger.info(`✅ Connected to ${profile.host}, current directory: ${directory}`)
          resolve(directory)
        }
      })
    })
    
    res.json({
      success: true,
      message: `Successfully connected to ${profile.host}`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    logger.error(`❌ FTP connection failed:`, error.message)
    res.status(400).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    })
  } finally {
    // Always close connection, even if there was an error
    if (client) {
      try {
        client.end()
        logger.info(`🔌 FTP connection closed for ${req.body.host}`)
      } catch (closeError) {
        logger.warn(`⚠️ Error closing FTP connection: ${closeError}`)
      }
    }
  }
})

// List directories for browsing
router.post('/browse-directory', async (req: Request, res: Response): Promise<void> => {
  let client: Client | null = null
  
  try {
    const { profile, path = '/' } = req.body
    logger.info(`📁 Browsing directory ${path} on ${profile.host}`)
    logger.info(`🔐 Backend Browse Directory - Password length: ${profile.password?.length}`)
    logger.info(`🔐 Backend Browse Directory - Password starts with: ${profile.password?.substring(0, 10)}`)
    
    client = await createFTPConnection(profile)
    
    // Change to specified directory
    await new Promise<void>((resolve, reject) => {
      client!.cwd(path, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    
    // List directory contents
    const listing = await new Promise<any[]>((resolve, reject) => {
      client!.list((err, list) => {
        if (err) {
          reject(err)
        } else {
          resolve(list)
        }
      })
    })
    
    // Format directory listing
    const directories = listing
      .filter(item => item.type === 'd')
      .map(item => ({
        name: item.name,
        type: 'directory',
        modified: item.date,
        permissions: item.rights?.user || 'rwx'
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    
    const files = listing
      .filter(item => item.type === '-')
      .map(item => ({
        name: item.name,
        type: 'file',
        size: item.size,
        modified: item.date,
        permissions: item.rights?.user || 'rw-'
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    
    res.json({
      success: true,
      currentPath: path,
      directories,
      files,
      totalItems: listing.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    logger.error(`❌ Directory browse failed:`, error.message)
    res.status(400).json({
      success: false,
      message: error.message,
      currentPath: req.body.path || '/',
      timestamp: new Date().toISOString()
    })
  } finally {
    // Always close connection, even if there was an error
    if (client) {
      try {
        client.end()
        logger.info(`🔌 FTP connection closed for ${req.body.profile.host}`)
      } catch (closeError) {
        logger.warn(`⚠️ Error closing FTP connection: ${closeError}`)
      }
    }
  }
})

// List files with pattern matching
router.post('/list-files', async (req: Request, res: Response): Promise<void> => {
  let client: Client | null = null
  
  try {
    const { profile, path = '/', pattern } = req.body
    logger.info(`📋 Listing files in ${path} on ${profile.host} with pattern: ${pattern || '*'}`)
    
    client = await createFTPConnection(profile)
    
    // Change to specified directory
    await new Promise<void>((resolve, reject) => {
      client!.cwd(path, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    
    // List files
    const listing = await new Promise<any[]>((resolve, reject) => {
      client!.list((err, list) => {
        if (err) {
          reject(err)
        } else {
          resolve(list)
        }
      })
    })
    
    // Filter files only
    let files = listing
      .filter(item => item.type === '-')
      .map(item => ({
        name: item.name,
        size: item.size,
        modified: item.date,
        path: `${path}/${item.name}`.replace('//', '/')
      }))
    
    // Apply pattern matching if provided
    if (pattern && pattern !== '*') {
      const regex = new RegExp(
        pattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
          .replace(/\{([^}]+)\}/g, '($1)'),
        'i'
      )
      files = files.filter(file => regex.test(file.name))
    }
    
    res.json({
      success: true,
      files,
      totalFiles: files.length,
      path,
      pattern: pattern || '*',
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    logger.error(`❌ File listing failed:`, error.message)
    res.status(400).json({
      success: false,
      message: error.message,
      path: req.body.path || '/',
      timestamp: new Date().toISOString()
    })
  } finally {
    // Always close connection, even if there was an error
    if (client) {
      try {
        client.end()
        logger.info(`🔌 FTP connection closed for ${req.body.profile.host}`)
      } catch (closeError) {
        logger.warn(`⚠️ Error closing FTP connection: ${closeError}`)
      }
    }
  }
})

// Download file
router.post('/download-file', async (req: Request, res: Response): Promise<void> => {
  let client: Client | null = null
  
  try {
    const { profile, remoteFilePath, localFilePath } = req.body
    logger.info(`⬇️ Downloading ${remoteFilePath} from ${profile.host}`)
    
    client = await createFTPConnection(profile)
    
    // Download file
    await new Promise<void>((resolve, reject) => {
      client!.get(remoteFilePath, (err, stream) => {
        if (err) {
          reject(err)
          return
        }
        
        const fs = require('fs')
        const writeStream = fs.createWriteStream(localFilePath)
        
        stream.pipe(writeStream)
        
        stream.on('close', () => {
          resolve()
        })
        
        stream.on('error', reject)
        writeStream.on('error', reject)
      })
    })
    
    logger.info(`✅ Successfully downloaded ${remoteFilePath}`)
    res.json({
      success: true,
      message: `Successfully downloaded ${remoteFilePath}`,
      localPath: localFilePath,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    logger.error(`❌ File download failed:`, error.message)
    res.status(400).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    })
  } finally {
    // Always close connection, even if there was an error
    if (client) {
      try {
        client.end()
        logger.info(`🔌 FTP connection closed for ${req.body.profile.host}`)
      } catch (closeError) {
        logger.warn(`⚠️ Error closing FTP connection: ${closeError}`)
      }
    }
  }
})

export default router 