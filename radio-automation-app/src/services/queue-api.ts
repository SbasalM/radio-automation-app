import { httpClient } from '@/utils/http-client'
import type { QueuedFile } from '@/types/file'

class QueueApiService {
  private readonly basePath = '/api/queue'

  async getAllQueuedFiles(): Promise<QueuedFile[]> {
    try {
      console.log('🔄 Fetching file queue from backend...')
      const response = await httpClient.get<{success: boolean, data: QueuedFile[]}>(this.basePath)
      console.log('✅ Successfully fetched queue:', response.data?.length || 0, 'files')
      return response.data || []
    } catch (error) {
      console.error('❌ Failed to fetch queue:', error)
      throw new Error(`Failed to fetch queue: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async retryFile(fileId: string): Promise<void> {
    try {
      console.log(`🔄 Retrying file ${fileId}...`)
      const response = await httpClient.post<{success: boolean, message: string}>(`${this.basePath}/${fileId}/retry`)
      console.log('✅ Successfully retried file')
    } catch (error) {
      console.error(`❌ Failed to retry file ${fileId}:`, error)
      throw new Error(`Failed to retry file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async removeFile(fileId: string): Promise<void> {
    try {
      console.log(`🔄 Removing file ${fileId} from queue...`)
      const response = await httpClient.delete<{success: boolean, message: string}>(`${this.basePath}/${fileId}`)
      console.log('✅ Successfully removed file from queue')
    } catch (error) {
      console.error(`❌ Failed to remove file ${fileId}:`, error)
      throw new Error(`Failed to remove file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async clearQueue(): Promise<void> {
    try {
      console.log('🔄 Clearing entire queue...')
      const response = await httpClient.delete<{success: boolean, message: string}>(this.basePath)
      console.log('✅ Successfully cleared queue')
    } catch (error) {
      console.error('❌ Failed to clear queue:', error)
      throw new Error(`Failed to clear queue: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async healthCheck(): Promise<boolean> {
    return await httpClient.healthCheck()
  }
}

// Export singleton instance
export const queueApiService = new QueueApiService()

// Export class for testing
export { QueueApiService } 