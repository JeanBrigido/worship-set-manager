'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { Calendar, Save, X } from 'lucide-react'

// Service form validation schema
const serviceFormSchema = z.object({
  date: z.string().min(1, 'Service date is required'),
  serviceTypeId: z.string().min(1, 'Service type is required'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

interface ServiceFormProps {
  serviceId?: string
  initialData?: Partial<ServiceFormData>
  onSuccess?: () => void
  onCancel?: () => void
}

interface ServiceType {
  id: string
  name: string
}

export function ServiceForm({ serviceId, initialData, onSuccess, onCancel }: ServiceFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch service types for dropdown
  const { data: serviceTypes, isLoading: serviceTypesLoading } = useQuery<ServiceType[]>({
    queryKey: ['serviceTypes'],
    queryFn: async (): Promise<ServiceType[]> => {
      const response = await apiClient.get('/service-types')
      return response.data as ServiceType[]
    },
  })

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      date: initialData?.date || '',
      serviceTypeId: initialData?.serviceTypeId || '',
      notes: initialData?.notes || '',
    },
  })

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      // Transform camelCase to snake_case for backend
      const payload = {
        date: data.date,
        service_type_id: data.serviceTypeId,
        notes: data.notes || undefined,
      }
      const response = await apiClient.post('/services', payload)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      form.reset()
      // Handle both wrapped and unwrapped response formats
      const service = data?.data || data
      toast({
        title: 'Service created',
        description: `Service scheduled for ${new Date(service.serviceDate).toLocaleDateString()}.`,
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create service',
        description: error?.message || 'An error occurred while creating the service.',
        variant: 'destructive',
      })
    },
  })

  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      // Transform camelCase to snake_case for backend
      const payload = {
        date: data.date,
        service_type_id: data.serviceTypeId,
        notes: data.notes || undefined,
      }
      const response = await apiClient.put(`/services/${serviceId}`, payload)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['services', serviceId] })
      // Handle both wrapped and unwrapped response formats
      const service = data?.data || data
      toast({
        title: 'Service updated',
        description: `Service scheduled for ${new Date(service.serviceDate).toLocaleDateString()} has been updated.`,
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update service',
        description: error?.message || 'An error occurred while updating the service.',
        variant: 'destructive',
      })
    },
  })

  const onSubmit = async (data: ServiceFormData) => {
    setIsSubmitting(true)
    try {
      if (serviceId) {
        await updateServiceMutation.mutateAsync(data)
      } else {
        await createServiceMutation.mutateAsync(data)
      }
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const mutation = serviceId ? updateServiceMutation : createServiceMutation
  const isLoading = isSubmitting || mutation.isPending

  // Format date for input (convert from ISO to YYYY-MM-DDTHH:MM)
  const formatDateForInput = (isoDate: string) => {
    if (!isoDate) return ''
    const date = new Date(isoDate)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {serviceId ? 'Edit Service' : 'Create New Service'}
        </CardTitle>
        <CardDescription>
          {serviceId ? 'Update service information' : 'Schedule a new worship service'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Date & Time *</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={formatDateForInput(field.value)}
                      onChange={(e) => {
                        // Convert to ISO string for backend
                        const date = new Date(e.target.value)
                        field.onChange(date.toISOString())
                      }}
                    />
                  </FormControl>
                  <FormDescription>Select the date and time for this service</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
                      disabled={serviceTypesLoading}
                    >
                      <option value="">Select service type...</option>
                      {serviceTypes?.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>Choose the type of worship service</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md min-h-[100px]"
                      placeholder="Additional notes or special instructions for this service..."
                    />
                  </FormControl>
                  <FormDescription>Optional notes about this service (max 500 characters)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serviceTypesLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <LoadingSpinner className="h-4 w-4" />
                Loading service types...
              </div>
            )}

            {mutation.isError && (
              <ErrorMessage message={mutation.error?.message || 'Failed to save service'} />
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
              <Button type="submit" disabled={isLoading || serviceTypesLoading}>
                {isLoading ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {serviceId ? 'Update Service' : 'Create Service'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}