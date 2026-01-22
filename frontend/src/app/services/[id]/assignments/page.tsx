'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Calendar,
  Users,
  Music,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface Instrument {
  id: string
  code: string
  displayName: string
  maxPerSet: number
}

interface UserInstrument {
  id: string
  code: string
  displayName: string
}

interface User {
  id: string
  name: string
  email: string
  roles: string[]
  instruments?: UserInstrument[]
}

interface Assignment {
  id: string
  instrumentId: string
  userId: string
  status: 'invited' | 'accepted' | 'declined'
  user: User
  instrument: Instrument
}

interface Service {
  id: string
  serviceDate: string
  serviceType: {
    name: string
    defaultStartTime: string
  }
  leader?: {
    name: string
  }
  worshipSet?: {
    id: string
    leaderUserId?: string
    assignments: Assignment[]
  }
}

export default function ServiceAssignmentsPage() {
  const params = useParams()
  const { data: session } = useSession()
  const serviceId = params.id as string
  const [service, setService] = useState<Service | null>(null)
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [savingInstrumentId, setSavingInstrumentId] = useState<string | null>(null)
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null)
  const [showOtherMusicians, setShowOtherMusicians] = useState(false)
  const { toast } = useToast()

  // Check if current user can manage assignments
  const isAdmin = session?.user?.roles?.includes('admin')
  const isWorshipSetLeader = service?.worshipSet?.leaderUserId === session?.user?.id
  const canManageAssignments = isAdmin || isWorshipSetLeader

  useEffect(() => {
    fetchData()
  }, [serviceId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [serviceResult, instrumentsResult, usersResult] = await Promise.all([
        apiClient.get(`/services/${serviceId}`),
        apiClient.get('/instruments'),
        // Fetch users with their playable instruments
        apiClient.get('/users?roles=musician,leader&isActive=true&includeInstruments=true')
      ])

      if (serviceResult.error) {
        throw new Error(serviceResult.error.message)
      }
      if (serviceResult.data) {
        const serviceData = serviceResult.data as Service
        setService(serviceData)
        setAssignments(serviceData.worshipSet?.assignments || [])
      }

      if (instrumentsResult.error) {
        throw new Error(instrumentsResult.error.message)
      }
      if (instrumentsResult.data) {
        setInstruments(instrumentsResult.data as Instrument[])
      }

      if (usersResult.error) {
        throw new Error(usersResult.error.message)
      }
      if (usersResult.data) {
        setUsers(usersResult.data as User[])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assignment data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInstrumentSelect = (instrumentId: string) => {
    if (selectedInstrumentId === instrumentId) {
      setSelectedInstrumentId(null)
    } else {
      setSelectedInstrumentId(instrumentId)
      setShowOtherMusicians(false)
    }
  }

  const handleMusicianClick = async (userId: string) => {
    if (!selectedInstrumentId || !canManageAssignments || savingInstrumentId) return

    const currentAssignedUser = getAssignedUser(selectedInstrumentId)
    const newUserId = currentAssignedUser?.id === userId ? '' : userId

    setSavingInstrumentId(selectedInstrumentId)

    try {
      const { error } = await apiClient.put(`/services/${serviceId}/assignments`, {
        assignments: { [selectedInstrumentId]: newUserId }
      })

      if (error) {
        throw new Error(error.message)
      }

      // Update local state immediately for responsiveness
      if (newUserId) {
        const user = users.find(u => u.id === newUserId)
        if (user) {
          setAssignments(prev => {
            const filtered = prev.filter(a => a.instrumentId !== selectedInstrumentId)
            return [...filtered, {
              id: `temp-${Date.now()}`,
              instrumentId: selectedInstrumentId,
              userId: newUserId,
              status: 'invited' as const,
              user: user,
              instrument: instruments.find(i => i.id === selectedInstrumentId)!
            }]
          })
        }
      } else {
        setAssignments(prev => prev.filter(a => a.instrumentId !== selectedInstrumentId))
      }

      toast({
        title: 'Saved',
        description: newUserId ? `Assigned to ${users.find(u => u.id === newUserId)?.name}` : 'Assignment removed',
      })
    } catch (error) {
      console.error('Error saving assignment:', error)
      toast({
        title: 'Error',
        description: 'Failed to save assignment. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSavingInstrumentId(null)
    }
  }

  const getAssignedUser = (instrumentId: string): User | null => {
    const assignment = assignments.find(a => a.instrumentId === instrumentId)
    return assignment?.user || null
  }

  const getMusiciansForInstrument = (instrumentId: string) => {
    const playsInstrument: User[] = []
    const others: User[] = []

    users.forEach(user => {
      const canPlay = user.instruments?.some(i => i.id === instrumentId)
      if (canPlay) {
        playsInstrument.push(user)
      } else {
        others.push(user)
      }
    })

    return { playsInstrument, others }
  }

  const selectedInstrument = instruments.find(i => i.id === selectedInstrumentId)
  const { playsInstrument, others } = selectedInstrumentId
    ? getMusiciansForInstrument(selectedInstrumentId)
    : { playsInstrument: [], others: [] }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
          <p>Loading assignments...</p>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Service not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={`Assignments - ${service.serviceType.name}`}
          description={`${new Date(service.serviceDate).toLocaleDateString()} at ${service.serviceType.defaultStartTime}`}
        />
        <Button variant="outline" asChild>
          <Link href={`/services/${serviceId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Service
          </Link>
        </Button>
      </div>

      {service.leader && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{service.leader.name}</p>
                <p className="text-sm text-muted-foreground">Service Leader</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Instruments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Music className="h-5 w-5" />
              Instruments
            </CardTitle>
            <CardDescription>
              {canManageAssignments
                ? 'Select an instrument to assign a musician'
                : 'View instrument assignments'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {instruments.map((instrument) => {
              const assignedUser = getAssignedUser(instrument.id)
              const isSelected = selectedInstrumentId === instrument.id
              const isSaving = savingInstrumentId === instrument.id

              return (
                <div
                  key={instrument.id}
                  onClick={() => canManageAssignments && handleInstrumentSelect(instrument.id)}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all',
                    canManageAssignments && 'cursor-pointer hover:border-primary/50',
                    isSelected && 'border-primary bg-primary/5',
                    !isSelected && assignedUser && 'border-green-300 bg-green-100',
                    !isSelected && !assignedUser && 'border-muted',
                    isSaving && 'opacity-70'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        assignedUser ? 'bg-green-200 text-green-800' : 'bg-muted text-muted-foreground'
                      )}>
                        <Music className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={cn('font-medium', assignedUser && 'text-green-900')}>{instrument.displayName}</p>
                        {assignedUser ? (
                          <p className="text-sm text-green-800 font-medium">{assignedUser.name}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Unassigned</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : assignedUser ? (
                        <Badge variant="secondary" className="bg-green-600 text-white border-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Assigned
                        </Badge>
                      ) : null}
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Right Panel - Musicians */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Musicians
            </CardTitle>
            <CardDescription>
              {selectedInstrument
                ? `Click to assign to ${selectedInstrument.displayName}`
                : 'Select an instrument to see available musicians'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedInstrumentId ? (
              <div className="text-center py-12 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select an instrument from the left panel</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Musicians who play this instrument */}
                {playsInstrument.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Music className="h-4 w-4" />
                      <span>Plays {selectedInstrument?.displayName} ({playsInstrument.length})</span>
                    </div>
                    <div className="space-y-1">
                      {playsInstrument.map((user) => {
                        const isAssigned = getAssignedUser(selectedInstrumentId)?.id === user.id
                        const isSaving = savingInstrumentId === selectedInstrumentId
                        return (
                          <div
                            key={user.id}
                            onClick={() => handleMusicianClick(user.id)}
                            className={cn(
                              'p-3 rounded-lg border transition-all flex items-center justify-between',
                              canManageAssignments && !isSaving && 'cursor-pointer hover:bg-accent',
                              isAssigned && 'bg-green-50 border-green-200',
                              isSaving && 'opacity-70'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                                isAssigned ? 'bg-green-200 text-green-800' : 'bg-muted text-muted-foreground'
                              )}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{user.name}</p>
                                {user.roles.includes('leader') && (
                                  <Badge variant="outline" className="text-xs mt-0.5">Leader</Badge>
                                )}
                              </div>
                            </div>
                            {isAssigned && (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-600">
                                  <Check className="h-3 w-3 mr-1" />
                                  Assigned
                                </Badge>
                                {canManageAssignments && !isSaving && (
                                  <X className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {playsInstrument.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/30">
                    <p className="text-sm">No musicians have listed {selectedInstrument?.displayName} as an instrument they play</p>
                  </div>
                )}

                {/* Other Musicians (collapsed by default) */}
                {others.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowOtherMusicians(!showOtherMusicians)}
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      {showOtherMusicians ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span>Other Musicians ({others.length})</span>
                    </button>
                    {showOtherMusicians && (
                      <div className="space-y-1 pl-2 border-l-2 border-muted ml-2">
                        {others.map((user) => {
                          const isAssigned = getAssignedUser(selectedInstrumentId)?.id === user.id
                          const isSaving = savingInstrumentId === selectedInstrumentId
                          return (
                            <div
                              key={user.id}
                              onClick={() => handleMusicianClick(user.id)}
                              className={cn(
                                'p-3 rounded-lg border transition-all flex items-center justify-between',
                                canManageAssignments && !isSaving && 'cursor-pointer hover:bg-accent',
                                isAssigned && 'bg-green-50 border-green-200',
                                isSaving && 'opacity-70'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                                  isAssigned ? 'bg-green-200 text-green-800' : 'bg-muted text-muted-foreground'
                                )}>
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{user.name}</p>
                                  {user.roles.includes('leader') && (
                                    <Badge variant="outline" className="text-xs mt-0.5">Leader</Badge>
                                  )}
                                </div>
                              </div>
                              {isAssigned && (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Assigned
                                  </Badge>
                                  {canManageAssignments && !isSaving && (
                                    <X className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm">
                <span className="font-semibold">{instruments.filter(i => getAssignedUser(i.id)).length}</span>
                {' '}Assigned
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span className="text-sm">
                <span className="font-semibold">{instruments.filter(i => !getAssignedUser(i.id)).length}</span>
                {' '}Unassigned
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
