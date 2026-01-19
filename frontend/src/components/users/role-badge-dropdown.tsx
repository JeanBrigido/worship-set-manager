'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

interface RoleBadgeDropdownProps {
  userId: string
  currentRoles: string[]
  isCurrentUser: boolean
  onRolesChange: (userId: string, roles: string[]) => Promise<void>
}

const ALL_ROLES = ['admin', 'leader', 'musician'] as const

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'destructive' as const
    case 'leader':
      return 'default' as const
    case 'musician':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

export function RoleBadgeDropdown({
  userId,
  currentRoles,
  isCurrentUser,
  onRolesChange,
}: RoleBadgeDropdownProps) {
  const [roles, setRoles] = useState<string[]>(currentRoles)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const handleRoleToggle = async (role: string) => {
    const hasRole = roles.includes(role)

    // Prevent removing last role
    if (hasRole && roles.length === 1) {
      toast({
        title: 'Cannot remove role',
        description: 'User must have at least one role.',
        variant: 'destructive',
      })
      return
    }

    // Prevent removing own admin role
    if (isCurrentUser && role === 'admin' && hasRole) {
      toast({
        title: 'Cannot remove role',
        description: 'You cannot remove your own admin role.',
        variant: 'destructive',
      })
      return
    }

    const newRoles = hasRole
      ? roles.filter((r) => r !== role)
      : [...roles, role]

    setIsUpdating(true)
    try {
      await onRolesChange(userId, newRoles)
      setRoles(newRoles)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update roles.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isUpdating}>
        <button className="flex gap-1 cursor-pointer">
          {roles.map((role) => (
            <Badge
              key={role}
              variant={getRoleBadgeVariant(role)}
              className="text-xs hover:opacity-80 transition-opacity"
            >
              {role}
            </Badge>
          ))}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {ALL_ROLES.map((role) => (
          <DropdownMenuCheckboxItem
            key={role}
            checked={roles.includes(role)}
            onCheckedChange={() => handleRoleToggle(role)}
            disabled={isUpdating}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
