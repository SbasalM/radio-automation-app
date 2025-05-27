import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FileStatus } from '@/types/file'
import type { QueuedFile, ProcessingResult } from '@/types/file'
import { queueApiService } from '@/services/queue-api'

interface FileQueueStore {
  files: QueuedFile[]
  loading: boolean
  error: string | null
  
  // API actions
  loadQueue: () => Promise<void>
  retryFile: (id: string) => Promise<void>
  removeFile: (id: string) => Promise<void>
  clearAllFiles: () => Promise<void>
  
  // Local actions for real-time updates
  addFile: (file: Omit<QueuedFile, 'id' | 'addedAt'>) => void
  updateFileStatus: (id: string, status: FileStatus, result?: ProcessingResult) => void
  
  // Local getters
  getQueuedFiles: () => QueuedFile[]
  getFilesByStatus: (status: FileStatus) => QueuedFile[]
  getTodayCompletedCount: () => number
  getTodaySuccessRate: () => number
  cleanupOldFiles: () => void
  
  // Error handling
  clearError: () => void
}

export const useFileQueueStore = create<FileQueueStore>()(
  persist(
    (set, get) => ({
      files: [],
      loading: false,
      error: null,

      loadQueue: async () => {
        set({ loading: true, error: null })
        try {
          const files = await queueApiService.getAllQueuedFiles()
          set({ files, loading: false })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load queue',
            loading: false 
          })
        }
      },

      retryFile: async (id) => {
        set({ loading: true, error: null })
        try {
          await queueApiService.retryFile(id)
          // Update file status to pending/processing
          set((state) => {
            const files = Array.isArray(state.files) ? state.files : []
            return {
              files: files.map((file) =>
                file.id === id ? { ...file, status: FileStatus.PENDING } : file
              ),
              loading: false
            }
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to retry file',
            loading: false 
          })
          throw error
        }
      },

      removeFile: async (id) => {
        set({ loading: true, error: null })
        try {
          await queueApiService.removeFile(id)
          set((state) => {
            const files = Array.isArray(state.files) ? state.files : []
            return {
              files: files.filter((file) => file.id !== id),
              loading: false
            }
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to remove file',
            loading: false 
          })
          throw error
        }
      },

      clearAllFiles: async () => {
        set({ loading: true, error: null })
        try {
          await queueApiService.clearQueue()
          set({ files: [], loading: false })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to clear queue',
            loading: false 
          })
          throw error
        }
      },

      addFile: (fileData) => {
        const newFile: QueuedFile = {
          ...fileData,
          id: Date.now().toString(),
          addedAt: new Date()
        }
        set((state) => {
          const files = Array.isArray(state.files) ? state.files : []
          return {
            files: [...files, newFile]
          }
        })
      },

      updateFileStatus: (id, status, result) => {
        set((state) => {
          const files = Array.isArray(state.files) ? state.files : []
          return {
            files: files.map((file) =>
              file.id === id
                ? {
                    ...file,
                    status,
                    processedAt: status === FileStatus.COMPLETED || status === FileStatus.FAILED 
                      ? new Date() 
                      : file.processedAt,
                    outputPath: result?.outputPath || file.outputPath,
                    error: result?.error || (status === FileStatus.FAILED ? file.error : undefined),
                    processingTimeMs: result?.processingTimeMs || file.processingTimeMs
                  }
                : file
            )
          }
        })
      },

      getQueuedFiles: () => {
        const state = get()
        return Array.isArray(state.files) ? state.files : []
      },

      getFilesByStatus: (status) => {
        const state = get()
        const files = Array.isArray(state.files) ? state.files : []
        return files.filter((file) => file.status === status)
      },

      getTodayCompletedCount: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const state = get()
        const files = Array.isArray(state.files) ? state.files : []
        
        return files.filter((file) => 
          file.status === FileStatus.COMPLETED && 
          file.processedAt && 
          file.processedAt >= today
        ).length
      },

      getTodaySuccessRate: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const state = get()
        const files = Array.isArray(state.files) ? state.files : []
        
        const todayProcessed = files.filter((file) => 
          (file.status === FileStatus.COMPLETED || file.status === FileStatus.FAILED) && 
          file.processedAt && 
          file.processedAt >= today
        )
        
        if (todayProcessed.length === 0) return 100
        
        const successful = todayProcessed.filter((file) => 
          file.status === FileStatus.COMPLETED
        ).length
        
        return Math.round((successful / todayProcessed.length) * 100)
      },

      cleanupOldFiles: () => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        set((state) => {
          const files = Array.isArray(state.files) ? state.files : []
          return {
            files: files.filter((file) => 
              !(file.status === FileStatus.COMPLETED && 
                file.processedAt && 
                file.processedAt < twentyFourHoursAgo)
            )
          }
        })
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'radio-automation-file-queue',
    }
  )
) 