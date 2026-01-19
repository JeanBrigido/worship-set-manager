# User Management Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the admin user management page with grouped organization, quick role changes, and activate/deactivate controls.

**Architecture:** Refactor the existing users page to display users in collapsible role-based sections. Add a RoleBadgeDropdown component for inline role editing. Replace delete-focused workflow with activate/deactivate pattern.

**Tech Stack:** Next.js 14, React, shadcn/ui components, TanStack Query, Tailwind CSS

---

## Task 1: Create RoleBadgeDropdown Component

**Files:**
- Create: `frontend/src/components/users/role-badge-dropdown.tsx`

**Step 1: Create the component file**

```tsx
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
```

**Step 2: Commit**

```bash
git add frontend/src/components/users/role-badge-dropdown.tsx
git commit -m "feat(users): add RoleBadgeDropdown component for inline role editing"
```

---

## Task 2: Create Collapsible User Section Component

**Files:**
- Create: `frontend/src/components/users/user-section.tsx`

**Step 1: Create the component file**

```tsx
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
```

**Step 2: Commit**

```bash
git add frontend/src/components/users/user-section.tsx
git commit -m "feat(users): add collapsible UserSection component"
```

---

## Task 3: Create Component Index File

**Files:**
- Create: `frontend/src/components/users/index.ts`

**Step 1: Create index file**

```ts
export { RoleBadgeDropdown } from './role-badge-dropdown'
export { UserSection } from './user-section'
```

**Step 2: Commit**

```bash
git add frontend/src/components/users/index.ts
git commit -m "feat(users): add component index exports"
```

---

## Task 4: Add Backend Endpoint for Toggling User Active Status

**Files:**
- Modify: `backend/src/controllers/usersController.ts`
- Modify: `backend/src/routes/users.ts`

**Step 1: Add toggleActive controller method**

Add to `backend/src/controllers/usersController.ts` after the `updateUser` function:

```ts
export const toggleUserActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    // Prevent deactivating yourself
    if (req.user?.id === id && !isActive) {
      return res.status(400).json({ error: 'You cannot deactivate yourself' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ data: user });
  } catch (error) {
    console.error('Error toggling user active status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};
```

**Step 2: Add route**

Add to `backend/src/routes/users.ts` after the PUT route:

```ts
router.patch(
  "/:id/active",
  authMiddleware,
  validateUuid("id"),
  requireRole([Role.admin]),
  usersController.toggleUserActive
);
```

**Step 3: Commit**

```bash
git add backend/src/controllers/usersController.ts backend/src/routes/users.ts
git commit -m "feat(api): add endpoint for toggling user active status"
```

---

## Task 5: Add Backend Endpoint for Quick Role Update

**Files:**
- Modify: `backend/src/controllers/usersController.ts`
- Modify: `backend/src/routes/users.ts`

**Step 1: Add updateRoles controller method**

Add to `backend/src/controllers/usersController.ts`:

```ts
export const updateUserRoles = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roles } = req.body;

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'At least one role is required' });
    }

    const validRoles = ['admin', 'leader', 'musician'];
    const invalidRoles = roles.filter((r: string) => !validRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ error: `Invalid roles: ${invalidRoles.join(', ')}` });
    }

    // Prevent removing your own admin role
    if (req.user?.id === id && !roles.includes('admin')) {
      const currentUser = await prisma.user.findUnique({ where: { id } });
      if (currentUser?.roles.includes('admin')) {
        return res.status(400).json({ error: 'You cannot remove your own admin role' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { roles },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ data: user });
  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Failed to update user roles' });
  }
};
```

**Step 2: Add route**

Add to `backend/src/routes/users.ts`:

```ts
router.patch(
  "/:id/roles",
  authMiddleware,
  validateUuid("id"),
  requireRole([Role.admin]),
  usersController.updateUserRoles
);
```

**Step 3: Commit**

```bash
git add backend/src/controllers/usersController.ts backend/src/routes/users.ts
git commit -m "feat(api): add endpoint for quick role updates"
```

---

## Task 6: Refactor Users Page with Grouped Layout

**Files:**
- Modify: `frontend/src/app/users/page.tsx`

**Step 1: Replace the entire users page**

Replace the contents of `frontend/src/app/users/page.tsx` with:

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { UserSection } from '@/components/users'
import { Users, Plus, Search } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  name: string
  email: string
  roles: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function UsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roles: [] as string[],
    password: ''
  })

  const isAdmin = session?.user?.roles?.includes('admin')
  const currentUserId = session?.user?.id

  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/')
    }
  }, [session, isAdmin, router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await apiClient.get('/users')
      if (error) {
        throw new Error(error.message)
      }
      setUsers(data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  // Filter and group users
  const { admins, leaders, musicians, inactive } = useMemo(() => {
    const filtered = searchTerm
      ? users.filter(
          (u) =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : users

    const active = filtered.filter((u) => u.isActive)
    const inactive = filtered.filter((u) => !u.isActive)

    // Group by highest privilege role
    const admins = active.filter((u) => u.roles.includes('admin'))
    const leaders = active.filter(
      (u) => !u.roles.includes('admin') && u.roles.includes('leader')
    )
    const musicians = active.filter(
      (u) =>
        !u.roles.includes('admin') &&
        !u.roles.includes('leader') &&
        u.roles.includes('musician')
    )

    return { admins, leaders, musicians, inactive }
  }, [users, searchTerm])

  const handleRolesChange = async (userId: string, roles: string[]) => {
    const { data, error } = await apiClient.request(`/users/${userId}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roles }),
    })

    if (error) {
      throw new Error(error.message)
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roles } : u))
    )

    const user = users.find((u) => u.id === userId)
    toast({
      title: 'Roles updated',
      description: `Updated roles for ${user?.name}`,
    })
  }

  const handleActivate = async (userId: string) => {
    const { error } = await apiClient.request(`/users/${userId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: true }),
    })

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: true } : u))
    )

    const user = users.find((u) => u.id === userId)
    toast({
      title: 'User activated',
      description: `Activated ${user?.name}`,
    })
  }

  const handleDeactivate = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    setDeactivateUser(user || null)
  }

  const confirmDeactivate = async () => {
    if (!deactivateUser) return

    const { error } = await apiClient.request(`/users/${deactivateUser.id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    })

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      setDeactivateUser(null)
      return
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === deactivateUser.id ? { ...u, isActive: false } : u))
    )

    toast({
      title: 'User deactivated',
      description: `Deactivated ${deactivateUser.name}`,
    })
    setDeactivateUser(null)
  }

  const handleDelete = async (userId: string, userName: string) => {
    const user = users.find((u) => u.id === userId)
    setDeleteUser(user || null)
  }

  const confirmDelete = async () => {
    if (!deleteUser) return

    const { error } = await apiClient.delete(`/users/${deleteUser.id}`)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      setDeleteUser(null)
      return
    }

    setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id))
    toast({
      title: 'User deleted',
      description: `Deleted ${deleteUser.name}`,
    })
    setDeleteUser(null)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password || formData.roles.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      })
      return
    }

    try {
      const { error } = await apiClient.post('/users', formData)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: 'User created successfully.',
      })
      setIsCreateDialogOpen(false)
      setFormData({ name: '', email: '', roles: [], password: '' })
      fetchUsers()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user.',
        variant: 'destructive',
      })
    }
  }

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }))
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Users className="h-12 w-12 animate-pulse opacity-50" />
      </div>
    )
  }

  if (session && !isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage users and their permissions"
      />

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system and assign their roles.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roles *</Label>
                  <div className="flex gap-2">
                    {['admin', 'leader', 'musician'].map((role) => (
                      <Button
                        key={role}
                        type="button"
                        variant={formData.roles.includes(role) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({users.filter((u) => u.isActive).length} active)
          </CardTitle>
          <CardDescription>
            Click role badges to change user roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <UserSection
                title="Admins"
                users={admins}
                currentUserId={currentUserId || ''}
                onRolesChange={handleRolesChange}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
              />
              <UserSection
                title="Leaders"
                users={leaders}
                currentUserId={currentUserId || ''}
                onRolesChange={handleRolesChange}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
              />
              <UserSection
                title="Musicians"
                users={musicians}
                currentUserId={currentUserId || ''}
                onRolesChange={handleRolesChange}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
              />
              <UserSection
                title="Inactive"
                users={inactive}
                currentUserId={currentUserId || ''}
                defaultExpanded={false}
                isInactiveSection={true}
                onRolesChange={handleRolesChange}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={!!deactivateUser} onOpenChange={() => setDeactivateUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to log in. Their history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {deleteUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All user data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/app/users/page.tsx
git commit -m "feat(users): refactor users page with grouped layout and quick actions"
```

---

## Task 7: Update Auth Middleware to Check isActive

**Files:**
- Modify: `backend/src/middleware/authMiddleware.ts`

**Step 1: Add isActive check**

Find the section where user is fetched from database and add isActive check. The user lookup should include:

```ts
// After verifying JWT and finding user, check if active
if (!user.isActive) {
  return res.status(401).json({ error: 'Account is deactivated' });
}
```

**Step 2: Commit**

```bash
git add backend/src/middleware/authMiddleware.ts
git commit -m "feat(auth): reject requests from deactivated users"
```

---

## Task 8: Build and Test

**Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Manual testing checklist**

1. Navigate to /users as admin
2. Verify users grouped by role (Admins, Leaders, Musicians, Inactive)
3. Click a role badge - dropdown appears with checkboxes
4. Toggle a role - changes immediately, toast appears
5. Click Deactivate - confirmation dialog appears
6. Confirm deactivate - user moves to Inactive section
7. Click Activate on inactive user - user moves back to role section
8. Search filters across all sections
9. Cannot remove own admin role
10. Cannot deactivate yourself

**Step 3: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix(users): address issues found during testing"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | RoleBadgeDropdown component |
| 2 | UserSection collapsible component |
| 3 | Component index exports |
| 4 | Backend toggle active endpoint |
| 5 | Backend quick role update endpoint |
| 6 | Refactored users page |
| 7 | Auth middleware isActive check |
| 8 | Build and test |
