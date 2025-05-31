import type { FTPSecurityConfig, FTPEnvironmentConfig, FTPHistorySettings } from '@/types/ftp'

/**
 * Production Configuration for Radio Automation System
 * 
 * This file contains production-ready settings with security best practices.
 * All sensitive values should be loaded from environment variables.
 */

export const PRODUCTION_FTP_SECURITY: FTPSecurityConfig = {
  enablePasswordEncryption: true,
  encryptionKey: import.meta.env.VITE_FTP_ENCRYPTION_KEY || '', // Must be set in production
  connectionTimeout: parseInt(import.meta.env.VITE_FTP_CONNECTION_TIMEOUT || '30000', 10),
  retryAttempts: parseInt(import.meta.env.VITE_FTP_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(import.meta.env.VITE_FTP_RETRY_DELAY || '5000', 10),
  enableSSLValidation: import.meta.env.VITE_FTP_ENABLE_SSL_VALIDATION !== 'false',
  maxConcurrentConnections: parseInt(import.meta.env.VITE_FTP_MAX_CONCURRENT_CONNECTIONS || '5', 10)
}

export const PRODUCTION_ENVIRONMENT: FTPEnvironmentConfig = {
  environment: 'production',
  logLevel: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'warn',
  enableMockMode: false, // Never enable mocks in production
  dataStoragePath: import.meta.env.VITE_DATA_STORAGE_PATH || '/var/lib/radio-automation/data',
  tempDirectory: import.meta.env.VITE_TEMP_DIRECTORY || '/tmp/radio-automation',
  backupRetention: parseInt(import.meta.env.VITE_BACKUP_RETENTION_DAYS || '30', 10)
}

export const PRODUCTION_HISTORY_SETTINGS: FTPHistorySettings = {
  successfulDownloadRetentionDays: parseInt(import.meta.env.VITE_SUCCESSFUL_RETENTION_DAYS || '90', 10),
  failedDownloadRetentionDays: parseInt(import.meta.env.VITE_FAILED_RETENTION_DAYS || '30', 10),
  maxHistoryPerSchedule: parseInt(import.meta.env.VITE_MAX_HISTORY_PER_SCHEDULE || '1000', 10),
  enableDailyExport: import.meta.env.VITE_FTP_EXPORT_ENABLED !== 'false',
  exportPath: import.meta.env.VITE_FTP_EXPORT_PATH || '/var/log/radio-automation/ftp-downloads',
  exportFormat: (import.meta.env.VITE_FTP_EXPORT_FORMAT as 'json' | 'csv' | 'both') || 'both',
  exportTime: import.meta.env.VITE_FTP_EXPORT_TIME || '0 1 * * *', // 1 AM daily
  enableAutoCleanup: import.meta.env.VITE_FTP_CLEANUP_ENABLED !== 'false',
  cleanupTime: import.meta.env.VITE_FTP_CLEANUP_TIME || '0 2 * * *' // 2 AM daily
}

/**
 * Application-wide production configuration
 */
export const PRODUCTION_CONFIG = {
  app: {
    name: 'Radio Automation System',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: 'production',
    debug: false,
    enableMockData: false
  },
  
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3', 10),
    rateLimitRequests: parseInt(import.meta.env.VITE_API_RATE_LIMIT_REQUESTS || '1000', 10),
    rateLimitWindow: parseInt(import.meta.env.VITE_API_RATE_LIMIT_WINDOW || '3600', 10)
  },
  
  security: {
    enableEncryption: true,
    enableSSL: false, // Set to false for development, enable in production
    validateCertificates: import.meta.env.VITE_VALIDATE_CERTIFICATES !== 'false',
    enableCSRF: true,
    enableCORS: true,
    enableHSTS: import.meta.env.VITE_ENABLE_HSTS === 'true',
    sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '3600', 10), // 1 hour
    enableSecurityHeaders: true
  },
  
  storage: {
    enableEncryption: true,
    enableCompression: true,
    enableBackups: true,
    backupInterval: import.meta.env.VITE_BACKUP_INTERVAL || 'daily',
    maxFileSize: import.meta.env.VITE_MAX_FILE_SIZE || '100MB',
    allowedFileTypes: ['.mp3', '.wav', '.flac', '.m4a', '.aac'],
    quarantineUnknownFiles: true
  },
  
  monitoring: {
    enableLogging: true,
    logLevel: 'warn',
    enableMetrics: import.meta.env.VITE_METRICS_ENABLED !== 'false',
    enableErrorReporting: import.meta.env.VITE_ERROR_REPORTING_ENABLED !== 'false',
    enablePerformanceMonitoring: true,
    enableHealthChecks: true,
    metricsEndpoint: import.meta.env.VITE_METRICS_ENDPOINT
  },
  
  performance: {
    enableCaching: true,
    enableCompression: true,
    enableCDN: import.meta.env.VITE_CDN_URL ? true : false,
    cdnUrl: import.meta.env.VITE_CDN_URL,
    maxConcurrentUploads: parseInt(import.meta.env.VITE_MAX_CONCURRENT_UPLOADS || '3', 10),
    chunkSize: import.meta.env.VITE_CHUNK_SIZE || '1MB'
  },
  
  features: {
    enableExperimentalFeatures: false,
    enableBetaFeatures: false,
    enableA11yFeatures: true,
    enableOfflineMode: false
  }
}

/**
 * Validation function to ensure all required production settings are configured
 */
export function validateProductionConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check required environment variables
  if (!import.meta.env.VITE_API_URL) {
    errors.push('VITE_API_URL is required in production')
  }
  
  if (!import.meta.env.VITE_FTP_ENCRYPTION_KEY && PRODUCTION_FTP_SECURITY.enablePasswordEncryption) {
    errors.push('VITE_FTP_ENCRYPTION_KEY is required when password encryption is enabled')
  }
  
  // Validate security settings
  if (!PRODUCTION_CONFIG.security.enableSSL && import.meta.env.VITE_APP_ENV === 'production') {
    errors.push('SSL must be enabled in production')
  }
  
  if (!PRODUCTION_CONFIG.security.enableEncryption) {
    errors.push('Encryption must be enabled in production')
  }
  
  // Validate storage paths
  if (PRODUCTION_ENVIRONMENT.dataStoragePath.includes('./')) {
    errors.push('dataStoragePath should use absolute paths in production')
  }
  
  if (PRODUCTION_HISTORY_SETTINGS.exportPath.includes('./')) {
    errors.push('exportPath should use absolute paths in production')
  }
  
  // Validate retention settings
  if (PRODUCTION_HISTORY_SETTINGS.successfulDownloadRetentionDays < 7) {
    errors.push('successfulDownloadRetentionDays should be at least 7 days in production')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get configuration based on current environment
 */
export function getEnvironmentConfig(): FTPEnvironmentConfig {
  // Check multiple environment variables for better compatibility
  const environment = (
    import.meta.env.VITE_APP_ENV || 
    import.meta.env.NODE_ENV || 
    import.meta.env.MODE || 
    'development'
  ) as 'development' | 'staging' | 'production'
  
  // Allow disabling mock mode for real FTP testing in development
  const forceRealConnections = import.meta.env.VITE_FORCE_REAL_FTP === 'true'
  
  console.log(`🔧 Environment detected: ${environment}`)
  console.log(`🔧 Force real FTP connections: ${forceRealConnections}`)
  
  switch (environment) {
    case 'production':
      return PRODUCTION_ENVIRONMENT
    case 'staging':
      return {
        ...PRODUCTION_ENVIRONMENT,
        environment: 'staging',
        logLevel: 'info',
        enableMockMode: false
      }
    default:
      // Default to development mode with optional real connections
      return {
        ...PRODUCTION_ENVIRONMENT,
        environment: 'development',
        logLevel: 'debug',
        enableMockMode: !forceRealConnections, // Disable mock mode if forcing real connections
        dataStoragePath: './data',
        tempDirectory: './temp'
      }
  }
}

/**
 * Production security checklist
 */
export const PRODUCTION_SECURITY_CHECKLIST = [
  'Set strong VITE_FTP_ENCRYPTION_KEY environment variable',
  'Configure HTTPS/SSL certificates',
  'Set up proper CORS origins',
  'Enable rate limiting',
  'Configure secure session management',
  'Set up proper backup encryption',
  'Configure monitoring and alerting',
  'Set up log rotation and retention',
  'Configure firewall rules',
  'Set up database encryption at rest',
  'Enable audit logging',
  'Configure proper file permissions',
  'Set up vulnerability scanning',
  'Configure secure password policies',
  'Set up proper error handling (no sensitive data in errors)',
  'Configure security headers (HSTS, CSP, etc.)',
  'Set up proper authentication and authorization',
  'Configure secure cookie settings',
  'Set up input validation and sanitization',
  'Configure proper cache control headers'
] 