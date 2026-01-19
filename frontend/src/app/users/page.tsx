'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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

  const fetchUsers = useCallback(async () => {
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
  }, [toast])

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin, fetchUsers])

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
    const inactiveUsers = filtered.filter((u) => !u.isActive)

    // Group by highest privilege role
    const adminUsers = active.filter((u) => u.roles.includes('admin'))
    const leaderUsers = active.filter(
      (u) => !u.roles.includes('admin') && u.roles.includes('leader')
    )
    const musicianUsers = active.filter(
      (u) =>
        !u.roles.includes('admin') &&
        !u.roles.includes('leader') &&
        u.roles.includes('musician')
    )

    return { admins: adminUsers, leaders: leaderUsers, musicians: musicianUsers, inactive: inactiveUsers }
  }, [users, searchTerm])

  const handleRolesChange = async (userId: string, roles: string[]) => {
    const user = users.find((u) => u.id === userId)
    const userName = user?.name || 'User'

    const { error } = await apiClient.request(`/users/${userId}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roles }),
    })

    if (error) {
      throw new Error(error.message)
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roles } : u))
    )

    toast({
      title: 'Roles updated',
      description: `Updated roles for ${userName}`,
    })
  }

  const handleActivate = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    const userName = user?.name || 'User'

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

    toast({
      title: 'User activated',
      description: `Activated ${userName}`,
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

  const handleDelete = async (userId: string) => {
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
