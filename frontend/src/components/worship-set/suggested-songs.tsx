'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useSuggestionsByWorshipSet, Suggestion } from '@/hooks/use-suggestions'
import { Music, UserCheck, ThumbsUp, X, Plus } from 'lucide-react'

interface SuggestedSongsProps {
  worshipSetId: string
  onAddToSet?: (suggestion: Suggestion, versionId: string) => void
  onReject?: (suggestionId: string) => void
}

export function SuggestedSongs({ worshipSetId, onAddToSet, onReject }: SuggestedSongsProps) {
  const { toast } = useToast()
  const { data: suggestions = [], isLoading } = useSuggestionsByWorshipSet(worshipSetId)
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string>('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const handleAddClick = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion)
    // Pre-select first version if available
    if (suggestion.song.versions.length > 0) {
      setSelectedVersionId(suggestion.song.versions[0].id)
    }
    setIsAddDialogOpen(true)
  }

  const handleConfirmAdd = () => {
    if (selectedSuggestion && selectedVersionId && onAddToSet) {
      onAddToSet(selectedSuggestion, selectedVersionId)
      setIsAddDialogOpen(false)
      setSelectedSuggestion(null)
      setSelectedVersionId('')
    }
  }

  const handleReject = (suggestionId: string) => {
    if (onReject) {
      onReject(suggestionId)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suggested Songs</CardTitle>
          <CardDescription>Loading suggestions...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suggested Songs</CardTitle>
          <CardDescription>No song suggestions yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Suggested Songs ({suggestions.length})</CardTitle>
          <CardDescription>Review and add songs suggested by your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold">{suggestion.song.title}</h4>
                      {suggestion.song.versions.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {suggestion.song.versions.length} version{suggestion.song.versions.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    {suggestion.song.artist && (
                      <p className="text-sm text-muted-foreground">{suggestion.song.artist}</p>
                    )}
                    {suggestion.suggester && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserCheck className="h-3 w-3" />
                        <span className="text-muted-foreground">
                          Suggested by <span className="font-medium">{suggestion.suggester.name}</span>
                        </span>
                      </div>
                    )}
                    {suggestion.notes && (
                      <p className="text-sm text-muted-foreground italic mt-2">
                        "{suggestion.notes}"
                      </p>
                    )}
                    {suggestion.slotInfo && (
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          Due: {new Date(suggestion.slotInfo.dueAt).toLocaleDateString()}
                        </Badge>
                        <Badge
                          variant={suggestion.slotInfo.status === 'submitted' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {suggestion.slotInfo.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAddClick(suggestion)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add to Set
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(suggestion.id)}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add to Set Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add "{selectedSuggestion?.song.title}" to Worship Set</DialogTitle>
            <DialogDescription>
              Select the version you want to add to the worship set
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSuggestion?.song.versions && selectedSuggestion.song.versions.length > 0 ? (
              <div className="space-y-2">
                <Label>Song Version</Label>
                <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSuggestion.song.versions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        {version.name}
                        {version.defaultKey && ` (${version.defaultKey})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No versions available for this song. Please add a version first.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleConfirmAdd}
                disabled={!selectedVersionId}
                className="flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add to Set
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
