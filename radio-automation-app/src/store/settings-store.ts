import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultSettings } from '@/types/settings'
import type { 
  ApplicationSettings, 
  GeneralSettings, 
  ProcessingDefaults, 
  NotificationSettings, 
  WatchFolderSettings, 
  StorageSettings, 
  SystemSettings,
  SettingsBackup,
  SettingsValidationResult
} from '@/types/settings'

interface SettingsStore {
  settings: ApplicationSettings
  isLoading: boolean
  lastSaved: Date | null
  isDirty: boolean
  
  // General settings
  updateGeneralSettings: (updates: Partial<GeneralSettings>) => void
  
  // Processing settings
  updateProcessingDefaults: (updates: Partial<ProcessingDefaults>) => void
  
  // Notification settings
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void
  
  // Watch folder settings
  updateWatchFolderSettings: (updates: Partial<WatchFolderSettings>) => void
  
  // Storage settings
  updateStorageSettings: (updates: Partial<StorageSettings>) => void
  
  // System settings
  updateSystemSettings: (updates: Partial<SystemSettings>) => void
  
  // Bulk operations
  updateAllSettings: (settings: ApplicationSettings) => void
  resetToDefaults: () => void
  resetSection: (section: keyof Omit<ApplicationSettings, 'version' | 'lastUpdated'>) => void
  
  // Import/Export
  exportSettings: () => SettingsBackup
  importSettings: (backup: SettingsBackup) => Promise<SettingsValidationResult>
  validateSettings: (settings: ApplicationSettings) => SettingsValidationResult
  
  // Persistence
  saveSettings: () => Promise<void>
  loadSettings: () => Promise<void>
  markClean: () => void
  
  // Utility
  getSettingByPath: (path: string) => any
  setSettingByPath: (path: string, value: any) => void
}

// Settings validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return !email || emailRegex.test(email)
}

const validatePath = (path: string): boolean => {
  return path.length > 0 && !path.includes('..')
}

const validateCron = (cron: string): boolean => {
  // Basic cron validation (simplified)
  const parts = cron.split(' ')
  return parts.length === 5
}

const validateSettings = (settings: ApplicationSettings): SettingsValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  
  // General settings validation
  if (!settings.general.appName.trim()) {
    errors.push('Application name cannot be empty')
  }
  
  // Processing settings validation
  if (settings.processing.normalizationLevel > 0 || settings.processing.normalizationLevel < -60) {
    warnings.push('Normalization level should be between -60 and 0 LUFS')
  }
  
  // Notification settings validation
  if (settings.notifications.emailEnabled) {
    if (!validateEmail(settings.notifications.emailAddress)) {
      errors.push('Invalid email address')
    }
    if (!settings.notifications.smtpServer.trim()) {
      errors.push('SMTP server is required when email is enabled')
    }
    if (settings.notifications.smtpPort < 1 || settings.notifications.smtpPort > 65535) {
      errors.push('SMTP port must be between 1 and 65535')
    }
  }
  
  // Storage settings validation
  if (!validatePath(settings.storage.primaryStoragePath)) {
    errors.push('Invalid primary storage path')
  }
  if (!validatePath(settings.storage.backupStoragePath)) {
    errors.push('Invalid backup storage path')
  }
  if (!validateCron(settings.storage.cleanupSchedule)) {
    errors.push('Invalid cleanup schedule format')
  }
  if (settings.storage.retentionDays < 1) {
    warnings.push('Retention period should be at least 1 day')
  }
  
  // Watch folder settings validation
  if (settings.watchFolders.enabled) {
    if (settings.watchFolders.scanIntervalSeconds < 5) {
      warnings.push('Scan interval should be at least 5 seconds')
    }
    if (settings.watchFolders.filePatterns.length === 0) {
      errors.push('At least one file pattern is required')
    }
  }
  
  // System settings validation
  if (settings.system.memoryLimit < 256) {
    warnings.push('Memory limit should be at least 256 MB')
  }
  if (settings.system.maxLogFiles < 1) {
    errors.push('Must keep at least 1 log file')
  }
  if (settings.system.maxConcurrentJobs < 1 || settings.system.maxConcurrentJobs > 10) {
    warnings.push('Concurrent jobs should be between 1 and 10')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: { ...defaultSettings },
      isLoading: false,
      lastSaved: null,
      isDirty: false,
      
      updateGeneralSettings: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            general: { ...state.settings.general, ...updates },
            lastUpdated: new Date()
          },
          isDirty: true
        }))
      },
      
      updateProcessingDefaults: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            processing: { ...state.settings.processing, ...updates },
            lastUpdated: new Date()
          },
          isDirty: true
        }))
      },
      
      updateNotificationSettings: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            notifications: { ...state.settings.notifications, ...updates },
            lastUpdated: new Date()
          },
          isDirty: true
        }))
      },
      
      updateWatchFolderSettings: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            watchFolders: { ...state.settings.watchFolders, ...updates },
            lastUpdated: new Date()
          },
          isDirty: true
        }))
      },
      
      updateStorageSettings: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            storage: { ...state.settings.storage, ...updates },
            lastUpdated: new Date()
          },
          isDirty: true
        }))
      },
      
      updateSystemSettings: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            system: { ...state.settings.system, ...updates },
            lastUpdated: new Date()
          },
          isDirty: true
        }))
      },
      
      updateAllSettings: (settings) => {
        set({
          settings: { ...settings, lastUpdated: new Date() },
          isDirty: true
        })
      },
      
      resetToDefaults: () => {
        set({
          settings: { ...defaultSettings, lastUpdated: new Date() },
          isDirty: true
        })
      },
      
      resetSection: (section) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [section]: { ...defaultSettings[section] },
            lastUpdated: new Date()
          },
          isDirty: true
        }))
      },
      
      exportSettings: () => {
        const state = get()
        return {
          exportedAt: new Date(),
          version: state.settings.version,
          settings: state.settings,
          metadata: {
            exportedBy: 'Radio Flow Settings Manager',
            systemInfo: `${navigator.userAgent}`,
            checksum: btoa(JSON.stringify(state.settings)).slice(0, 16)
          }
        }
      },
      
      importSettings: async (backup) => {
        try {
          // Validate the backup
          const validation = validateSettings(backup.settings)
          
          if (!validation.isValid) {
            return validation
          }
          
          // Check version compatibility
          if (backup.version !== get().settings.version) {
            validation.warnings.push('Settings exported from different version')
          }
          
          // Import settings if valid
          set((state) => ({
            settings: { ...backup.settings, lastUpdated: new Date() },
            isDirty: true
          }))
          
          return validation
        } catch (error) {
          return {
            isValid: false,
            errors: ['Failed to import settings: Invalid format'],
            warnings: []
          }
        }
      },
      
      validateSettings: (settings) => {
        return validateSettings(settings)
      },
      
      saveSettings: async () => {
        set({ isLoading: true })
        
        try {
          // Simulate save operation
          await new Promise(resolve => setTimeout(resolve, 500))
          
          set({
            lastSaved: new Date(),
            isDirty: false,
            isLoading: false
          })
          
          console.log('Settings saved successfully')
        } catch (error) {
          console.error('Failed to save settings:', error)
          set({ isLoading: false })
          throw error
        }
      },
      
      loadSettings: async () => {
        set({ isLoading: true })
        
        try {
          // Settings are loaded via persist middleware
          await new Promise(resolve => setTimeout(resolve, 200))
          
          set({ isLoading: false })
        } catch (error) {
          console.error('Failed to load settings:', error)
          set({ isLoading: false })
          throw error
        }
      },
      
      markClean: () => {
        set({ isDirty: false })
      },
      
      getSettingByPath: (path) => {
        const keys = path.split('.')
        let value = get().settings as any
        
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = value[key]
          } else {
            return undefined
          }
        }
        
        return value
      },
      
      setSettingByPath: (path, value) => {
        const keys = path.split('.')
        const lastKey = keys.pop()
        
        if (!lastKey) return
        
        set((state) => {
          const newSettings = { ...state.settings }
          let current = newSettings as any
          
          // Navigate to the parent object
          for (const key of keys) {
            if (current[key] && typeof current[key] === 'object') {
              current[key] = { ...current[key] }
              current = current[key]
            } else {
              return state // Path doesn't exist
            }
          }
          
          // Set the value
          current[lastKey] = value
          
          return {
            settings: { ...newSettings, lastUpdated: new Date() },
            isDirty: true
          }
        })
      }
    }),
    {
      name: 'radio-flow-settings',
      version: 1,
      partialize: (state) => ({ settings: state.settings }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false
          state.isDirty = false
          state.lastSaved = new Date()
        }
      }
    }
  )
) 