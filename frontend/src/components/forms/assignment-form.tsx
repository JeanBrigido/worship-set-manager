'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

const assignmentFormSchema = z.object({
  setId: z.string().min(1, 'Worship set is required'),
  instrumentId: z.string().min(1, 'Instrument is required'),
  userId: z.string().min(1, 'User is required'),
  status: z.enum(['invited', 'accepted', 'declined', 'withdrawn']).optional(),
})

type AssignmentFormData = z.infer<typeof assignmentFormSchema>

interface AssignmentFormProps {
  initialData?: Partial<AssignmentFormData> & { id?: string }
  onSuccess?: () => void
  onCancel?: () => void
}

interface WorshipSet {
  id: string
  name: string
  service: {
    serviceDate: string
    serviceType: {
      name: string
    }
  }
}

interface Instrument {
  id: string
  code: string
  displayName: string
}

interface User {
  id: string
  name: string
  email: string
}

export function AssignmentForm({ initialData, onSuccess, onCancel }: AssignmentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [worshipSets, setWorshipSets] = useState<WorshipSet[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const { toast } = useToast()
  const isEditing = !!initialData?.id

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      setId: initialData?.setId || '',
      instrumentId: initialData?.instrumentId || '',
      userId: initialData?.userId || '',
      status: initialData?.status || 'invited',
    },
  })

  // Fetch data for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true)

        // Fetch worship sets
        const setsResult = await apiClient.get('/worship-sets')
        if (setsResult.error) {
          throw new Error(setsResult.error.message)
        }
        if (setsResult.data) {
          setWorshipSets(setsResult.data)
        }

        // Fetch instruments
        const instrumentsResult = await apiClient.get('/instruments')
        if (instrumentsResult.error) {
          throw new Error(instrumentsResult.error.message)
        }
        if (instrumentsResult.data) {
          setInstruments(instrumentsResult.data)
        }

        // Fetch users
        const usersResult = await apiClient.get('/users')
        if (usersResult.error) {
          throw new Error(usersResult.error.message)
        }
        if (usersResult.data) {
          setUsers(usersResult.data)
        }
      } catch (error) {
        console.error('Error fetching form data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load form data. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [toast])

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      setIsLoading(true)

      const result = isEditing
        ? await apiClient.put(`/assignments/${initialData.id}`, data)
        : await apiClient.post('/assignments', data)

      if (result.error) {
        throw new Error(result.error.message)
      }

      toast({
        title: 'Success',
        description: `Assignment ${isEditing ? 'updated' : 'created'} successfully`,
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error submitting assignment:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} assignment`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Assignment Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading form data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Assignment' : 'Create New Assignment'}
        </CardTitle>
        <CardDescription>
          {isEditing ? 'Update the assignment details below.' : 'Assign a musician to an instrument for a worship set.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="setId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Worship Set *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a worship set" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {worshipSets.map((set) => (
                          <SelectItem key={set.id} value={set.id}>
                            {set.service.serviceType.name} - {new Date(set.service.serviceDate).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the worship set for this assignment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instrumentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instrument *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an instrument" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instruments.map((instrument) => (
                          <SelectItem key={instrument.id} value={instrument.id}>
                            {instrument.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The instrument for this assignment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Musician *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a musician" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The musician to assign to this instrument
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="invited">Invited</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current status of this assignment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? 'Update Assignment' : 'Create Assignment'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}