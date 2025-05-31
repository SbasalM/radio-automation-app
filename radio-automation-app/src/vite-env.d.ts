/// <reference types="vite/client" />

interface ImportMetaEnv {
  // App Configuration
  readonly VITE_APP_VERSION?: string
  readonly VITE_APP_ENV?: 'development' | 'staging' | 'production'
  readonly VITE_API_URL?: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_API_RETRY_ATTEMPTS?: string
  readonly VITE_API_RATE_LIMIT_REQUESTS?: string
  readonly VITE_API_RATE_LIMIT_WINDOW?: string

  // FTP Configuration
  readonly VITE_FTP_ENCRYPTION_KEY?: string
  readonly VITE_FTP_CONNECTION_TIMEOUT?: string
  readonly VITE_FTP_RETRY_ATTEMPTS?: string
  readonly VITE_FTP_RETRY_DELAY?: string
  readonly VITE_FTP_ENABLE_SSL_VALIDATION?: string
  readonly VITE_FTP_MAX_CONCURRENT_CONNECTIONS?: string

  // Logging and Monitoring
  readonly VITE_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
  readonly VITE_METRICS_ENABLED?: string
  readonly VITE_ERROR_REPORTING_ENABLED?: string
  readonly VITE_METRICS_ENDPOINT?: string

  // Storage
  readonly VITE_DATA_STORAGE_PATH?: string
  readonly VITE_TEMP_DIRECTORY?: string
  readonly VITE_BACKUP_RETENTION_DAYS?: string
  readonly VITE_BACKUP_INTERVAL?: string
  readonly VITE_MAX_FILE_SIZE?: string

  // History Settings
  readonly VITE_SUCCESSFUL_RETENTION_DAYS?: string
  readonly VITE_FAILED_RETENTION_DAYS?: string
  readonly VITE_MAX_HISTORY_PER_SCHEDULE?: string
  readonly VITE_FTP_EXPORT_ENABLED?: string
  readonly VITE_FTP_EXPORT_PATH?: string
  readonly VITE_FTP_EXPORT_FORMAT?: 'json' | 'csv' | 'both'
  readonly VITE_FTP_EXPORT_TIME?: string
  readonly VITE_FTP_CLEANUP_ENABLED?: string
  readonly VITE_FTP_CLEANUP_TIME?: string

  // Security
  readonly VITE_VALIDATE_CERTIFICATES?: string
  readonly VITE_ENABLE_HSTS?: string
  readonly VITE_SESSION_TIMEOUT?: string

  // Performance
  readonly VITE_CDN_URL?: string
  readonly VITE_MAX_CONCURRENT_UPLOADS?: string
  readonly VITE_CHUNK_SIZE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
