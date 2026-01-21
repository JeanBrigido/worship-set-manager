'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CardLoading } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Plus, Users, Music, Settings, Eye } from 'lucide-react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'

interface Service {
  id: string
  serviceDate: string
  status: 'planned' | 'published' | 'cancelled'
  serviceType: {
    id: string
    name: string
    defaultStartTime: string
  }
  leader?: {
    id: string
    name: string
  }
  worshipSet?: {
    id: string
    status: 'draft' | 'published'
    leaderUserId?: string
    assignments?: {
      id: string
      user: {
        name: string
      }
      instrument: {
        displayName: string
      }
    }[]
  }
}

export default function ServicesPage() {
  const { data: session } = useSession()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Check if current user is admin or leader (can create services)
  const isAdmin = session?.user?.roles?.includes('admin')
  const isLeader = session?.user?.roles?.includes('leader')
  const canCreateService = isAdmin || isLeader

  // Check if current user can manage a specific service's worship set
  const canManageService = (service: Service) => {
    if (isAdmin) return true
    if (service.worshipSet?.leaderUserId === session?.user?.id) return true
    return false
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<Service[]>('/services?upcoming=true&limit=10')

      if (response.error) {
        throw new Error(response.error.message)
      }

      setServices(response.data || [])
    } catch (error) {
      console.error('Error fetching services:', error)
      toast({
        title: 'Error',
        description: 'Failed to load services. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: Service['status']) => {
    switch (status) {
      case 'published':
        return 'default' as const
      case 'cancelled':
        return 'destructive' as const
      default:
        return 'secondary' as const
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Plan and manage worship services"
      />

      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/services/calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar View
            </Link>
          </Button>
        </div>
{canCreateService && (
          <Button asChild>
            <Link href="/services/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Service
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Services
          </CardTitle>
          <CardDescription>
            Showing up to 10 upcoming services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CardLoading count={3} />
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming services</p>
              <p className="text-sm">Create your first service to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <Card key={service.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-lg">
                            {service.serviceType.name}
                          </span>
                          <Badge variant={getStatusVariant(service.status)}>
                            {service.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-muted-foreground">
                            {new Date(service.serviceDate).toLocaleDateString()} at {service.serviceType.defaultStartTime}
                          </span>
                        </div>
                        {service.leader && (
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Led by {service.leader.name}</span>
                          </div>
                        )}
                        {service.worshipSet && (
                          <div className="flex items-center gap-2">
                            <Music className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {service.worshipSet.assignments?.length || 0} musicians assigned
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {service.worshipSet.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/services/${service.id}/assignments`}>
                            <Users className="mr-1 h-4 w-4" />
                            Assignments
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/services/${service.id}`}>
                            {canManageService(service) ? (
                              <>
                                <Settings className="mr-1 h-4 w-4" />
                                Manage
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 h-4 w-4" />
                                View
                              </>
                            )}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
