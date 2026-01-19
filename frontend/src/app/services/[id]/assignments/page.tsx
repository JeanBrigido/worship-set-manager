'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Calendar,
  Users,
  Music,
  Guitar,
  Mic,
  CircleUser,
  UserPlus,
  UserMinus,
  Save
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface Instrument {
  id: string
  code: string
  displayName: string
  maxPerSet: number
}

interface User {
  id: string
  name: string
  email: string
  roles: string[]
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
    assignments: Assignment[]
  }
}

const instrumentIcons: Record<string, React.ComponentType<any>> = {
  drums: CircleUser,
  bass: Guitar,
  egtr1: Guitar,
  egtr2: Guitar,
  acoustic: Guitar,
  piano: Music,
  singer1: Mic,
  singer2: Mic,
  singer3: Mic,
  singer4: Mic,
  vocals1: Mic,
  vocals2: Mic,
}

const instrumentColors: Record<string, { bg: string; icon: string; border: string; assignedBg: string; assignedIcon: string; assignedBorder: string }> = {
  drums: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100',
    icon: 'bg-red-100 text-red-600 border-red-200',
    border: 'border-red-200',
    assignedBg: 'bg-gradient-to-br from-red-100 to-red-200',
    assignedIcon: 'bg-red-200 text-red-700 border-red-300',
    assignedBorder: 'border-red-300'
  },
  bass: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
    icon: 'bg-purple-100 text-purple-600 border-purple-200',
    border: 'border-purple-200',
    assignedBg: 'bg-gradient-to-br from-purple-100 to-purple-200',
    assignedIcon: 'bg-purple-200 text-purple-700 border-purple-300',
    assignedBorder: 'border-purple-300'
  },
  egtr1: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    icon: 'bg-blue-100 text-blue-600 border-blue-200',
    border: 'border-blue-200',
    assignedBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
    assignedIcon: 'bg-blue-200 text-blue-700 border-blue-300',
    assignedBorder: 'border-blue-300'
  },
  egtr2: {
    bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
    icon: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    border: 'border-indigo-200',
    assignedBg: 'bg-gradient-to-br from-indigo-100 to-indigo-200',
    assignedIcon: 'bg-indigo-200 text-indigo-700 border-indigo-300',
    assignedBorder: 'border-indigo-300'
  },
  acoustic: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
    icon: 'bg-amber-100 text-amber-600 border-amber-200',
    border: 'border-amber-200',
    assignedBg: 'bg-gradient-to-br from-amber-100 to-amber-200',
    assignedIcon: 'bg-amber-200 text-amber-700 border-amber-300',
    assignedBorder: 'border-amber-300'
  },
  piano: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
    icon: 'bg-slate-100 text-slate-600 border-slate-200',
    border: 'border-slate-200',
    assignedBg: 'bg-gradient-to-br from-slate-100 to-slate-200',
    assignedIcon: 'bg-slate-200 text-slate-700 border-slate-300',
    assignedBorder: 'border-slate-300'
  },
  singer1: {
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100',
    icon: 'bg-pink-100 text-pink-600 border-pink-200',
    border: 'border-pink-200',
    assignedBg: 'bg-gradient-to-br from-pink-100 to-pink-200',
    assignedIcon: 'bg-pink-200 text-pink-700 border-pink-300',
    assignedBorder: 'border-pink-300'
  },
  singer2: {
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100',
    icon: 'bg-rose-100 text-rose-600 border-rose-200',
    border: 'border-rose-200',
    assignedBg: 'bg-gradient-to-br from-rose-100 to-rose-200',
    assignedIcon: 'bg-rose-200 text-rose-700 border-rose-300',
    assignedBorder: 'border-rose-300'
  },
  singer3: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    icon: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    border: 'border-emerald-200',
    assignedBg: 'bg-gradient-to-br from-emerald-100 to-emerald-200',
    assignedIcon: 'bg-emerald-200 text-emerald-700 border-emerald-300',
    assignedBorder: 'border-emerald-300'
  },
  singer4: {
    bg: 'bg-gradient-to-br from-teal-50 to-teal-100',
    icon: 'bg-teal-100 text-teal-600 border-teal-200',
    border: 'border-teal-200',
    assignedBg: 'bg-gradient-to-br from-teal-100 to-teal-200',
    assignedIcon: 'bg-teal-200 text-teal-700 border-teal-300',
    assignedBorder: 'border-teal-300'
  },
  vocals1: {
    bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
    icon: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    border: 'border-cyan-200',
    assignedBg: 'bg-gradient-to-br from-cyan-100 to-cyan-200',
    assignedIcon: 'bg-cyan-200 text-cyan-700 border-cyan-300',
    assignedBorder: 'border-cyan-300'
  },
  vocals2: {
    bg: 'bg-gradient-to-br from-violet-50 to-violet-100',
    icon: 'bg-violet-100 text-violet-600 border-violet-200',
    border: 'border-violet-200',
    assignedBg: 'bg-gradient-to-br from-violet-100 to-violet-200',
    assignedIcon: 'bg-violet-200 text-violet-700 border-violet-300',
    assignedBorder: 'border-violet-300'
  },
}

export default function ServiceAssignmentsPage() {
  const params = useParams()
  const serviceId = params.id as string
  const [service, setService] = useState<Service | null>(null)
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [serviceId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [serviceResult, instrumentsResult, usersResult] = await Promise.all([
        apiClient.get(`/services/${serviceId}`),
        apiClient.get('/instruments'),
        // Use server-side filtering for musicians and leaders
        apiClient.get('/users?roles=musician,leader&isActive=true')
      ])

      if (serviceResult.error) {
        throw new Error(serviceResult.error.message)
      }
      if (serviceResult.data) {
        setService(serviceResult.data)
        setAssignments(serviceResult.data.worshipSet?.assignments || [])
      }

      if (instrumentsResult.error) {
        throw new Error(instrumentsResult.error.message)
      }
      if (instrumentsResult.data) {
        setInstruments(instrumentsResult.data)
      }

      if (usersResult.error) {
        throw new Error(usersResult.error.message)
      }
      if (usersResult.data) {
        setUsers(usersResult.data)
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

  const handleAssignmentChange = (instrumentId: string, userId: string | null) => {
    const actualUserId = userId === '__unassigned__' ? '' : userId
    setPendingChanges(prev => ({
      ...prev,
      [instrumentId]: actualUserId || ''
    }))
  }

  const saveAssignments = async () => {
    try {
      const { data, error } = await apiClient.put(`/services/${serviceId}/assignments`, { assignments: pendingChanges })

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: 'Assignments updated successfully',
      })
      setPendingChanges({})
      fetchData() // Refresh data
    } catch (error) {
      console.error('Error saving assignments:', error)
      toast({
        title: 'Error',
        description: 'Failed to save assignments. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const getAssignedUser = (instrumentId: string): User | null => {
    // Check pending changes first
    if (pendingChanges[instrumentId] !== undefined) {
      const userId = pendingChanges[instrumentId]
      return userId ? users.find(u => u.id === userId) || null : null
    }

    // Otherwise check current assignments
    const assignment = assignments.find(a => a.instrumentId === instrumentId)
    return assignment?.user || null
  }

  const getInstrumentIcon = (instrumentCode: string) => {
    const IconComponent = instrumentIcons[instrumentCode] || Music
    return <IconComponent className="h-8 w-8" />
  }

  const getInstrumentColors = (instrumentCode: string) => {
    return instrumentColors[instrumentCode] || {
      bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
      icon: 'bg-gray-100 text-gray-600 border-gray-200',
      border: 'border-gray-200',
      assignedBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
      assignedIcon: 'bg-gray-200 text-gray-700 border-gray-300',
      assignedBorder: 'border-gray-300'
    }
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0

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
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <PageHeader
          title={`Assignments - ${service.serviceType.name}`}
          description={`${new Date(service.serviceDate).toLocaleDateString()} at ${service.serviceType.defaultStartTime}`}
        />
        {hasPendingChanges && (
          <Button onClick={saveAssignments} className="bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      {service.leader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Service Leader
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{service.leader.name}</p>
                <p className="text-sm text-muted-foreground">Leading this service</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Instrument Assignments
          </CardTitle>
          <CardDescription>
            Assign musicians to instruments for this service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instruments.map((instrument) => {
              const assignedUser = getAssignedUser(instrument.id)
              const isPendingChange = pendingChanges[instrument.id] !== undefined
              const colors = getInstrumentColors(instrument.code)

              return (
                <Card key={instrument.id} className={`relative overflow-hidden transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                  isPendingChange ? 'ring-2 ring-orange-400 shadow-orange-200/50' : ''
                } ${assignedUser ? `${colors.assignedBg} ${colors.assignedBorder}` : `${colors.bg} ${colors.border}`} border-2`}>
                  <CardContent className="p-6 relative">
                    {/* Subtle background pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="w-full h-full bg-gradient-to-br from-white via-transparent to-black" />
                    </div>

                    <div className="relative flex flex-col items-center space-y-4">
                      {/* Instrument Icon and Name */}
                      <div className="flex flex-col items-center space-y-3">
                        <div className={`flex items-center justify-center w-20 h-20 rounded-full border-2 shadow-md transition-all duration-300 ${
                          assignedUser ? colors.assignedIcon : colors.icon
                        }`}>
                          {getInstrumentIcon(instrument.code)}
                        </div>
                        <h3 className="font-semibold text-center text-lg text-gray-800">{instrument.displayName}</h3>
                      </div>

                      {/* Assignment Status */}
                      {assignedUser ? (
                        <div className="text-center space-y-3 w-full">
                          <div className="flex items-center justify-center">
                            <Badge variant="secondary" className="bg-white/80 text-green-800 border border-green-300 px-3 py-1 font-medium">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Assigned
                            </Badge>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm">
                            <p className="text-sm font-semibold text-gray-800">{assignedUser.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{assignedUser.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center w-full">
                          <Badge variant="outline" className="bg-white/80 text-gray-600 border-gray-300 px-3 py-1">
                            <UserMinus className="h-3 w-3 mr-1" />
                            Unassigned
                          </Badge>
                        </div>
                      )}

                      {/* Assignment Control */}
                      <div className="w-full">
                        <Select
                          value={pendingChanges[instrument.id] !== undefined
                            ? (pendingChanges[instrument.id] || '__unassigned__')
                            : (assignedUser?.id || '__unassigned__')
                          }
                          onValueChange={(value) => handleAssignmentChange(instrument.id, value || null)}
                        >
                          <SelectTrigger className="w-full bg-white/90 border-2 border-white/50 backdrop-blur-sm hover:bg-white transition-all duration-200 font-medium">
                            <SelectValue placeholder="Select musician..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">
                              <span className="text-muted-foreground font-medium">Unassigned</span>
                            </SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{user.name}</span>
                                  {user.roles.includes('leader') && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Leader</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Assignment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {instruments.filter(i => getAssignedUser(i.id)).length}
              </p>
              <p className="text-sm text-muted-foreground">Assigned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">
                {instruments.filter(i => !getAssignedUser(i.id)).length}
              </p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </div>

          {hasPendingChanges && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800 text-center">
                You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}