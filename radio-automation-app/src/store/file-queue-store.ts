import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FileStatus } from '@/types/file'
import type { QueuedFile, ProcessingResult } from '@/types/file'

interface FileQueueStore {
  files: QueuedFile[]
  addFile: (file: Omit<QueuedFile, 'id' | 'addedAt'>) => void
  updateFileStatus: (id: string, status: FileStatus, result?: ProcessingResult) => void
  removeFile: (id: string) => void
  getQueuedFiles: () => QueuedFile[]
  getFilesByStatus: (status: FileStatus) => QueuedFile[]
  getTodayCompletedCount: () => number
  getTodaySuccessRate: () => number
  cleanupOldFiles: () => void
  clearAllFiles: () => void
}

// Mock data for demonstration
const mockFiles: QueuedFile[] = [
  {
    id: '1',
    filename: 'MorningShow_Episode1.mp3',
    showId: '1',
    status: FileStatus.COMPLETED,
    addedAt: new Date(Date.now() - 10 * 60 * 1000),
    processedAt: new Date(Date.now() - 5 * 60 * 1000),
    sourcePath: '/watch/morning-show/MorningShow_Episode1.mp3',
    outputPath: '/processed/morning-show/MorningShow_Episode1.mp3',
    processingTimeMs: 15000
  },
  {
    id: '2',
    filename: 'EveningNews_Today.wav',
    showId: '2',
    status: FileStatus.PROCESSING,
    addedAt: new Date(Date.now() - 2 * 60 * 1000),
    sourcePath: '/watch/evening-news/EveningNews_Today.wav'
  },
  {
    id: '3',
    filename: 'Sports_Weekend_Highlights.mp3',
    showId: '3',
    status: FileStatus.FAILED,
    addedAt: new Date(Date.now() - 30 * 60 * 1000),
    processedAt: new Date(Date.now() - 25 * 60 * 1000),
    error: 'Audio codec not supported',
    sourcePath: '/watch/sports/Sports_Weekend_Highlights.mp3',
    processingTimeMs: 5000
  },
  {
    id: '4',
    filename: 'MorningShow_Interview.mp3',
    showId: '1',
    status: FileStatus.PENDING,
    addedAt: new Date(Date.now() - 1 * 60 * 1000),
    sourcePath: '/watch/morning-show/MorningShow_Interview.mp3'
  }
]

export const useFileQueueStore = create<FileQueueStore>()(
  persist(
    (set, get) => ({
      files: mockFiles,

      addFile: (fileData) => {
        const newFile: QueuedFile = {
          ...fileData,
          id: Date.now().toString(),
          addedAt: new Date()
        }
        set((state) => ({
          files: [...state.files, newFile]
        }))
      },

      updateFileStatus: (id, status, result) => {
        set((state) => ({
          files: state.files.map((file) =>
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
        }))
      },

      removeFile: (id) => {
        set((state) => ({
          files: state.files.filter((file) => file.id !== id)
        }))
      },

      getQueuedFiles: () => {
        return get().files
      },

      getFilesByStatus: (status) => {
        return get().files.filter((file) => file.status === status)
      },

      getTodayCompletedCount: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        return get().files.filter((file) => 
          file.status === FileStatus.COMPLETED && 
          file.processedAt && 
          file.processedAt >= today
        ).length
      },

      getTodaySuccessRate: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const todayProcessed = get().files.filter((file) => 
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
        
        set((state) => ({
          files: state.files.filter((file) => 
            !(file.status === FileStatus.COMPLETED && 
              file.processedAt && 
              file.processedAt < twentyFourHoursAgo)
          )
        }))
      },

      clearAllFiles: () => {
        set({ files: [] })
      }
    }),
    {
      name: 'radio-automation-file-queue',
    }
  )
) 