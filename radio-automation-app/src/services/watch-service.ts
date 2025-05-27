import { useShowStore } from '@/store/show-store'
import { useFileQueueStore } from '@/store/file-queue-store'
import { useMonitoringStore } from '@/store/monitoring-store'
import { watchApiService } from '@/services/watch-api'
import { FileStatus } from '@/types/file'
import type { ShowProfile } from '@/types/show'

class WatchService {
  private intervalId: NodeJS.Timeout | null = null
  private isWatching: boolean = false

  async start() {
    if (this.isWatching) return

    console.log('🔍 Starting file monitoring service...')
    
    try {
      const { getActiveShows } = useShowStore.getState()
      const activeShows = getActiveShows()
      const showIds = activeShows.map(show => show.id)
      
      if (showIds.length === 0) {
        console.log('📭 No active shows to monitor')
        return
      }

      await watchApiService.startWatching(showIds)
      this.isWatching = true
      
      // Start polling for queue updates
      this.startQueuePolling()
      
    } catch (error) {
      console.error('❌ Failed to start file monitoring:', error)
      throw error
    }
  }

  async stop() {
    if (!this.isWatching) return

    console.log('⏹️ Stopping file monitoring service...')
    
    try {
      await watchApiService.stopWatching()
      this.isWatching = false
      
      // Stop polling
      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }
      
    } catch (error) {
      console.error('❌ Failed to stop file monitoring:', error)
      throw error
    }
  }

  private startQueuePolling() {
    if (this.intervalId) return

    // Poll queue every 5 seconds for updates
    this.intervalId = setInterval(async () => {
      try {
        const { loadQueue } = useFileQueueStore.getState()
        await loadQueue()
      } catch (error) {
        console.error('❌ Failed to refresh queue:', error)
      }
    }, 5000)
  }

  async getStatus() {
    try {
      return await watchApiService.getWatchStatus()
    } catch (error) {
      console.error('❌ Failed to get watch status:', error)
      throw error
    }
  }

  async retryFile(fileId: string) {
    try {
      const { retryFile } = useFileQueueStore.getState()
      await retryFile(fileId)
      console.log(`🔄 Successfully retried file: ${fileId}`)
    } catch (error) {
      console.error(`❌ Failed to retry file ${fileId}:`, error)
      throw error
    }
  }

  get isActive() {
    return this.isWatching
  }
}

// Singleton instance
export const watchService = new WatchService() 