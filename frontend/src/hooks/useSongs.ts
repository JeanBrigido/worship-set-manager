import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface Song {
  id: string
  title: string
  artist: string
  ccliNumber?: string
  defaultYoutubeUrl?: string
  tags: string[]
  language: string
  familiarityScore: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function useSongs() {
  return useQuery({
    queryKey: ['songs'],
    queryFn: async (): Promise<Song[]> => {
      const response = await apiClient.get<Song[]>('/songs')
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data || []
    },
  })
}

export function useSong(id: string) {
  return useQuery({
    queryKey: ['songs', id],
    queryFn: async (): Promise<Song> => {
      const response = await apiClient.get<Song>(`/songs/${id}`)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data!
    },
    enabled: !!id,
  })
}

export function useCreateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (songData: Partial<Song>): Promise<Song> => {
      const response = await apiClient.post<Song>('/songs', songData)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })
}