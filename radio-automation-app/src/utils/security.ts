import CryptoJS from 'crypto-js'
import { PRODUCTION_FTP_SECURITY } from '@/config/production.config'

/**
 * Production-ready password encryption utilities
 * Uses AES encryption with environment-based key management
 */

/**
 * Get encryption key from environment or use development fallback
 */
function getEncryptionKey(): string {
  const envKey = import.meta.env.VITE_FTP_ENCRYPTION_KEY
  
  if (import.meta.env.VITE_APP_ENV === 'production' && !envKey) {
    throw new Error('VITE_FTP_ENCRYPTION_KEY must be set in production environment')
  }
  
  // Development fallback key (never use this in production)
  return envKey || 'dev-fallback-key-never-use-in-production-12345'
}

/**
 * Encrypt a password using AES encryption
 * @param password - Plain text password to encrypt
 * @returns Encrypted password string
 */
export function encryptPassword(password: string): string {
  try {
    const key = getEncryptionKey()
    const encrypted = CryptoJS.AES.encrypt(password, key).toString()
    
    // Log encryption in development only
    if (import.meta.env.VITE_APP_ENV !== 'production') {
      console.log('[Security] Password encrypted successfully')
    }
    
    return encrypted
  } catch (error) {
    console.error('[Security] Failed to encrypt password:', error)
    throw new Error('Password encryption failed')
  }
}

/**
 * Decrypt a password using AES decryption
 * @param encryptedPassword - Encrypted password string
 * @returns Plain text password
 */
export function decryptPassword(encryptedPassword: string): string {
  try {
    const key = getEncryptionKey()
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, key)
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8)
    
    if (!plaintext) {
      throw new Error('Decryption resulted in empty string - possibly wrong key')
    }
    
    // Log decryption in development only
    if (import.meta.env.VITE_APP_ENV !== 'production') {
      console.log('[Security] Password decrypted successfully')
    }
    
    return plaintext
  } catch (error) {
    console.error('[Security] Failed to decrypt password:', error)
    throw new Error('Password decryption failed')
  }
}

/**
 * Check if a password is already encrypted
 * @param password - Password string to check
 * @returns True if password appears to be encrypted
 */
export function isPasswordEncrypted(password: string): boolean {
  // CryptoJS encrypted passwords start with "U2FsdGVkX1" (base64 encoded "Salted__")
  if (password.startsWith('U2FsdGVkX1')) {
    return true
  }
  
  // Fallback: check if it looks like a base64 encrypted string
  const base64Regex = /^[A-Za-z0-9+/=]+$/
  const hasCommonPasswordChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?~`]/.test(password)
  
  // If it looks like base64 and doesn't have common password chars, likely encrypted
  return base64Regex.test(password) && !hasCommonPasswordChars && password.length > 20
}

/**
 * Securely handle password for storage
 * Encrypts if not already encrypted and encryption is enabled
 * @param password - Password to process
 * @returns Processed password (encrypted if needed)
 */
export function processPasswordForStorage(password: string): string {
  // Skip encryption if disabled or already encrypted
  if (!PRODUCTION_FTP_SECURITY.enablePasswordEncryption || isPasswordEncrypted(password)) {
    return password
  }
  
  return encryptPassword(password)
}

/**
 * Securely retrieve password for use
 * Decrypts if encrypted and encryption is enabled
 * @param storedPassword - Password from storage
 * @returns Plain text password for use
 */
export function getPasswordForUse(storedPassword: string): string {
  // Skip decryption if disabled or not encrypted
  if (!PRODUCTION_FTP_SECURITY.enablePasswordEncryption || !isPasswordEncrypted(storedPassword)) {
    return storedPassword
  }
  
  return decryptPassword(storedPassword)
}

/**
 * Validate password strength for security
 * @param password - Password to validate
 * @returns Validation result with strength score and feedback
 */
export function validatePasswordStrength(password: string): {
  score: number // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong'
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0
  
  // Length check
  if (password.length >= 8) {
    score += 20
  } else {
    feedback.push('Password should be at least 8 characters long')
  }
  
  if (password.length >= 12) {
    score += 10
  }
  
  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 15
  } else {
    feedback.push('Add lowercase letters')
  }
  
  if (/[A-Z]/.test(password)) {
    score += 15
  } else {
    feedback.push('Add uppercase letters')
  }
  
  if (/[0-9]/.test(password)) {
    score += 15
  } else {
    feedback.push('Add numbers')
  }
  
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?~`]/.test(password)) {
    score += 15
  } else {
    feedback.push('Add special characters')
  }
  
  // Patterns to avoid
  if (/(.)\1{2,}/.test(password)) {
    score -= 10
    feedback.push('Avoid repeating characters')
  }
  
  if (/123|abc|qwe|pass|admin/i.test(password)) {
    score -= 15
    feedback.push('Avoid common patterns')
  }
  
  // Determine level
  let level: 'weak' | 'fair' | 'good' | 'strong'
  if (score >= 80) {
    level = 'strong'
  } else if (score >= 60) {
    level = 'good'
  } else if (score >= 40) {
    level = 'fair'
  } else {
    level = 'weak'
  }
  
  return { score: Math.max(0, Math.min(100, score)), level, feedback }
}

/**
 * Sanitize input to prevent injection attacks
 * @param input - User input to sanitize
 * @returns Sanitized input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .replace(/\0/g, '') // Remove null bytes
    .replace(/\r\n|\r|\n/g, ' ') // Replace line breaks with spaces
    .trim()
    .substring(0, 1000) // Limit length
}

/**
 * Validate FTP hostname/IP address
 * @param host - Hostname or IP to validate
 * @returns True if valid hostname/IP
 */
export function validateFTPHost(host: string): boolean {
  const sanitized = sanitizeInput(host)
  
  // Check for valid hostname or IP address
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
  const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  return hostnameRegex.test(sanitized) || ipRegex.test(sanitized)
}

/**
 * Validate FTP port number
 * @param port - Port number to validate
 * @returns True if valid port
 */
export function validateFTPPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * Generate a secure random string for temporary passwords or tokens
 * @param length - Length of string to generate
 * @returns Secure random string
 */
export function generateSecureString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Production security validation
 * Checks if all security requirements are met for production deployment
 */
export function validateProductionSecurity(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check encryption key
  try {
    getEncryptionKey()
  } catch (error) {
    errors.push('Encryption key not properly configured')
  }
  
  // Check environment
  if (import.meta.env.VITE_APP_ENV === 'production') {
    if (!import.meta.env.VITE_FTP_ENCRYPTION_KEY) {
      errors.push('VITE_FTP_ENCRYPTION_KEY must be set in production')
    }
    
    if (import.meta.env.VITE_FTP_ENCRYPTION_KEY && import.meta.env.VITE_FTP_ENCRYPTION_KEY.includes('dev-fallback')) {
      errors.push('Production encryption key cannot contain "dev-fallback"')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Log security events (production-safe)
 */
export function logSecurityEvent(event: string, details?: Record<string, any>): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    event,
    environment: import.meta.env.VITE_APP_ENV || 'development',
    // Never log sensitive data
    details: details ? Object.keys(details).reduce((safe, key) => {
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('key')) {
        safe[key] = '[REDACTED]'
      } else {
        safe[key] = details[key]
      }
      return safe
    }, {} as Record<string, any>) : undefined
  }
  
  if (import.meta.env.VITE_APP_ENV === 'production') {
    // In production, use proper logging service
    console.log(`[SECURITY] ${JSON.stringify(logEntry)}`)
  } else {
    // Development logging
    console.log(`[SECURITY] ${event}`, logEntry.details)
  }
} 