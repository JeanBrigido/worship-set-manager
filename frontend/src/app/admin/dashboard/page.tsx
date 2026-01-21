'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useLeaderRotations, useCreateLeaderRotation, useDeleteLeaderRotation, useAssignLeader, useReorderLeaderRotations } from '@/hooks/use-leader-rotations'
import { useSuggestionSlotsByWorshipSet } from '@/hooks/use-suggestions'
import { AssignSuggesterModal } from '@/components/worship-set/assign-suggester-modal'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft, Plus, Trash2, UserCheck, Calendar, Users, Settings, ListChecks, Guitar, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ServiceType {
  id: string
  name: string
  defaultStartTime: string
}

interface User {
  id: string
  name: string
  email: string
  roles: string[]
}

interface Service {
  id: string
  serviceDate: string
  serviceType: {
    id: string
    name: string
  }
  worshipSet?: {
    id: string
    leaderUserId: string | null
    leaderUser?: {
      id: string
      name: string
      email: string
    }
  }
}

interface LeaderRotation {
  id: string
  userId: string
  serviceTypeId: string
  rotationOrder: number
  isActive: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

// Sortable row component for drag and drop
function SortableRotationRow({
  rotation,
  onDelete,
  isDeleting
}: {
  rotation: LeaderRotation
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rotation.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {rotation.rotationOrder}
        </div>
      </TableCell>
      <TableCell className="font-medium">{rotation.user.name}</TableCell>
      <TableCell>{rotation.user.email}</TableCell>
      <TableCell>
        <Badge variant={rotation.isActive ? 'default' : 'secondary'}>
          {rotation.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(rotation.id)}
          disabled={isDeleting}
          aria-label={`Remove ${rotation.user.name} from rotation`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [isAddRotationOpen, setIsAddRotationOpen] = useState(false)
  const [isAssignLeaderOpen, setIsAssignLeaderOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [deleteRotationId, setDeleteRotationId] = useState<string | null>(null)
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>('')
  const [isAssignSuggesterOpen, setIsAssignSuggesterOpen] = useState(false)
  const [selectedServiceForSuggestion, setSelectedServiceForSuggestion] = useState<Service | null>(null)

  // Check if user is admin
  const isAdmin = session?.user?.roles?.includes('admin')
  const isLoading = !session

  // Redirect if not admin (use useEffect for proper security)
  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/')
    }
  }, [session, isAdmin, router])

  // Fetch data
  const { data: rotations = [], isLoading: rotationsLoading } = useLeaderRotations()
  const { data: serviceTypes = [] } = useQuery({
    queryKey: ['service-types'],
    queryFn: async () => {
      const response = await apiClient.get<ServiceType[]>('/service-types')
      return response.data || []
    },
  })
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/users')
      return response.data || []
    },
  })
  const { data: upcomingServices = [] } = useQuery<Service[]>({
    queryKey: ['services', 'upcoming'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Service[] }>('/services?limit=10&upcoming=true')
      // Handle both wrapped and unwrapped response formats
      const services = response.data?.data || response.data || []
      return Array.isArray(services) ? services : []
    },
  })

  // Fetch all suggestion slots for upcoming services
  const worshipSetIds = (upcomingServices || [])
    .filter(s => s.worshipSet?.id)
    .map(s => s.worshipSet!.id)

  const { data: allSlots = [] } = useQuery({
    queryKey: ['suggestion-slots', 'upcoming-services', worshipSetIds],
    queryFn: async () => {
      if (worshipSetIds.length === 0) return []

      // Fetch slots for all worship sets in parallel
      const results = await Promise.all(
        worshipSetIds.map(async (setId) => {
          const response = await apiClient.get<any[]>(`/suggestion-slots/set/${setId}`)
          return response.data || []
        })
      )

      // Flatten array of arrays
      return results.flat()
    },
    enabled: worshipSetIds.length > 0,
  })

  // Mutations
  const createRotation = useCreateLeaderRotation()
  const deleteRotation = useDeleteLeaderRotation()
  const assignLeader = useAssignLeader()
  const reorderRotations = useReorderLeaderRotations()

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter users with leader role
  const leaders = users.filter(u => u.roles.includes('leader'))

  // Group rotations by service type
  const rotationsByServiceType = rotations.reduce((acc, rotation) => {
    const typeId = rotation.serviceTypeId
    if (!acc[typeId]) {
      acc[typeId] = []
    }
    acc[typeId].push(rotation)
    return acc
  }, {} as Record<string, typeof rotations>)

  // Add rotation form state
  const [newRotation, setNewRotation] = useState({
    userId: '',
    serviceTypeId: '',
    rotationOrder: 1,
  })

  const handleAddRotation = async () => {
    if (!newRotation.userId || !newRotation.serviceTypeId) {
      toast({
        title: 'Validation Error',
        description: 'Please select both a leader and service type',
        variant: 'destructive',
      })
      return
    }

    try {
      await createRotation.mutateAsync(newRotation)
      toast({
        title: 'Success',
        description: 'Leader added to rotation',
      })
      setIsAddRotationOpen(false)
      setNewRotation({ userId: '', serviceTypeId: '', rotationOrder: 1 })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add rotation',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmDeleteRotation = async () => {
    if (!deleteRotationId) return

    try {
      await deleteRotation.mutateAsync(deleteRotationId)
      toast({
        title: 'Success',
        description: 'Leader removed from rotation',
      })
      setDeleteRotationId(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove rotation',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmAssignLeader = async () => {
    if (!selectedService?.worshipSet?.id || !selectedLeaderId) return

    try {
      await assignLeader.mutateAsync({
        worshipSetId: selectedService.worshipSet.id,
        leaderUserId: selectedLeaderId,
      })
      toast({
        title: 'Success',
        description: 'Leader assigned to worship set',
      })
      setIsAssignLeaderOpen(false)
      setSelectedService(null)
      setSelectedLeaderId('')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign leader',
        variant: 'destructive',
      })
    }
  }

  const handleDragEnd = (event: DragEndEvent, serviceTypeId: string) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const rotationsForType = rotationsByServiceType[serviceTypeId] || []
      const oldIndex = rotationsForType.findIndex((r) => r.id === active.id)
      const newIndex = rotationsForType.findIndex((r) => r.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(rotationsForType, oldIndex, newIndex)
        const rotationIds = newOrder.map((r) => r.id)

        // Fire and forget - don't block on the API call
        reorderRotations.mutate(
          { serviceTypeId, rotationIds },
          {
            onError: () => {
              toast({
                title: 'Error',
                description: 'Failed to reorder rotations. Please refresh the page.',
                variant: 'destructive',
              })
            }
          }
        )
      }
    }
  }

  const openAddRotationForServiceType = (serviceTypeId: string) => {
    setNewRotation({ ...newRotation, serviceTypeId })
    setIsAddRotationOpen(true)
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
        title="Admin Dashboard"
        description="Manage leader rotations, assignments, and suggestions"
        icon={<Settings className="h-8 w-8" />}
      />

      <div className="flex gap-2 flex-wrap">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <Link href="/admin/instruments">
          <Button variant="outline" size="sm">
            <Guitar className="mr-2 h-4 w-4" />
            Manage Instruments
          </Button>
        </Link>
        <Link href="/admin/service-types">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Manage Service Types
          </Button>
        </Link>
      </div>

      {/* Leader Rotation Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leader Rotation Management</CardTitle>
              <CardDescription>
                Configure worship leader rotation schedules for each service type
              </CardDescription>
            </div>
            <Dialog open={isAddRotationOpen} onOpenChange={setIsAddRotationOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Rotation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Leader to Rotation</DialogTitle>
                  <DialogDescription>
                    Select a leader and service type to add to the rotation schedule
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Leader</Label>
                    <Select value={newRotation.userId} onValueChange={(value) => setNewRotation({ ...newRotation, userId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a leader" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaders.map((leader) => (
                          <SelectItem key={leader.id} value={leader.id}>
                            {leader.name} ({leader.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <Select value={newRotation.serviceTypeId} onValueChange={(value) => setNewRotation({ ...newRotation, serviceTypeId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rotation Order</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newRotation.rotationOrder}
                      onChange={(e) => setNewRotation({ ...newRotation, rotationOrder: parseInt(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleAddRotation} className="w-full" disabled={createRotation.isPending}>
                    {createRotation.isPending ? 'Adding...' : 'Add to Rotation'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rotationsLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : serviceTypes.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No service types configured</p>
              <p className="text-sm text-muted-foreground">Contact an administrator to add service types</p>
            </div>
          ) : (
            serviceTypes.map((serviceType) => {
              const rotationsForType = (rotationsByServiceType[serviceType.id] || [])
                .sort((a, b) => a.rotationOrder - b.rotationOrder)

              return (
                <div key={serviceType.id} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-semibold mb-3">{serviceType.name}</h3>
                  <div className="overflow-x-auto">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, serviceType.id)}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[100px]">Order</TableHead>
                            <TableHead className="min-w-[150px]">Leader</TableHead>
                            <TableHead className="min-w-[200px]">Email</TableHead>
                            <TableHead className="min-w-[100px]">Status</TableHead>
                            <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rotationsForType.length > 0 ? (
                            <SortableContext
                              items={rotationsForType.map(r => r.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {rotationsForType.map((rotation) => (
                                <SortableRotationRow
                                  key={rotation.id}
                                  rotation={rotation}
                                  onDelete={setDeleteRotationId}
                                  isDeleting={deleteRotation.isPending}
                                />
                              ))}
                            </SortableContext>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No leaders in rotation for this service type</p>
                                <Button
                                  variant="outline"
                                  className="mt-4"
                                  onClick={() => openAddRotationForServiceType(serviceType.id)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add First Leader
                                </Button>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </DndContext>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Upcoming Services with Leader Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Services</CardTitle>
              <CardDescription>View and manage leader assignments for upcoming services</CardDescription>
            </div>
            {upcomingServices.length > 5 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/services">View all ({upcomingServices.length})</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {upcomingServices.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming services scheduled</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/services">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Service
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Date</TableHead>
                    <TableHead className="min-w-[120px]">Service Type</TableHead>
                    <TableHead className="min-w-[200px]">Assigned Leader</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingServices.slice(0, 5).map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        {new Date(service.serviceDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>{service.serviceType.name}</TableCell>
                      <TableCell>
                        {service.worshipSet?.leaderUser ? (
                          <div>
                            <div className="font-medium">{service.worshipSet.leaderUser.name}</div>
                            <div className="text-sm text-muted-foreground">{service.worshipSet.leaderUser.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.worshipSet?.leaderUserId ? 'default' : 'outline'}>
                          {service.worshipSet?.leaderUserId ? 'Assigned' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedService(service)
                            setIsAssignLeaderOpen(true)
                          }}
                          disabled={!service.worshipSet}
                          aria-label={`${service.worshipSet?.leaderUserId ? 'Reassign' : 'Assign'} leader for ${service.serviceType.name} on ${new Date(service.serviceDate).toLocaleDateString()}`}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          {service.worshipSet?.leaderUserId ? 'Reassign' : 'Assign'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Leader Modal with Confirmation */}
      <Dialog open={isAssignLeaderOpen} onOpenChange={(open) => {
        setIsAssignLeaderOpen(open)
        if (!open) {
          setSelectedLeaderId('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Leader</DialogTitle>
            <DialogDescription>
              Select a leader for {selectedService?.serviceType.name} on{' '}
              {selectedService && new Date(selectedService.serviceDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Leader</Label>
              <Select value={selectedLeaderId} onValueChange={setSelectedLeaderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a leader" />
                </SelectTrigger>
                <SelectContent>
                  {leaders.map((leader) => (
                    <SelectItem key={leader.id} value={leader.id}>
                      {leader.name} ({leader.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedLeaderId && (
              <div className="bg-accent/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-1">Review Assignment</p>
                <p className="text-sm text-muted-foreground">
                  {leaders.find(l => l.id === selectedLeaderId)?.name} will be assigned as the leader for this service.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsAssignLeaderOpen(false)
                  setSelectedLeaderId('')
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmAssignLeader}
                disabled={!selectedLeaderId || assignLeader.isPending}
              >
                {assignLeader.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Song Suggestion Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Song Suggestion Management
              </CardTitle>
              <CardDescription>Assign song suggesters to upcoming services</CardDescription>
            </div>
            {upcomingServices.length > 5 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/services">View all ({upcomingServices.length})</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {upcomingServices.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming services scheduled</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/services">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Service
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Date</TableHead>
                    <TableHead className="min-w-[120px]">Service Type</TableHead>
                    <TableHead className="min-w-[200px]">Suggestion Slots</TableHead>
                    <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingServices.slice(0, 5).map((service) => {
                    // Get suggestion slots for this worship set
                    const slots = service.worshipSet?.id
                      ? allSlots.filter((slot: any) => slot.setId === service.worshipSet?.id)
                      : []

                    return (
                      <TableRow key={service.id}>
                        <TableCell>
                          {new Date(service.serviceDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{service.serviceType.name}</TableCell>
                        <TableCell>
                          {!service.worshipSet ? (
                            <span className="text-muted-foreground text-sm">No worship set</span>
                          ) : slots.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {slots.map((slot: any) => (
                                <Badge key={slot.id} variant="outline" className="text-xs">
                                  {slot.assignedUser?.name || 'Unassigned'}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No slots assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedServiceForSuggestion(service)
                              setIsAssignSuggesterOpen(true)
                            }}
                            disabled={!service.worshipSet}
                            aria-label={`Assign suggester for ${service.serviceType.name} on ${new Date(service.serviceDate).toLocaleDateString()}`}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Assign Suggester
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Suggester Modal */}
      {selectedServiceForSuggestion?.worshipSet && (
        <AssignSuggesterModal
          isOpen={isAssignSuggesterOpen}
          onClose={() => {
            setIsAssignSuggesterOpen(false)
            setSelectedServiceForSuggestion(null)
          }}
          worshipSetId={selectedServiceForSuggestion.worshipSet.id}
          users={users}
        />
      )}

      {/* Delete Rotation Confirmation Dialog */}
      <AlertDialog open={!!deleteRotationId} onOpenChange={(open) => !open && setDeleteRotationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Leader from Rotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this leader from the rotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteRotation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
