'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Users, Plus, Calendar, Music, UserCheck, UserX, Clock, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface Assignment {
  id: string
  status: 'invited' | 'accepted' | 'declined' | 'withdrawn'
  invitedAt: string
  respondedAt?: string
  user: {
    id: string
    name: string
    email: string
  }
  instrument: {
    id: string
    code: string
    displayName: string
  }
  worshipSet: {
    id: string
    service: {
      serviceDate: string
      serviceType: {
        name: string
      }
    }
  }
}

export default function AssignmentsPage() {
  const { data: session } = useSession()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const isAdmin = session?.user?.roles?.includes('Admin')
  // Note: We don't check for permanent Leader role here anymore
  // Leaders are assigned per worship set via worshipSet.leaderUserId

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const { data, error } = await apiClient.get('/assignments')
      if (error) {
        throw new Error(error.message)
      }
      if (data) {
        setAssignments(data)
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assignments. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateAssignmentStatus = async (assignmentId: string, status: Assignment['status']) => {
    try {
      const { data, error } = await apiClient.put(`/assignments/${assignmentId}`, { status })

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: `Assignment ${status} successfully`,
      })
      fetchAssignments() // Refresh the list
    } catch (error) {
      console.error('Error updating assignment:', error)
      toast({
        title: 'Error',
        description: 'Failed to update assignment status. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) {
      return
    }

    try {
      const { data, error } = await apiClient.delete(`/assignments/${assignmentId}`)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: 'Assignment deleted successfully',
      })
      fetchAssignments() // Refresh the list
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete assignment. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const getStatusIcon = (status: Assignment['status']) => {
    switch (status) {
      case 'accepted':
        return <UserCheck className="h-4 w-4" />
      case 'declined':
        return <UserX className="h-4 w-4" />
      case 'withdrawn':
        return <UserX className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status: Assignment['status']) => {
    switch (status) {
      case 'accepted':
        return 'default' as const
      case 'declined':
        return 'destructive' as const
      case 'withdrawn':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title={isAdmin ? "Team Assignments" : "My Assignments"}
          description={
            isAdmin
              ? "View and manage worship team assignments"
              : "View your upcoming worship service assignments"
          }
        />
        {isAdmin && (
          <Button asChild>
            <Link href="/assignments/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isAdmin ? "Team Assignments" : "My Assignments"}
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Current worship team assignments and their status"
              : "Your upcoming worship service assignments"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
              <p>Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assignments found</p>
              {isAdmin && (
                <p className="text-sm">Create your first assignment to get started</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <Card key={assignment.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {assignment.worshipSet.service.serviceType.name}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            {new Date(assignment.worshipSet.service.serviceDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Music className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{assignment.instrument.displayName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{assignment.user.name}</span>
                          <span className="text-muted-foreground text-sm">
                            ({assignment.user.email})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(assignment.status)}>
                          {getStatusIcon(assignment.status)}
                          <span className="ml-1 capitalize">{assignment.status}</span>
                        </Badge>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Invited: {new Date(assignment.invitedAt).toLocaleDateString()}
                        {assignment.respondedAt && (
                          <>
                            {' • '}
                            Responded: {new Date(assignment.respondedAt).toLocaleDateString()}
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {assignment.status === 'invited' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAssignmentStatus(assignment.id, 'accepted')}
                            >
                              <UserCheck className="mr-1 h-4 w-4" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAssignmentStatus(assignment.id, 'declined')}
                            >
                              <UserX className="mr-1 h-4 w-4" />
                              Decline
                            </Button>
                          </>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAssignment(assignment.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        )}
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