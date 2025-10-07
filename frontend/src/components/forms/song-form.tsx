'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorMessage } from '@/components/ui/error-message'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import { Music, Save, X } from 'lucide-react'

// Song form validation schema
const songFormSchema = z.object({
  title: z.string().min(1, 'Song title is required').max(200, 'Title must be less than 200 characters'),
  artist: z.string().min(1, 'Artist is required').max(100, 'Artist name must be less than 100 characters'),
  key: z.string().optional(),
  tempo: z.number().min(40, 'Tempo must be at least 40 BPM').max(200, 'Tempo must be less than 200 BPM').optional().nullable(),
  ccliNumber: z.string().optional(),
  language: z.string().optional(),
  familiarityScore: z.number().min(0, 'Score must be 0 or higher').max(100, 'Score must be 100 or lower').optional(),
})

type SongFormData = z.infer<typeof songFormSchema>

interface SongFormProps {
  songId?: string
  initialData?: Partial<SongFormData>
  onSuccess?: () => void
  onCancel?: () => void
}

export function SongForm({ songId, initialData, onSuccess, onCancel }: SongFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SongFormData>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      artist: initialData?.artist || '',
      key: initialData?.key || '',
      tempo: initialData?.tempo || undefined,
      ccliNumber: initialData?.ccliNumber || '',
      language: initialData?.language || 'English',
      familiarityScore: initialData?.familiarityScore || 50,
    },
  })

  const createSongMutation = useMutation({
    mutationFn: async (data: SongFormData) => {
      const response = await apiClient.post('/songs', data)
      return response.data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      form.reset()
      toast({
        title: 'Song created',
        description: `"${data.title}" has been added to your song library.`,
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create song',
        description: error?.response?.data?.error?.message || 'An error occurred while creating the song.',
        variant: 'destructive',
      })
    },
  })

  const updateSongMutation = useMutation({
    mutationFn: async (data: SongFormData) => {
      const response = await apiClient.put(`/songs/${songId}`, data)
      return response.data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      queryClient.invalidateQueries({ queryKey: ['songs', songId] })
      toast({
        title: 'Song updated',
        description: `"${data.title}" has been updated successfully.`,
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update song',
        description: error?.response?.data?.error?.message || 'An error occurred while updating the song.',
        variant: 'destructive',
      })
    },
  })

  const onSubmit = async (data: SongFormData) => {
    setIsSubmitting(true)
    try {
      if (songId) {
        await updateSongMutation.mutateAsync(data)
      } else {
        await createSongMutation.mutateAsync(data)
      }
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const mutation = songId ? updateSongMutation : createSongMutation
  const isLoading = isSubmitting || mutation.isPending

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          {songId ? 'Edit Song' : 'Add New Song'}
        </CardTitle>
        <CardDescription>
          {songId ? 'Update song information' : 'Add a new song to your worship catalog'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Song Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Amazing Grace" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="artist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Newton" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input placeholder="G" {...field} />
                    </FormControl>
                    <FormDescription>Musical key (e.g., G, Am, C)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tempo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo (BPM)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="120"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Beats per minute</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language *</FormLabel>
                    <FormControl>
                      <Input placeholder="English" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="ccliNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CCLI Number</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormDescription>Copyright license number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="familiarityScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Familiarity Score</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>0 = New song, 100 = Well known (affects song limits)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mutation.isError && (
              <ErrorMessage message={mutation.error?.message || 'Failed to save song'} />
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel || (() => router.back())}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {songId ? 'Update Song' : 'Create Song'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}