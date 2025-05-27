import { httpClient } from '@/utils/http-client'
import type { ShowProfile } from '@/types/show'

export interface CreateShowRequest {
  name: string
  description?: string
  enabled: boolean
  filePatterns: Array<{
    id?: string
    pattern: string
    type: 'ftp' | 'watch'
    ftpProfileId?: string
  }>
  outputDirectory: string
  autoProcessing?: boolean
}

export interface UpdateShowRequest extends Partial<CreateShowRequest> {}

class ShowApiService {
  private readonly basePath = '/api/shows'

  async getAllShows(): Promise<ShowProfile[]> {
    try {
      console.log('🔄 Fetching all shows from backend...')
      const response = await httpClient.get<{success: boolean, data: ShowProfile[]}>(this.basePath)
      const shows = response.data || []
      console.log('✅ Successfully fetched shows:', shows.length)
      return shows
    } catch (error) {
      console.error('❌ Failed to fetch shows:', error)
      throw new Error(`Failed to fetch shows: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getShow(id: string): Promise<ShowProfile> {
    try {
      console.log(`🔄 Fetching show ${id} from backend...`)
      const response = await httpClient.get<{success: boolean, data: ShowProfile}>(`${this.basePath}/${id}`)
      const show = response.data
      if (!show) throw new Error('Show data not found in response')
      console.log('✅ Successfully fetched show:', show.name)
      return show
    } catch (error) {
      console.error(`❌ Failed to fetch show ${id}:`, error)
      throw new Error(`Failed to fetch show: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async createShow(showData: CreateShowRequest): Promise<ShowProfile> {
    try {
      console.log('🔄 Creating new show:', showData.name)
      const response = await httpClient.post<{success: boolean, data: ShowProfile, message?: string}>(this.basePath, showData)
      const show = response.data
      if (!show) throw new Error('Show data not found in response')
      console.log('✅ Successfully created show:', show.name)
      return show
    } catch (error) {
      console.error('❌ Failed to create show:', error)
      throw new Error(`Failed to create show: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateShow(id: string, updates: UpdateShowRequest): Promise<ShowProfile> {
    try {
      console.log(`🔄 Updating show ${id}...`)
      const response = await httpClient.put<{success: boolean, data: ShowProfile, message?: string}>(`${this.basePath}/${id}`, updates)
      const show = response.data
      if (!show) throw new Error('Show data not found in response')
      console.log('✅ Successfully updated show:', show.name)
      return show
    } catch (error) {
      console.error(`❌ Failed to update show ${id}:`, error)
      throw new Error(`Failed to update show: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteShow(id: string): Promise<void> {
    try {
      console.log(`🔄 Deleting show ${id}...`)
      await httpClient.delete<{success: boolean, message?: string}>(`${this.basePath}/${id}`)
      console.log('✅ Successfully deleted show')
    } catch (error) {
      console.error(`❌ Failed to delete show ${id}:`, error)
      throw new Error(`Failed to delete show: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async healthCheck(): Promise<boolean> {
    return await httpClient.healthCheck()
  }
}

// Export singleton instance
export const showApiService = new ShowApiService()

// Export class for testing
export { ShowApiService } 