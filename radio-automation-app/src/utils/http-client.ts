interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  timeout?: number
}

class HttpClient {
  private baseUrl: string
  private defaultTimeout: number

  constructor(baseUrl: string = 'http://localhost:3001', defaultTimeout: number = 10000) {
    this.baseUrl = baseUrl
    this.defaultTimeout = defaultTimeout
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = this.defaultTimeout
    } = options

    const url = `${this.baseUrl}${endpoint}`
    const isJsonBody = body && typeof body === 'object'

    const requestHeaders: Record<string, string> = {
      'Content-Type': isJsonBody ? 'application/json' : 'text/plain',
      ...headers
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: isJsonBody ? JSON.stringify(body) : body,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      } else {
        return await response.text() as unknown as T
      }
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`)
        }
        throw error
      }
      
      throw new Error('Unknown error occurred')
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers })
  }

  async post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers })
  }

  async put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers })
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers })
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health')
      return true
    } catch {
      return false
    }
  }

  // Update base URL if needed
  setBaseUrl(url: string): void {
    this.baseUrl = url
  }
}

// Create and export a singleton instance
export const httpClient = new HttpClient()

// Export the class for testing
export { HttpClient }

// Export types for use in other files
export type { ApiResponse, RequestOptions } 