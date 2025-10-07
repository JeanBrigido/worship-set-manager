import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { LeaderRotation, CreateLeaderRotationInput, UpdateLeaderRotationInput } from '@/types/leader-rotation'

// Query keys
export const leaderRotationKeys = {
  all: ['leader-rotations'] as const,
  lists: () => [...leaderRotationKeys.all, 'list'] as const,
  list: () => [...leaderRotationKeys.lists()] as const,
  details: () => [...leaderRotationKeys.all, 'detail'] as const,
  detail: (id: string) => [...leaderRotationKeys.details(), id] as const,
  byServiceType: (serviceTypeId: string) => [...leaderRotationKeys.all, 'by-service-type', serviceTypeId] as const,
  nextLeader: (serviceTypeId: string) => [...leaderRotationKeys.all, 'next', serviceTypeId] as const,
}

// Fetch all leader rotations
export function useLeaderRotations() {
  return useQuery({
    queryKey: leaderRotationKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: LeaderRotation[] }>('/leader-rotations')
      if (response.error) throw new Error(response.error.message)
      return response.data?.data || []
    },
  })
}

// Fetch leader rotations by service type
export function useLeaderRotationsByServiceType(serviceTypeId: string) {
  return useQuery({
    queryKey: leaderRotationKeys.byServiceType(serviceTypeId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: LeaderRotation[] }>(`/leader-rotations/by-service-type/${serviceTypeId}`)
      if (response.error) throw new Error(response.error.message)
      return response.data?.data || []
    },
    enabled: !!serviceTypeId,
  })
}

// Get next leader in rotation
export function useNextLeader(serviceTypeId: string) {
  return useQuery({
    queryKey: leaderRotationKeys.nextLeader(serviceTypeId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: LeaderRotation }>(`/leader-rotations/next/${serviceTypeId}`)
      if (response.error) throw new Error(response.error.message)
      return response.data?.data
    },
    enabled: !!serviceTypeId,
  })
}

// Create leader rotation
export function useCreateLeaderRotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLeaderRotationInput) => {
      const response = await apiClient.post<{ data: LeaderRotation }>('/leader-rotations', input)
      if (response.error) throw new Error(response.error.message)
      return response.data?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaderRotationKeys.lists() })
    },
  })
}

// Update leader rotation
export function useUpdateLeaderRotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLeaderRotationInput }) => {
      const response = await apiClient.put<{ data: LeaderRotation }>(`/leader-rotations/${id}`, data)
      if (response.error) throw new Error(response.error.message)
      return response.data?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaderRotationKeys.lists() })
    },
  })
}

// Delete leader rotation
export function useDeleteLeaderRotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/leader-rotations/${id}`)
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaderRotationKeys.lists() })
    },
  })
}

// Assign leader to worship set
export function useAssignLeader() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ worshipSetId, leaderUserId }: { worshipSetId: string; leaderUserId: string | null }) => {
      const response = await apiClient.put(`/worship-sets/${worshipSetId}/assign-leader`, { leaderUserId })
      if (response.error) throw new Error(response.error.message)
      return response.data?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worship-sets'] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
  })
}

// Get suggested leader for worship set
export function useSuggestedLeader(worshipSetId: string) {
  return useQuery({
    queryKey: ['worship-sets', worshipSetId, 'suggested-leader'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: LeaderRotation }>(`/worship-sets/${worshipSetId}/suggested-leader`)
      if (response.error) throw new Error(response.error.message)
      return response.data?.data
    },
    enabled: !!worshipSetId,
  })
}
