'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Mail, Music, Edit } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RoleBadgeDropdown } from './role-badge-dropdown'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface User {
  id: string
  name: string
  email: string
  roles: string[]
  isActive: boolean
  createdAt: string
}

interface Instrument {
  id: string
  code: string
  displayName: string
}

interface UserSectionProps {
  title: string
  users: User[]
  currentUserId: string
  defaultExpanded?: boolean
  isInactiveSection?: boolean
  onRolesChange: (userId: string, roles: string[]) => Promise<void>
  onActivate: (userId: string) => Promise<void>
  onDeactivate: (userId: string) => Promise<void>
  onDelete: (userId: string, userName: string) => Promise<void>
}

export function UserSection({
  title,
  users,
  currentUserId,
  defaultExpanded = true,
  isInactiveSection = false,
  onRolesChange,
  onActivate,
  onDeactivate,
  onDelete,
}: UserSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const { toast } = useToast()

  // Instruments editing state
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [allInstruments, setAllInstruments] = useState<Instrument[]>([])
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<Set<string>>(new Set())
  const [instrumentsLoading, setInstrumentsLoading] = useState(false)
  const [savingInstruments, setSavingInstruments] = useState(false)

  // Fetch all instruments once on mount
  useEffect(() => {
    const fetchAllInstruments = async () => {
      try {
        const res = await fetch('/api/instruments')
        if (res.ok) {
          const data = await res.json()
          setAllInstruments(data.data || data || [])
        }
      } catch (error) {
        console.error('Error fetching instruments:', error)
      }
    }
    fetchAllInstruments()
  }, [])

  const openEditInstruments = async (user: User) => {
    setEditingUser(user)
    setInstrumentsLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}/instruments`)
      if (res.ok) {
        const data = await res.json()
        const instrumentIds = new Set<string>((data.data || []).map((i: Instrument) => i.id))
        setSelectedInstrumentIds(instrumentIds)
      }
    } catch (error) {
      console.error('Error fetching user instruments:', error)
    } finally {
      setInstrumentsLoading(false)
    }
  }

  const toggleInstrument = (instrumentId: string) => {
    setSelectedInstrumentIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(instrumentId)) {
        newSet.delete(instrumentId)
      } else {
        newSet.add(instrumentId)
      }
      return newSet
    })
  }

  const saveUserInstruments = async () => {
    if (!editingUser) return

    setSavingInstruments(true)
    try {
      const response = await fetch(`/api/users/${editingUser.id}/instruments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrumentIds: Array.from(selectedInstrumentIds) }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to update instruments')
      }

      toast({
        title: 'Success',
        description: `Updated instruments for ${editingUser.name}`,
      })
      setEditingUser(null)
    } catch (error) {
      console.error('Error saving instruments:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update instruments',
        variant: 'destructive',
      })
    } finally {
      setSavingInstruments(false)
    }
  }

  if (users.length === 0) return null

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left py-2 hover:bg-accent/50 rounded-md px-2 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="font-semibold">{title}</span>
        <Badge variant="outline" className="ml-1">
          {users.length}
        </Badge>
      </button>

      {isExpanded && (
        <div className="space-y-2 ml-6">
          {users.map((user) => (
            <Card
              key={user.id}
              className={cn(
                'border-l-4 border-l-primary',
                isInactiveSection && 'opacity-60'
              )}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{user.name}</span>
                      {!user.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <RoleBadgeDropdown
                        userId={user.id}
                        currentRoles={user.roles}
                        isCurrentUser={user.id === currentUserId}
                        onRolesChange={onRolesChange}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditInstruments(user)}
                      title="Edit instruments"
                    >
                      <Music className="h-4 w-4 mr-1" />
                      Instruments
                    </Button>
                    {user.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDeactivate(user.id)}
                        disabled={user.id === currentUserId}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onActivate(user.id)}
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(user.id, user.name)}
                      disabled={user.id === currentUserId}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Instruments Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Instruments - {editingUser?.name}</DialogTitle>
            <DialogDescription>
              Select the instruments this user can play
            </DialogDescription>
          </DialogHeader>
          {instrumentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                {allInstruments.map((instrument) => (
                  <div key={instrument.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`edit-instrument-${instrument.id}`}
                      checked={selectedInstrumentIds.has(instrument.id)}
                      onCheckedChange={() => toggleInstrument(instrument.id)}
                    />
                    <Label
                      htmlFor={`edit-instrument-${instrument.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {instrument.displayName}
                    </Label>
                  </div>
                ))}
              </div>
              {allInstruments.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No instruments configured yet
                </p>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button onClick={saveUserInstruments} disabled={savingInstruments}>
                  {savingInstruments ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    'Save Instruments'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
