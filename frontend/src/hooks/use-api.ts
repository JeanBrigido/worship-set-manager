import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '@/lib/api-client';

// Types (we'll move these to a shared types file later)
export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  serviceTypeId: string;
  date: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key?: string;
  tempo?: number;
  ccli?: string;
  familiarityScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Query Keys
export const queryKeys = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  services: ['services'] as const,
  service: (id: string) => ['services', id] as const,
  songs: ['songs'] as const,
  song: (id: string) => ['songs', id] as const,
  apiTest: ['api-test'] as const,
} as const;

// ============================================================================
// USERS
// ============================================================================

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/users');
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: async () => {
      const response = await apiClient.get<User>(`/users/${id}`);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const response = await apiClient.post<User>('/users', userData);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await apiClient.put<User>(`/users/${id}`, data);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(variables.id) });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/users/${id}`);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

// ============================================================================
// SERVICES
// ============================================================================

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: async () => {
      const response = await apiClient.get<{ data: Service[] }>('/services');
      if (response.error) {
        throw new Error(response.error.message);
      }
      // Handle both wrapped and unwrapped response formats
      return response.data?.data || response.data || [];
    },
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: queryKeys.service(id),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Service }>(`/services/${id}`);
      if (response.error) {
        throw new Error(response.error.message);
      }
      // Handle both wrapped and unwrapped response formats
      return response.data?.data || response.data;
    },
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      const response = await apiClient.post<Service>('/services', serviceData);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
    },
  });
}

// ============================================================================
// SONGS
// ============================================================================

export function useSongs() {
  return useQuery({
    queryKey: queryKeys.songs,
    queryFn: async () => {
      const response = await apiClient.get<Song[]>('/songs');
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });
}

export function useSong(id: string) {
  return useQuery({
    queryKey: queryKeys.song(id),
    queryFn: async () => {
      const response = await apiClient.get<Song>(`/songs/${id}`);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (songData: Partial<Song>) => {
      const response = await apiClient.post<Song>('/songs', songData);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs });
    },
  });
}

// ============================================================================
// API TEST (for development)
// ============================================================================

export function useApiTest() {
  return useQuery({
    queryKey: queryKeys.apiTest,
    queryFn: async () => {
      const response = await apiClient.get('/songs');
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    retry: 1, // Only retry once for test endpoint
  });
}