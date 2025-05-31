const express = require('express')
const Client = require('ftp')
const { decryptPassword } = require('../utils/encryption')
const router = express.Router()

// FTP connection helper
async function createFTPConnection(profile) {
  return new Promise((resolve, reject) => {
    const client = new Client()
    
    const connectionConfig = {
      host: profile.host,
      port: profile.port || 21,
      user: profile.username,
      password: profile.encryptedPassword ? decryptPassword(profile.encryptedPassword) : profile.password,
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
router.post('/test-connection', async (req, res) => {
  try {
    const profile = req.body
    console.log(`🔗 Testing real FTP connection to ${profile.host}:${profile.port}`)
    
    const client = await createFTPConnection(profile)
    
    // Test basic functionality
    await new Promise((resolve, reject) => {
      client.pwd((err, directory) => {
        if (err) {
          reject(err)
        } else {
          console.log(`✅ Connected to ${profile.host}, current directory: ${directory}`)
          resolve(directory)
        }
      })
    })
    
    client.end()
    
    res.json({
      success: true,
      message: `Successfully connected to ${profile.host}`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error(`❌ FTP connection failed:`, error.message)
    res.status(400).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// List directories for browsing
router.post('/browse-directory', async (req, res) => {
  try {
    const { profile, path = '/' } = req.body
    console.log(`📁 Browsing directory ${path} on ${profile.host}`)
    
    const client = await createFTPConnection(profile)
    
    // Change to specified directory
    await new Promise((resolve, reject) => {
      client.cwd(path, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    
    // List directory contents
    const listing = await new Promise((resolve, reject) => {
      client.list((err, list) => {
        if (err) {
          reject(err)
        } else {
          resolve(list)
        }
      })
    })
    
    client.end()
    
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
    
  } catch (error) {
    console.error(`❌ Directory browse failed:`, error.message)
    res.status(400).json({
      success: false,
      message: error.message,
      currentPath: path,
      timestamp: new Date().toISOString()
    })
  }
})

// List files with pattern matching
router.post('/list-files', async (req, res) => {
  try {
    const { profile, path = '/', pattern } = req.body
    console.log(`📋 Listing files in ${path} on ${profile.host} with pattern: ${pattern || '*'}`)
    
    const client = await createFTPConnection(profile)
    
    // Change to specified directory
    await new Promise((resolve, reject) => {
      client.cwd(path, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    
    // List files
    const listing = await new Promise((resolve, reject) => {
      client.list((err, list) => {
        if (err) {
          reject(err)
        } else {
          resolve(list)
        }
      })
    })
    
    client.end()
    
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
    
  } catch (error) {
    console.error(`❌ File listing failed:`, error.message)
    res.status(400).json({
      success: false,
      message: error.message,
      path,
      timestamp: new Date().toISOString()
    })
  }
})

// Download file
router.post('/download-file', async (req, res) => {
  try {
    const { profile, remoteFilePath, localFilePath } = req.body
    console.log(`⬇️ Downloading ${remoteFilePath} from ${profile.host}`)
    
    const client = await createFTPConnection(profile)
    
    // Download file
    await new Promise((resolve, reject) => {
      client.get(remoteFilePath, (err, stream) => {
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
    
    client.end()
    
    console.log(`✅ Successfully downloaded ${remoteFilePath}`)
    res.json({
      success: true,
      message: `Successfully downloaded ${remoteFilePath}`,
      localPath: localFilePath,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error(`❌ File download failed:`, error.message)
    res.status(400).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

module.exports = router 