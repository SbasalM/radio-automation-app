import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getNextRunTime } from '@/utils/cron-helper'
import { processPasswordForStorage, logSecurityEvent } from '@/utils/security'
import { getEnvironmentConfig } from '@/config/production.config'
import type { FTPProfile, FTPSchedule, FTPDownloadHistory, FTPHistorySettings } from '@/types/ftp'

interface FTPStore {
  profiles: FTPProfile[]
  schedules: FTPSchedule[]
  downloadHistory: FTPDownloadHistory[]
  historySettings: FTPHistorySettings
  
  // Profile methods
  addProfile: (profile: Omit<FTPProfile, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProfile: (id: string, updates: Partial<FTPProfile>) => void
  deleteProfile: (id: string) => void
  getProfile: (id: string) => FTPProfile | undefined
  getAllProfiles: () => FTPProfile[]
  getActiveProfiles: () => FTPProfile[]
  
  // Schedule methods
  addSchedule: (schedule: Omit<FTPSchedule, 'id' | 'createdAt' | 'updatedAt' | 'nextRun'>) => void
  updateSchedule: (id: string, updates: Partial<FTPSchedule>) => void
  deleteSchedule: (id: string) => void
  getSchedule: (id: string) => FTPSchedule | undefined
  getAllSchedules: () => FTPSchedule[]
  getActiveSchedules: () => FTPSchedule[]
  getSchedulesByProfile: (profileId: string) => FTPSchedule[]
  
  // Download history methods
  addDownloadHistory: (history: Omit<FTPDownloadHistory, 'id'>) => void
  getDownloadHistory: (scheduleId: string) => FTPDownloadHistory[]
  isFileAlreadyDownloaded: (scheduleId: string, filename: string, fileSize?: number, fileModified?: Date) => boolean
  clearDownloadHistory: (scheduleId?: string) => void
  setDownloadHistory: (history: FTPDownloadHistory[]) => void
  
  // History settings methods
  getHistorySettings: () => FTPHistorySettings
  updateHistorySettings: (updates: Partial<FTPHistorySettings>) => void
  
  // Utility methods
  updateScheduleNextRun: (id: string) => void
  getNextScheduledDownload: () => { schedule: FTPSchedule; profile: FTPProfile } | null
}

// Environment-aware mock profiles (only for development)
function createMockProfiles(): FTPProfile[] {
  const config = getEnvironmentConfig()
  
  // In production, start with empty profiles for security
  if (config.environment === 'production') {
    logSecurityEvent('FTP Store initialized in production mode', { mockProfilesDisabled: true })
    return []
  }
  
  // Development mock profiles
  logSecurityEvent('FTP Store initialized in development mode', { mockProfilesEnabled: true })
  
  return [
    {
      id: 'dev-profile-1',
      name: '[DEV] Test FTP Server',
      host: 'test.example.com',
      port: 21,
      username: 'testuser',
      password: 'testpass123', // Will be encrypted by the store
      protocol: 'ftp',
      basePath: '/test',
      enabled: false, // Disabled by default for safety
      connectionStatus: 'disconnected',
      lastTested: new Date(Date.now() - 60 * 60 * 1000),
      createdAt: new Date('2024-01-10T08:00:00Z'),
      updatedAt: new Date()
    },
    {
      id: 'dev-profile-2',
      name: '[DEV] Test SFTP Server',
      host: 'sftp.example.com',
      port: 22,
      username: 'sftpuser',
      password: 'sftppass456', // Will be encrypted by the store
      protocol: 'sftp',
      basePath: '/sftp/test',
      enabled: false, // Disabled by default for safety
      connectionStatus: 'disconnected',
      lastTested: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date('2024-01-05T12:00:00Z'),
      updatedAt: new Date()
    }
  ]
}

// Environment-aware mock schedules
function createMockSchedules(): FTPSchedule[] {
  const config = getEnvironmentConfig()
  
  // In production, start with empty schedules
  if (config.environment === 'production') {
    return []
  }
  
  // Development mock schedules
  return [
    {
      id: 'dev-schedule-1',
      name: '[DEV] Test Daily Download',
      ftpProfileId: 'dev-profile-1',
      showId: '1',
      filePattern: 'test_{YYYY-MM-DD}.mp3',
      cronExpression: '0 6 * * *', // Daily at 6:00 AM
      lastRun: new Date(Date.now() - 18 * 60 * 60 * 1000),
      nextRun: getNextRunTime('0 6 * * *'),
      enabled: false, // Disabled by default for safety
      downloadMode: 'current-day',
      maxFilesPerRun: 1,
      trackDownloadHistory: true,
      createdAt: new Date('2024-01-10T10:00:00Z'),
      updatedAt: new Date()
    }
  ]
}

export const useFTPStore = create<FTPStore>()(
  persist(
    (set, get) => ({
      profiles: createMockProfiles(),
      schedules: createMockSchedules(),
      downloadHistory: [],
      historySettings: {
        successfulDownloadRetentionDays: 90,
        failedDownloadRetentionDays: 30,
        maxHistoryPerSchedule: 1000,
        enableDailyExport: true,
        exportPath: './logs/ftp-downloads',
        exportFormat: 'both',
        exportTime: '0 1 * * *', // 1 AM daily
        enableAutoCleanup: true,
        cleanupTime: '0 2 * * *', // 2 AM daily
      },

      // Profile methods
      addProfile: (profileData) => {
        try {
          // Encrypt password before storage
          const encryptedPassword = processPasswordForStorage(profileData.password)
          
          const newProfile: FTPProfile = {
            ...profileData,
            id: Date.now().toString(),
            password: encryptedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          
          set((state) => ({
            profiles: [...state.profiles, newProfile]
          }))
          
          logSecurityEvent('FTP profile added', {
            profileId: newProfile.id,
            host: newProfile.host,
            protocol: newProfile.protocol,
            passwordEncrypted: encryptedPassword !== profileData.password
          })
          
        } catch (error) {
          logSecurityEvent('Failed to add FTP profile', {
            host: profileData.host,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          throw error
        }
      },

      updateProfile: (id, updates) => {
        try {
          set((state) => ({
            profiles: state.profiles.map((profile) => {
              if (profile.id === id) {
                const updatedProfile = { ...profile, ...updates, updatedAt: new Date() }
                
                // Encrypt password if it's being updated
                if (updates.password) {
                  updatedProfile.password = processPasswordForStorage(updates.password)
                }
                
                logSecurityEvent('FTP profile updated', {
                  profileId: id,
                  host: updatedProfile.host,
                  passwordUpdated: Boolean(updates.password)
                })
                
                return updatedProfile
              }
              return profile
            })
          }))
        } catch (error) {
          logSecurityEvent('Failed to update FTP profile', {
            profileId: id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          throw error
        }
      },

      deleteProfile: (id) => {
        const profile = get().profiles.find(p => p.id === id)
        
        set((state) => ({
          profiles: state.profiles.filter((profile) => profile.id !== id),
          // Also delete associated schedules and download history
          schedules: state.schedules.filter((schedule) => schedule.ftpProfileId !== id),
          downloadHistory: state.downloadHistory.filter((history) => {
            const schedule = state.schedules.find(s => s.id === history.scheduleId)
            return schedule?.ftpProfileId !== id
          })
        }))
        
        logSecurityEvent('FTP profile deleted', {
          profileId: id,
          host: profile?.host,
          associatedSchedulesRemoved: true
        })
      },

      getProfile: (id) => {
        return get().profiles.find((profile) => profile.id === id)
      },

      getAllProfiles: () => {
        return get().profiles
      },

      getActiveProfiles: () => {
        return get().profiles.filter((profile) => profile.enabled)
      },

      // Schedule methods
      addSchedule: (scheduleData) => {
        const nextRun = getNextRunTime(scheduleData.cronExpression)
        const newSchedule: FTPSchedule = {
          ...scheduleData,
          id: Date.now().toString(),
          nextRun,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state) => ({
          schedules: [...state.schedules, newSchedule]
        }))
        
        logSecurityEvent('FTP schedule added', {
          scheduleId: newSchedule.id,
          name: newSchedule.name,
          ftpProfileId: newSchedule.ftpProfileId,
          downloadMode: newSchedule.downloadMode,
          enabled: newSchedule.enabled
        })
      },

      updateSchedule: (id, updates) => {
        set((state) => ({
          schedules: state.schedules.map((schedule) => {
            if (schedule.id === id) {
              const updated = { ...schedule, ...updates, updatedAt: new Date() }
              // Recalculate next run if cron expression changed
              if (updates.cronExpression) {
                updated.nextRun = getNextRunTime(updates.cronExpression)
              }
              
              logSecurityEvent('FTP schedule updated', {
                scheduleId: id,
                name: updated.name,
                enabled: updated.enabled,
                cronChanged: Boolean(updates.cronExpression)
              })
              
              return updated
            }
            return schedule
          })
        }))
      },

      deleteSchedule: (id) => {
        const schedule = get().schedules.find(s => s.id === id)
        
        set((state) => ({
          schedules: state.schedules.filter((schedule) => schedule.id !== id),
          // Also delete associated download history
          downloadHistory: state.downloadHistory.filter((history) => history.scheduleId !== id)
        }))
        
        logSecurityEvent('FTP schedule deleted', {
          scheduleId: id,
          name: schedule?.name,
          historyRemoved: true
        })
      },

      getSchedule: (id) => {
        return get().schedules.find((schedule) => schedule.id === id)
      },

      getAllSchedules: () => {
        return get().schedules
      },

      getActiveSchedules: () => {
        return get().schedules.filter((schedule) => schedule.enabled)
      },

      getSchedulesByProfile: (profileId) => {
        return get().schedules.filter((schedule) => schedule.ftpProfileId === profileId)
      },

      // Download history methods
      addDownloadHistory: (historyData) => {
        const newHistory: FTPDownloadHistory = {
          ...historyData,
          id: Date.now().toString()
        }
        set((state) => ({
          downloadHistory: [...state.downloadHistory, newHistory]
        }))
        
        // Log download event (production-safe)
        logSecurityEvent('FTP download recorded', {
          scheduleId: historyData.scheduleId,
          filename: historyData.filename,
          successful: historyData.successful,
          fileSize: historyData.fileSize
        })
      },

      getDownloadHistory: (scheduleId) => {
        return get().downloadHistory.filter((history) => history.scheduleId === scheduleId)
      },

      isFileAlreadyDownloaded: (scheduleId, filename, fileSize?, fileModified?) => {
        const history = get().downloadHistory.filter((h) => 
          h.scheduleId === scheduleId && 
          h.filename === filename && 
          h.successful
        )
        
        if (history.length === 0) return false
        
        // If we have size/modified date, check for changes
        if (fileSize !== undefined || fileModified !== undefined) {
          const latestHistory = history.sort((a, b) => 
            new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
          )[0]
          
          // File changed if size or modified date is different
          if (fileSize !== undefined && latestHistory.fileSize !== fileSize) return false
          if (fileModified !== undefined && latestHistory.fileModified.getTime() !== fileModified.getTime()) return false
        }
        
        return true
      },

      clearDownloadHistory: (scheduleId?) => {
        const beforeCount = get().downloadHistory.length
        
        set((state) => ({
          downloadHistory: scheduleId 
            ? state.downloadHistory.filter((history) => history.scheduleId !== scheduleId)
            : []
        }))
        
        const afterCount = get().downloadHistory.length
        
        logSecurityEvent('FTP download history cleared', {
          scheduleId: scheduleId || 'all',
          recordsRemoved: beforeCount - afterCount
        })
      },

      setDownloadHistory: (history) => {
        set((state) => ({
          downloadHistory: history
        }))
      },

      // History settings methods
      getHistorySettings: () => {
        return get().historySettings
      },

      updateHistorySettings: (updates) => {
        set((state) => ({
          historySettings: { ...state.historySettings, ...updates }
        }))
        
        logSecurityEvent('FTP history settings updated', {
          updatedFields: Object.keys(updates)
        })
      },

      // Utility methods
      updateScheduleNextRun: (id) => {
        set((state) => ({
          schedules: state.schedules.map((schedule) => {
            if (schedule.id === id) {
              return {
                ...schedule,
                nextRun: getNextRunTime(schedule.cronExpression),
                lastRun: new Date(),
                updatedAt: new Date()
              }
            }
            return schedule
          })
        }))
        
        logSecurityEvent('FTP schedule run updated', {
          scheduleId: id
        })
      },

      getNextScheduledDownload: () => {
        const { schedules, profiles } = get()
        const activeSchedules = schedules.filter((schedule) => schedule.enabled && schedule.nextRun)
        
        if (activeSchedules.length === 0) return null
        
        // Find the schedule with the earliest next run time
        const nextSchedule = activeSchedules.reduce((earliest, current) => 
          (current.nextRun && (!earliest.nextRun || current.nextRun < earliest.nextRun)) 
            ? current 
            : earliest
        )
        
        const profile = profiles.find((p) => p.id === nextSchedule.ftpProfileId)
        
        return profile ? { schedule: nextSchedule, profile } : null
      }
    }),
    {
      name: 'radio-automation-ftp',
    }
  )
) 