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
      const response = await apiClient.get<LeaderRotation[]>('/leader-rotations')
      if (response.error) throw new Error(response.error.message)
      return response.data || []
    },
  })
}

// Fetch leader rotations by service type
export function useLeaderRotationsByServiceType(serviceTypeId: string) {
  return useQuery({
    queryKey: leaderRotationKeys.byServiceType(serviceTypeId),
    queryFn: async () => {
      const response = await apiClient.get<LeaderRotation[]>(`/leader-rotations/by-service-type/${serviceTypeId}`)
      if (response.error) throw new Error(response.error.message)
      return response.data || []
    },
    enabled: !!serviceTypeId,
  })
}

// Get next leader in rotation
export function useNextLeader(serviceTypeId: string) {
  return useQuery({
    queryKey: leaderRotationKeys.nextLeader(serviceTypeId),
    queryFn: async () => {
      const response = await apiClient.get<LeaderRotation>(`/leader-rotations/next/${serviceTypeId}`)
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    enabled: !!serviceTypeId,
  })
}

// Create leader rotation
export function useCreateLeaderRotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLeaderRotationInput) => {
      const response = await apiClient.post<LeaderRotation>('/leader-rotations', input)
      if (response.error) throw new Error(response.error.message)
      return response.data
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
      const response = await apiClient.put<LeaderRotation>(`/leader-rotations/${id}`, data)
      if (response.error) throw new Error(response.error.message)
      return response.data
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

// Reorder leader rotations with optimistic updates
export function useReorderLeaderRotations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceTypeId, rotationIds }: { serviceTypeId: string; rotationIds: string[] }) => {
      const response = await apiClient.put<LeaderRotation[]>('/leader-rotations/reorder', { serviceTypeId, rotationIds })
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    onMutate: async ({ rotationIds }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: leaderRotationKeys.lists() })

      // Snapshot the previous value
      const previousRotations = queryClient.getQueryData<LeaderRotation[]>(leaderRotationKeys.list())

      // Optimistically update the cache
      if (previousRotations) {
        const updatedRotations = previousRotations.map(rotation => {
          const newIndex = rotationIds.indexOf(rotation.id)
          if (newIndex !== -1) {
            return { ...rotation, rotationOrder: newIndex + 1 }
          }
          return rotation
        })
        queryClient.setQueryData(leaderRotationKeys.list(), updatedRotations)
      }

      // Return context with the previous value
      return { previousRotations }
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousRotations) {
        queryClient.setQueryData(leaderRotationKeys.list(), context.previousRotations)
      }
    },
    onSettled: () => {
      // Refetch after error or success to ensure cache is in sync
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
      return response.data
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
      const response = await apiClient.get<LeaderRotation>(`/worship-sets/${worshipSetId}/suggested-leader`)
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    enabled: !!worshipSetId,
  })
}
