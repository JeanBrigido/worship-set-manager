import { generateBackendJWT } from './jwt-bridge'

// Call backend API directly instead of proxying through Next.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface ApiResponse<T = any> {
  data?: T
  error?: {
    message: string
    code?: string
    details?: any[]
  }
}

/**
 * Authenticated API client that calls the backend directly
 * with JWT authentication from NextAuth session
 */
export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Make an authenticated API request to the backend
   * Automatically includes JWT token from NextAuth session
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Generate JWT token from NextAuth session
      const token = await generateBackendJWT()

      const url = `${this.baseUrl}/api${endpoint}`

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      }

      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(url, {
        ...options,
        headers,
      })

      const jsonResponse = await response.json()

      if (!response.ok) {
        return {
          error: {
            message: jsonResponse.error?.message || jsonResponse.error || 'API request failed',
            code: jsonResponse.error?.code,
            details: jsonResponse.error?.details,
          }
        }
      }

      // Backend returns { data: T }, so extract the data field
      return { data: jsonResponse.data }
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        }
      }
    }
  }

  // Convenience methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Default client instance
export const apiClient = new ApiClient()
