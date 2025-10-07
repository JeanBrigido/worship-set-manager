'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useAssignUserToSlot, useCreateSuggestionSlot, SuggestionSlot } from '@/hooks/use-suggestions'
import { UserPlus, Calendar } from 'lucide-react'

interface AssignSuggesterModalProps {
  isOpen: boolean
  onClose: () => void
  worshipSetId: string
  existingSlot?: SuggestionSlot
  users: Array<{
    id: string
    name: string
    email: string
    roles: string[]
  }>
}

export function AssignSuggesterModal({
  isOpen,
  onClose,
  worshipSetId,
  existingSlot,
  users,
}: AssignSuggesterModalProps) {
  const { toast } = useToast()
  const assignUser = useAssignUserToSlot()
  const createSlot = useCreateSuggestionSlot()

  const [formData, setFormData] = useState({
    assignedUserId: existingSlot?.assignedUserId || '',
    minSongs: existingSlot?.minSongs || 1,
    maxSongs: existingSlot?.maxSongs || 3,
    dueAt: existingSlot?.dueAt ? new Date(existingSlot.dueAt).toISOString().split('T')[0] : '',
  })

  const handleSubmit = async () => {
    if (!formData.assignedUserId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a user to assign',
        variant: 'destructive',
      })
      return
    }

    try {
      if (existingSlot) {
        // Update existing slot
        await assignUser.mutateAsync({
          slotId: existingSlot.id,
          assignedUserId: formData.assignedUserId,
        })
        toast({
          title: 'Success',
          description: 'User assigned to suggestion slot',
        })
      } else {
        // Create new slot
        if (!formData.dueAt) {
          toast({
            title: 'Validation Error',
            description: 'Please select a due date',
            variant: 'destructive',
          })
          return
        }

        await createSlot.mutateAsync({
          setId: worshipSetId,
          assignedUserId: formData.assignedUserId,
          minSongs: formData.minSongs,
          maxSongs: formData.maxSongs,
          dueAt: new Date(formData.dueAt).toISOString(),
        })
        toast({
          title: 'Success',
          description: 'Suggestion slot created and user assigned',
        })
      }
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign user',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {existingSlot ? 'Reassign Suggester' : 'Create Suggestion Slot'}
          </DialogTitle>
          <DialogDescription>
            {existingSlot
              ? 'Change the user assigned to this suggestion slot'
              : 'Create a new suggestion slot and assign a user to suggest songs'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user">Assign To</Label>
            <Select
              value={formData.assignedUserId}
              onValueChange={(value) => setFormData({ ...formData, assignedUserId: value })}
            >
              <SelectTrigger id="user">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col items-start">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!existingSlot && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minSongs">Min Songs</Label>
                  <Input
                    id="minSongs"
                    type="number"
                    min="1"
                    value={formData.minSongs}
                    onChange={(e) =>
                      setFormData({ ...formData, minSongs: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSongs">Max Songs</Label>
                  <Input
                    id="maxSongs"
                    type="number"
                    min="1"
                    value={formData.maxSongs}
                    onChange={(e) =>
                      setFormData({ ...formData, maxSongs: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueAt">Due Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="dueAt"
                    type="date"
                    className="pl-10"
                    value={formData.dueAt}
                    onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={assignUser.isPending || createSlot.isPending}
              className="flex-1"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {existingSlot ? 'Reassign User' : 'Create & Assign'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
