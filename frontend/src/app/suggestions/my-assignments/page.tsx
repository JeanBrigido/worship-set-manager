'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useMyAssignments, useCreateSuggestion, useDeleteSuggestion } from '@/hooks/use-suggestions'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { ListChecks, Calendar, Clock, Music, Plus, CheckCircle2, XCircle, AlertCircle, Trash2 } from 'lucide-react'

interface Song {
  id: string
  title: string
  artist?: string
  versions: Array<{
    id: string
    name: string
    defaultKey?: string
  }>
}

export default function MyAssignmentsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { data: assignments = [], isLoading } = useMyAssignments()
  const createSuggestion = useCreateSuggestion()
  const deleteSuggestion = useDeleteSuggestion()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<string>('')
  const [selectedSongId, setSelectedSongId] = useState<string>('')
  const [notes, setNotes] = useState('')

  // Fetch songs for suggestion form
  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const response = await apiClient.get<Song[]>('/songs')
      return response.data || []
    },
    enabled: isAddDialogOpen,
  })

  // Redirect if not authenticated
  if (session === null) {
    router.push('/auth/signin')
    return null
  }

  const handleOpenAddDialog = (slotId: string) => {
    setSelectedSlotId(slotId)
    setSelectedSongId('')
    setNotes('')
    setIsAddDialogOpen(true)
  }

  const handleDeleteSuggestion = async (suggestionId: string, songTitle: string) => {
    if (!confirm(`Are you sure you want to remove "${songTitle}" from your suggestions?`)) {
      return
    }

    try {
      await deleteSuggestion.mutateAsync(suggestionId)
      toast({
        title: 'Success',
        description: 'Suggestion removed successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove suggestion',
        variant: 'destructive',
      })
    }
  }

  const handleSubmitSuggestion = async () => {
    if (!selectedSongId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a song',
        variant: 'destructive',
      })
      return
    }

    try {
      await createSuggestion.mutateAsync({
        slotId: selectedSlotId,
        songId: selectedSongId,
        notes: notes || undefined,
      })
      toast({
        title: 'Success',
        description: 'Song suggestion submitted successfully',
      })
      setIsAddDialogOpen(false)
      setSelectedSongId('')
      setNotes('')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit suggestion',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (slot: any) => {
    const now = new Date()
    const dueDate = new Date(slot.dueAt)
    const isOverdue = now > dueDate && slot.status === 'pending'
    const suggestionCount = slot.suggestions?.length || 0

    if (isOverdue) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </Badge>
      )
    }

    if (slot.status === 'submitted') {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Submitted ({suggestionCount})
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
          Pending ({suggestionCount}/{slot.minSongs}-{slot.maxSongs})
        </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader
          title="My Song Suggestions"
          description="View and manage your song suggestion assignments"
          icon={<ListChecks className="h-8 w-8" />}
        />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title="My Song Suggestions"
        description="View and manage your song suggestion assignments"
        icon={<ListChecks className="h-8 w-8" />}
      />

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <ListChecks className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Assignments Yet</h3>
            <p className="text-muted-foreground">
              You haven't been assigned to suggest songs for any upcoming services.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const service = assignment.worshipSet?.service
            const suggestions = assignment.suggestions || []
            const now = new Date()
            const dueDate = new Date(assignment.dueAt)
            const isOverdue = now > dueDate && assignment.status === 'pending'
            const canAddMore = suggestions.length < assignment.maxSongs && !isOverdue

            return (
              <Card key={assignment.id} className={isOverdue ? 'border-destructive' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {service?.serviceType?.name} Service
                      </CardTitle>
                      <CardDescription>
                        {service && new Date(service.serviceDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </CardDescription>
                    </div>
                    {getStatusBadge(assignment)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Due Date:</span>
                      <div className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                        {dueDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Required Songs:</span>
                      <div className="font-medium">
                        {assignment.minSongs} - {assignment.maxSongs} songs
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <div className="font-medium">
                        {suggestions.length} / {assignment.maxSongs} songs
                      </div>
                    </div>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Your Suggestions:</h4>
                      <div className="space-y-2">
                        {suggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                          >
                            <Music className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{suggestion.song.title}</div>
                              {suggestion.song.artist && (
                                <div className="text-sm text-muted-foreground">
                                  by {suggestion.song.artist}
                                </div>
                              )}
                              {suggestion.notes && (
                                <div className="text-sm text-muted-foreground italic mt-1">
                                  "{suggestion.notes}"
                                </div>
                              )}
                            </div>
                            {!isOverdue && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSuggestion(suggestion.id, suggestion.song.title)}
                                disabled={deleteSuggestion.isPending}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {canAddMore && (
                    <Button
                      onClick={() => handleOpenAddDialog(assignment.id)}
                      className="w-full"
                      variant={suggestions.length === 0 ? 'default' : 'outline'}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {suggestions.length === 0 ? 'Add First Suggestion' : 'Add Another Song'}
                    </Button>
                  )}

                  {isOverdue && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>This assignment is overdue. Contact your worship leader if you need assistance.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Suggestion Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Song Suggestion</DialogTitle>
            <DialogDescription>
              Select a song to suggest for the worship set
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="song">Song</Label>
              <Select value={selectedSongId} onValueChange={setSelectedSongId}>
                <SelectTrigger id="song">
                  <SelectValue placeholder="Select a song" />
                </SelectTrigger>
                <SelectContent>
                  {songs.map((song) => (
                    <SelectItem key={song.id} value={song.id}>
                      <div className="flex flex-col items-start">
                        <span>{song.title}</span>
                        {song.artist && (
                          <span className="text-xs text-muted-foreground">by {song.artist}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this suggestion..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmitSuggestion}
                disabled={createSuggestion.isPending}
                className="flex-1"
              >
                {createSuggestion.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Suggestion
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="flex-1"
                disabled={createSuggestion.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
