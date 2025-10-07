import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface Suggestion {
  id: string
  slotId: string
  songId: string
  youtubeUrlOverride?: string
  notes?: string
  song: {
    id: string
    title: string
    artist?: string
    versions: Array<{
      id: string
      name: string
      defaultKey?: string
      youtubeUrl?: string
    }>
  }
  suggester?: {
    id: string
    name: string
    email: string
  }
  slotInfo?: {
    id: string
    minSongs: number
    maxSongs: number
    dueAt: string
    status: string
  }
}

export interface SuggestionSlot {
  id: string
  setId: string
  assignedUserId: string
  minSongs: number
  maxSongs: number
  dueAt: string
  status: 'pending' | 'submitted' | 'missed'
  assignedUser: {
    id: string
    name: string
    email: string
  }
  suggestions: Suggestion[]
}

// Query keys
export const suggestionKeys = {
  all: ['suggestions'] as const,
  lists: () => [...suggestionKeys.all, 'list'] as const,
  byWorshipSet: (worshipSetId: string) => [...suggestionKeys.all, 'by-worship-set', worshipSetId] as const,
  bySlot: (slotId: string) => [...suggestionKeys.all, 'by-slot', slotId] as const,
}

export const suggestionSlotKeys = {
  all: ['suggestion-slots'] as const,
  byWorshipSet: (worshipSetId: string) => [...suggestionSlotKeys.all, 'by-worship-set', worshipSetId] as const,
}

// Get suggestions by worship set (for worship set builder)
export function useSuggestionsByWorshipSet(worshipSetId: string) {
  return useQuery({
    queryKey: suggestionKeys.byWorshipSet(worshipSetId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Suggestion[] }>(`/suggestions/by-worship-set/${worshipSetId}`)
      if (response.error) throw new Error(response.error.message)
      return response.data?.data || []
    },
    enabled: !!worshipSetId,
  })
}

// Get suggestion slots by worship set
export function useSuggestionSlotsByWorshipSet(worshipSetId: string) {
  return useQuery({
    queryKey: suggestionSlotKeys.byWorshipSet(worshipSetId),
    queryFn: async () => {
      const response = await apiClient.get<SuggestionSlot[]>(`/suggestion-slots/set/${worshipSetId}`)
      if (response.error) throw new Error(response.error.message)
      return response.data || []
    },
    enabled: !!worshipSetId,
  })
}

// Assign user to suggestion slot
export function useAssignUserToSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ slotId, assignedUserId }: { slotId: string; assignedUserId: string }) => {
      const response = await apiClient.put(`/suggestion-slots/${slotId}/assign-user`, { assignedUserId })
      if (response.error) throw new Error(response.error.message)
      return response.data?.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: suggestionSlotKeys.all })
    },
  })
}

// Create suggestion slot
export function useCreateSuggestionSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      setId: string
      assignedUserId: string
      minSongs: number
      maxSongs: number
      dueAt: string
    }) => {
      const response = await apiClient.post('/suggestion-slots', data)
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suggestionSlotKeys.all })
    },
  })
}

// Delete suggestion
export function useDeleteSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await apiClient.delete(`/suggestions/${suggestionId}`)
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suggestionKeys.all })
    },
  })
}

// Get current user's suggestion assignments
export function useMyAssignments() {
  return useQuery({
    queryKey: [...suggestionSlotKeys.all, 'my-assignments'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: SuggestionSlot[] }>('/suggestion-slots/my-assignments')
      if (response.error) throw new Error(response.error.message)
      return response.data?.data || []
    },
  })
}

// Create suggestion
export function useCreateSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      slotId: string
      songId: string
      youtubeUrlOverride?: string
      notes?: string
    }) => {
      const response = await apiClient.post('/suggestions', data)
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suggestionKeys.all })
      queryClient.invalidateQueries({ queryKey: suggestionSlotKeys.all })
    },
  })
}

// Approve suggestion
export function useApproveSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      suggestionId: string
      addToSet: boolean
      songVersionId?: string
      position?: number
    }) => {
      const response = await apiClient.put(`/suggestions/${data.suggestionId}/approve`, {
        addToSet: data.addToSet,
        songVersionId: data.songVersionId,
        position: data.position,
      })
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suggestionKeys.all })
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
  })
}

// Reject suggestion
export function useRejectSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await apiClient.put(`/suggestions/${suggestionId}/reject`, {})
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suggestionKeys.all })
    },
  })
}
