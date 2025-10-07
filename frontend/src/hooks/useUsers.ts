import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  data: T
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const response = await apiClient.get<User[]>('/users')
      if (response.error) {
        throw new Error(response.error.message)
      }
      return (response.data as User[]) || []
    },
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async (): Promise<User> => {
      const response = await apiClient.get<User>(`/users/${id}`)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data as User
    },
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: Partial<User>): Promise<User> => {
      const response = await apiClient.post<ApiResponse<User>>('/users', userData)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data!.data
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}