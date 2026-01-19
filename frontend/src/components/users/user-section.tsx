'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RoleBadgeDropdown } from './role-badge-dropdown'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  roles: string[]
  isActive: boolean
  createdAt: string
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
    </div>
  )
}
