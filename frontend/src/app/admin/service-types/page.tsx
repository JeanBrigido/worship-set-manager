'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, Calendar, Settings, Clock, PlayCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'

interface ServiceType {
  id: string
  name: string
  defaultStartTime: string
  rrule?: string | null
}

async function fetchServiceTypes(): Promise<ServiceType[]> {
  const { data, error } = await apiClient.get<ServiceType[]>('/service-types')
  if (error) {
    throw new Error(error.message)
  }
  return data || []
}

export default function ServiceTypesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null)
  const [serviceTypeToDelete, setServiceTypeToDelete] = useState<ServiceType | null>(null)
  const [serviceTypeToGenerate, setServiceTypeToGenerate] = useState<ServiceType | null>(null)
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear().toString())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    defaultStartTime: '09:00',
    rrule: '',
  })

  // Check if user is admin
  const isAdmin = session?.user?.roles?.includes('admin')
  const isLoading = !session

  // Redirect if not admin
  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/')
    }
  }, [session, isAdmin, router])

  const { data: serviceTypes = [], isLoading: serviceTypesLoading } = useQuery({
    queryKey: ['service-types'],
    queryFn: fetchServiceTypes,
    enabled: !!session && isAdmin === true,
  })

  const openAddDialog = () => {
    setEditingServiceType(null)
    setForm({
      name: '',
      defaultStartTime: '09:00',
      rrule: '',
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (serviceType: ServiceType) => {
    setEditingServiceType(serviceType)
    setForm({
      name: serviceType.name,
      defaultStartTime: serviceType.defaultStartTime || '09:00',
      rrule: serviceType.rrule || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      })
      return
    }

    if (!form.defaultStartTime) {
      toast({
        title: 'Validation Error',
        description: 'Default start time is required',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: form.name.trim(),
        defaultStartTime: form.defaultStartTime,
        rrule: form.rrule.trim() || null,
      }

      const { error } = editingServiceType
        ? await apiClient.put(`/service-types/${editingServiceType.id}`, payload)
        : await apiClient.post('/service-types', payload)

      if (error) {
        throw new Error(error.message || 'Failed to save service type')
      }

      toast({
        title: 'Success',
        description: editingServiceType ? 'Service type updated successfully' : 'Service type created successfully',
      })

      setIsDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['service-types'] })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save service type',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!serviceTypeToDelete) return

    setIsSubmitting(true)

    try {
      const { error } = await apiClient.delete(`/service-types/${serviceTypeToDelete.id}`)

      if (error) {
        throw new Error(error.message || 'Failed to delete service type')
      }

      toast({
        title: 'Success',
        description: 'Service type deleted successfully',
      })

      setServiceTypeToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['service-types'] })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete service type',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateServices = async () => {
    if (!serviceTypeToGenerate) return

    setIsSubmitting(true)

    try {
      const { data, error } = await apiClient.post<{
        created: number
        skipped: number
        year: number
        message?: string
      }>(`/service-types/${serviceTypeToGenerate.id}/generate-services`, {
        year: parseInt(generateYear)
      })

      if (error) {
        throw new Error(error.message || 'Failed to generate services')
      }

      toast({
        title: 'Services Generated',
        description: data?.message || `Created ${data?.created} services for ${data?.year} (${data?.skipped} already existed)`,
      })

      setServiceTypeToGenerate(null)
      queryClient.invalidateQueries({ queryKey: ['services'] })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate services',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format time for display (e.g., "09:00" -> "9:00 AM")
  const formatTime = (time: string) => {
    if (!time) return '-'
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Show loading state while checking authorization
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not admin (after redirect)
  if (session && !isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Type Management"
        description="Manage service types for scheduling worship services"
        icon={<Calendar className="h-8 w-8" />}
      />

      <div className="flex gap-2">
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Types</CardTitle>
              <CardDescription>
                Configure recurring service types (e.g., Sunday Morning, Wednesday Evening)
              </CardDescription>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {serviceTypesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : serviceTypes.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No service types configured</p>
              <p className="text-sm text-muted-foreground mb-4">Add service types to start scheduling services</p>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Service Type
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead className="min-w-[120px]">Default Time</TableHead>
                    <TableHead className="min-w-[200px]">Recurrence</TableHead>
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceTypes.map((serviceType) => (
                    <TableRow key={serviceType.id}>
                      <TableCell className="font-medium">{serviceType.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatTime(serviceType.defaultStartTime)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {serviceType.rrule || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {serviceType.rrule && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setServiceTypeToGenerate(serviceType)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              title="Generate services for year"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(serviceType)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setServiceTypeToDelete(serviceType)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingServiceType ? 'Edit Service Type' : 'Add Service Type'}
            </DialogTitle>
            <DialogDescription>
              {editingServiceType
                ? 'Update the details for this service type'
                : 'Add a new service type for scheduling'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Sunday Morning Service"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultStartTime">Default Start Time *</Label>
              <Input
                id="defaultStartTime"
                type="time"
                value={form.defaultStartTime}
                onChange={(e) => setForm(prev => ({ ...prev, defaultStartTime: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                The typical start time for this service type
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rrule">Recurrence Rule (Optional)</Label>
              <Input
                id="rrule"
                placeholder="e.g., FREQ=WEEKLY;BYDAY=SU"
                value={form.rrule}
                onChange={(e) => setForm(prev => ({ ...prev, rrule: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                iCal RRULE format for recurring services (advanced)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingServiceType ? 'Update Service Type' : 'Add Service Type')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!serviceTypeToDelete} onOpenChange={(open) => !open && setServiceTypeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{serviceTypeToDelete?.name}&quot;? This will also affect any services scheduled with this type. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Service Type'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Services Dialog */}
      <Dialog open={!!serviceTypeToGenerate} onOpenChange={(open) => !open && setServiceTypeToGenerate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Services</DialogTitle>
            <DialogDescription>
              Generate all &quot;{serviceTypeToGenerate?.name}&quot; services for the selected year based on the recurrence rule: <code className="text-xs bg-muted px-1 py-0.5 rounded">{serviceTypeToGenerate?.rrule}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={generateYear} onValueChange={setGenerateYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() + i
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Services will be generated for the entire year. Existing services will be skipped.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setServiceTypeToGenerate(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateServices} disabled={isSubmitting}>
              {isSubmitting ? 'Generating...' : 'Generate Services'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
