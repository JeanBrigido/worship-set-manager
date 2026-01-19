'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/page-header'
import { LoadingCard } from '@/components/ui/loading-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit, Trash2, ArrowLeft, Plus, Music } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SongVersion {
  id: string
  name: string
  defaultKey?: string
  bpm?: number
  youtubeUrl?: string
  notes?: string
}

interface Song {
  id: string
  title: string
  artist?: string
  language?: string
  ccliNumber?: string
  defaultYoutubeUrl?: string
  tags: string[]
  familiarityScore: number
  isActive: boolean
  versions: SongVersion[]
  createdAt: string
  updatedAt: string
}

async function fetchSong(id: string): Promise<Song> {
  const response = await fetch(`/api/songs/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch song')
  }
  const result = await response.json()
  return result.data || result
}

export default function SongDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Version dialog state
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false)
  const [editingVersion, setEditingVersion] = useState<SongVersion | null>(null)
  const [versionToDelete, setVersionToDelete] = useState<SongVersion | null>(null)
  const [versionForm, setVersionForm] = useState({
    name: '',
    defaultKey: '',
    bpm: '',
    youtubeUrl: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: song, isLoading, error } = useQuery({
    queryKey: ['songs', params.id],
    queryFn: () => fetchSong(params.id),
  })

  const handleEdit = () => {
    router.push(`/songs/${params.id}/edit`)
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this song? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/songs/${params.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete song')
        }

        toast({
          title: 'Success',
          description: 'Song deleted successfully',
        })

        router.push('/songs')
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete song',
          variant: 'destructive',
        })
      }
    }
  }

  const openAddVersionDialog = () => {
    setEditingVersion(null)
    setVersionForm({
      name: '',
      defaultKey: '',
      bpm: '',
      youtubeUrl: '',
      notes: '',
    })
    setIsVersionDialogOpen(true)
  }

  const openEditVersionDialog = (version: SongVersion) => {
    setEditingVersion(version)
    setVersionForm({
      name: version.name,
      defaultKey: version.defaultKey || '',
      bpm: version.bpm?.toString() || '',
      youtubeUrl: version.youtubeUrl || '',
      notes: version.notes || '',
    })
    setIsVersionDialogOpen(true)
  }

  const handleVersionSubmit = async () => {
    if (!versionForm.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Version name is required',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        songId: params.id,
        name: versionForm.name.trim(),
        defaultKey: versionForm.defaultKey.trim() || undefined,
        bpm: versionForm.bpm ? parseInt(versionForm.bpm) : undefined,
        youtubeUrl: versionForm.youtubeUrl.trim() || undefined,
        notes: versionForm.notes.trim() || undefined,
      }

      const url = editingVersion
        ? `/api/song-versions/${editingVersion.id}`
        : '/api/song-versions'

      const response = await fetch(url, {
        method: editingVersion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save version')
      }

      toast({
        title: 'Success',
        description: editingVersion ? 'Version updated successfully' : 'Version added successfully',
      })

      setIsVersionDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['songs', params.id] })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save version',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteVersion = async () => {
    if (!versionToDelete) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/song-versions/${versionToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete version')
      }

      toast({
        title: 'Success',
        description: 'Version deleted successfully',
      })

      setVersionToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['songs', params.id] })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete version',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Loading..." description="Loading song details..." />
        <LoadingCard />
      </div>
    )
  }

  if (error || !song) {
    return (
      <div className="space-y-8">
        <PageHeader title="Error" description="Failed to load song details" />
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">
              {error instanceof Error ? error.message : 'Song not found'}
            </p>
            <Button
              onClick={() => router.push('/songs')}
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Songs
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={song.title}
        description={song.artist ? `by ${song.artist}` : undefined}
      />

      <div className="flex gap-4">
        <Button onClick={() => router.push('/songs')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Songs
        </Button>

        <Button onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Song
        </Button>

        <Button onClick={handleDelete} variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Song
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Song Details */}
        <Card>
          <CardHeader>
            <CardTitle>Song Details</CardTitle>
            <CardDescription>
              Information about this worship song
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Title</h3>
              <p className="text-lg font-medium">{song.title}</p>
            </div>

            {song.artist && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Artist</h3>
                <p>{song.artist}</p>
              </div>
            )}

            {song.language && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Language</h3>
                <p>{song.language}</p>
              </div>
            )}

            {song.ccliNumber && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">CCLI Number</h3>
                <p>{song.ccliNumber}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Familiarity Score</h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant={song.familiarityScore >= 50 ? "default" : "destructive"}
                >
                  {song.familiarityScore}%
                </Badge>
                {song.familiarityScore < 50 && (
                  <span className="text-sm text-muted-foreground">(New Song)</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t text-sm text-muted-foreground">
              <div><strong>Created:</strong> {new Date(song.createdAt).toLocaleDateString()}</div>
              <div><strong>Updated:</strong> {new Date(song.updatedAt).toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Song Versions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Versions</CardTitle>
                <CardDescription>
                  Different arrangements or recordings
                </CardDescription>
              </div>
              <Button size="sm" onClick={openAddVersionDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Version
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {song.versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No versions added yet</p>
                <p className="text-sm">Add a version to specify key, tempo, and YouTube link</p>
                <Button className="mt-4" variant="outline" onClick={openAddVersionDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Version
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {song.versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-start justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{version.name}</div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-2 mt-1">
                        {version.defaultKey && (
                          <Badge variant="outline">Key: {version.defaultKey}</Badge>
                        )}
                        {version.bpm && (
                          <Badge variant="outline">{version.bpm} BPM</Badge>
                        )}
                      </div>
                      {version.youtubeUrl && (
                        <a
                          href={version.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline mt-1 block"
                        >
                          Watch on YouTube
                        </a>
                      )}
                      {version.notes && (
                        <p className="text-sm text-muted-foreground italic mt-1">
                          {version.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditVersionDialog(version)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVersionToDelete(version)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Version Dialog */}
      <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVersion ? 'Edit Version' : 'Add Version'}
            </DialogTitle>
            <DialogDescription>
              {editingVersion
                ? 'Update the details for this version'
                : 'Add a new version of this song (e.g., different artist, language, or arrangement)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Version Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Original, Spanish Version, Acoustic"
                value={versionForm.name}
                onChange={(e) => setVersionForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultKey">Key</Label>
                <Input
                  id="defaultKey"
                  placeholder="e.g., G, Am, Bb"
                  value={versionForm.defaultKey}
                  onChange={(e) => setVersionForm(prev => ({ ...prev, defaultKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpm">BPM</Label>
                <Input
                  id="bpm"
                  type="number"
                  placeholder="e.g., 120"
                  value={versionForm.bpm}
                  onChange={(e) => setVersionForm(prev => ({ ...prev, bpm: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input
                id="youtubeUrl"
                placeholder="https://youtube.com/watch?v=..."
                value={versionForm.youtubeUrl}
                onChange={(e) => setVersionForm(prev => ({ ...prev, youtubeUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this version..."
                value={versionForm.notes}
                onChange={(e) => setVersionForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsVersionDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleVersionSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingVersion ? 'Update Version' : 'Add Version')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Version Confirmation */}
      <AlertDialog open={!!versionToDelete} onOpenChange={(open) => !open && setVersionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{versionToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Version'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
