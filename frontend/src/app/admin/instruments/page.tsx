'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, Guitar, Settings } from 'lucide-react'
import Link from 'next/link'

interface Instrument {
  id: string
  code: string
  displayName: string
  maxPerSet: number
}

async function fetchInstruments(): Promise<Instrument[]> {
  const response = await fetch('/api/instruments')
  if (!response.ok) {
    throw new Error('Failed to fetch instruments')
  }
  const result = await response.json()
  return result.data || result || []
}

export default function InstrumentsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null)
  const [instrumentToDelete, setInstrumentToDelete] = useState<Instrument | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    code: '',
    displayName: '',
    maxPerSet: '1',
  })

  // Check if user is admin
  const isAdmin = session?.user?.roles?.includes('admin')
  const isLoading = !session

  // Redirect if not admin
  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/')
    }
  }, [session, isAdmin, router])

  const { data: instruments = [], isLoading: instrumentsLoading } = useQuery({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    enabled: isAdmin,
  })

  const openAddDialog = () => {
    setEditingInstrument(null)
    setForm({
      code: '',
      displayName: '',
      maxPerSet: '1',
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (instrument: Instrument) => {
    setEditingInstrument(instrument)
    setForm({
      code: instrument.code,
      displayName: instrument.displayName,
      maxPerSet: instrument.maxPerSet.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.displayName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Code and display name are required',
        variant: 'destructive',
      })
      return
    }

    const maxPerSet = parseInt(form.maxPerSet)
    if (isNaN(maxPerSet) || maxPerSet < 1) {
      toast({
        title: 'Validation Error',
        description: 'Max per set must be at least 1',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        code: form.code.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        maxPerSet,
      }

      const url = editingInstrument
        ? `/api/instruments/${editingInstrument.id}`
        : '/api/instruments'

      const response = await fetch(url, {
        method: editingInstrument ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save instrument')
      }

      toast({
        title: 'Success',
        description: editingInstrument ? 'Instrument updated successfully' : 'Instrument created successfully',
      })

      setIsDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['instruments'] })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save instrument',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!instrumentToDelete) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/instruments/${instrumentToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete instrument')
      }

      toast({
        title: 'Success',
        description: 'Instrument deleted successfully',
      })

      setInstrumentToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['instruments'] })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete instrument',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
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
        title="Instrument Management"
        description="Manage available instruments for worship set assignments"
        icon={<Guitar className="h-8 w-8" />}
      />

      <div className="flex gap-2">
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Instruments</CardTitle>
              <CardDescription>
                Configure instruments that can be assigned to musicians in worship sets
              </CardDescription>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Instrument
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {instrumentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : instruments.length === 0 ? (
            <div className="text-center py-12">
              <Guitar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No instruments configured</p>
              <p className="text-sm text-muted-foreground mb-4">Add instruments to enable musician assignments</p>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Instrument
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Code</TableHead>
                    <TableHead className="min-w-[200px]">Display Name</TableHead>
                    <TableHead className="min-w-[100px]">Max Per Set</TableHead>
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instruments.map((instrument) => (
                    <TableRow key={instrument.id}>
                      <TableCell className="font-mono text-sm">{instrument.code}</TableCell>
                      <TableCell className="font-medium">{instrument.displayName}</TableCell>
                      <TableCell>{instrument.maxPerSet}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(instrument)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInstrumentToDelete(instrument)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstrument ? 'Edit Instrument' : 'Add Instrument'}
            </DialogTitle>
            <DialogDescription>
              {editingInstrument
                ? 'Update the details for this instrument'
                : 'Add a new instrument for worship set assignments'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="e.g., guitar, keys, drums"
                value={form.code}
                onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))}
                disabled={!!editingInstrument}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, no spaces). Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                placeholder="e.g., Electric Guitar, Keyboard, Drums"
                value={form.displayName}
                onChange={(e) => setForm(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPerSet">Max Per Set</Label>
              <Input
                id="maxPerSet"
                type="number"
                min="1"
                value={form.maxPerSet}
                onChange={(e) => setForm(prev => ({ ...prev, maxPerSet: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of this instrument allowed per worship set
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingInstrument ? 'Update Instrument' : 'Add Instrument')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!instrumentToDelete} onOpenChange={(open) => !open && setInstrumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instrument</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{instrumentToDelete?.displayName}"? This will also remove all assignments using this instrument. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Instrument'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
