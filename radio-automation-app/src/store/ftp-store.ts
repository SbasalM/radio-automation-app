import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getNextRunTime } from '@/utils/cron-helper'
import type { FTPProfile, FTPSchedule } from '@/types/ftp'

interface FTPStore {
  profiles: FTPProfile[]
  schedules: FTPSchedule[]
  
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
  
  // Utility methods
  updateScheduleNextRun: (id: string) => void
  getNextScheduledDownload: () => { schedule: FTPSchedule; profile: FTPProfile } | null
}

// Mock FTP profiles
const mockProfiles: FTPProfile[] = [
  {
    id: '1',
    name: 'Main Station FTP',
    host: 'ftp.station.com',
    port: 21,
    username: 'radiouser',
    password: 'password123',
    protocol: 'ftp',
    basePath: '/shows',
    enabled: true,
    connectionStatus: 'connected',
    lastTested: new Date(Date.now() - 5 * 60 * 1000),
    createdAt: new Date('2024-01-10T08:00:00Z'),
    updatedAt: new Date('2024-01-20T14:30:00Z')
  },
  {
    id: '2',
    name: 'News Archive FTP',
    host: 'archive.news.com',
    port: 22,
    username: 'newsadmin',
    password: 'secure456',
    protocol: 'sftp',
    basePath: '/archive/daily',
    enabled: true,
    connectionStatus: 'connected',
    lastTested: new Date(Date.now() - 15 * 60 * 1000),
    createdAt: new Date('2024-01-05T12:00:00Z'),
    updatedAt: new Date('2024-01-18T09:15:00Z')
  },
  {
    id: '3',
    name: 'Sports Content Server',
    host: 'sports.media.com',
    port: 990,
    username: 'sportsuser',
    password: 'sports789',
    protocol: 'ftps',
    basePath: '/sports/weekly',
    enabled: false,
    connectionStatus: 'disconnected',
    lastTested: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date('2024-01-15T16:00:00Z'),
    updatedAt: new Date('2024-01-15T16:00:00Z')
  }
]

// Mock FTP schedules
const mockSchedules: FTPSchedule[] = [
  {
    id: '1',
    name: 'Morning Show Daily Download',
    ftpProfileId: '1',
    showId: '1', // Morning Show
    filePattern: 'MorningShow_{YYYY-MM-DD}.mp3',
    cronExpression: '0 5 * * *', // Daily at 5:00 AM
    lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
    nextRun: getNextRunTime('0 5 * * *'),
    enabled: true,
    createdAt: new Date('2024-01-10T10:00:00Z'),
    updatedAt: new Date('2024-01-20T11:00:00Z')
  },
  {
    id: '2',
    name: 'Evening News Download',
    ftpProfileId: '2',
    showId: '2', // Evening News
    filePattern: 'News_Evening_{YYYY-MM-DD}.wav',
    cronExpression: '0 18 * * *', // Daily at 6:00 PM
    lastRun: new Date(Date.now() - 6 * 60 * 60 * 1000),
    nextRun: getNextRunTime('0 18 * * *'),
    enabled: true,
    createdAt: new Date('2024-01-12T14:00:00Z'),
    updatedAt: new Date('2024-01-18T16:30:00Z')
  },
  {
    id: '3',
    name: 'Weekend Sports Recap',
    ftpProfileId: '3',
    showId: '3', // Weekend Sports
    filePattern: 'Sports_Weekend_{YYYY-MM-DD}.mp3',
    cronExpression: '0 6 * * 1', // Monday at 6:00 AM
    lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    nextRun: getNextRunTime('0 6 * * 1'),
    enabled: false,
    createdAt: new Date('2024-01-15T18:00:00Z'),
    updatedAt: new Date('2024-01-15T18:00:00Z')
  }
]

export const useFTPStore = create<FTPStore>()(
  persist(
    (set, get) => ({
      profiles: mockProfiles,
      schedules: mockSchedules,

      // Profile methods
      addProfile: (profileData) => {
        const newProfile: FTPProfile = {
          ...profileData,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state) => ({
          profiles: [...state.profiles, newProfile]
        }))
      },

      updateProfile: (id, updates) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id
              ? { ...profile, ...updates, updatedAt: new Date() }
              : profile
          )
        }))
      },

      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((profile) => profile.id !== id),
          // Also delete associated schedules
          schedules: state.schedules.filter((schedule) => schedule.ftpProfileId !== id)
        }))
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
              return updated
            }
            return schedule
          })
        }))
      },

      deleteSchedule: (id) => {
        set((state) => ({
          schedules: state.schedules.filter((schedule) => schedule.id !== id)
        }))
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

      updateScheduleNextRun: (id) => {
        const schedule = get().getSchedule(id)
        if (schedule) {
          const nextRun = getNextRunTime(schedule.cronExpression)
          get().updateSchedule(id, { 
            lastRun: new Date(),
            nextRun 
          })
        }
      },

      getNextScheduledDownload: () => {
        const activeSchedules = get().getActiveSchedules()
        const profiles = get().profiles
        
        if (activeSchedules.length === 0) return null

        // Find the schedule with the earliest next run time
        const nextSchedule = activeSchedules
          .filter(schedule => schedule.nextRun)
          .sort((a, b) => a.nextRun!.getTime() - b.nextRun!.getTime())[0]

        if (!nextSchedule) return null

        const profile = profiles.find(p => p.id === nextSchedule.ftpProfileId)
        if (!profile) return null

        return { schedule: nextSchedule, profile }
      }
    }),
    {
      name: 'radio-automation-ftp',
    }
  )
) 