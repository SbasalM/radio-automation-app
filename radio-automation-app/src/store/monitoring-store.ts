import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MonitoringStore {
  isMonitoring: boolean
  lastScanTime?: Date
  totalFilesProcessed: number
  startMonitoring: () => void
  stopMonitoring: () => void
  updateLastScanTime: () => void
  incrementFilesProcessed: () => void
}

export const useMonitoringStore = create<MonitoringStore>()(
  persist(
    (set, get) => ({
      isMonitoring: false,
      lastScanTime: undefined,
      totalFilesProcessed: 0,

      startMonitoring: () => {
        set({ isMonitoring: true, lastScanTime: new Date() })
      },

      stopMonitoring: () => {
        set({ isMonitoring: false })
      },

      updateLastScanTime: () => {
        set({ lastScanTime: new Date() })
      },

      incrementFilesProcessed: () => {
        set((state) => ({ 
          totalFilesProcessed: state.totalFilesProcessed + 1 
        }))
      }
    }),
    {
      name: 'radio-automation-monitoring',
    }
  )
) 