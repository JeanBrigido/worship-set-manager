'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { useToast } from '@/hooks/use-toast'
import { SuggestedSongs } from '@/components/worship-set/suggested-songs'
import { EditSetSongModal } from '@/components/worship-set/edit-set-song-modal'
import { ExpandableSongRow } from '@/components/worship-set/expandable-song-row'
import { useApproveSuggestion, useRejectSuggestion } from '@/hooks/use-suggestions'
import { Calendar, Edit, Users, Music, Settings, ArrowLeft, Trash2, Plus, Search, Crown, ChevronUp, ChevronDown, Eye, Mic2, Music2, Headphones, Check } from 'lucide-react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'

interface SongVersion {
  id: string
  name: string
  defaultKey?: string
  youtubeUrl?: string
  bpm?: number
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
  versions: SongVersion[]
}

interface Service {
  id: string
  serviceDate: string
  status: 'planned' | 'published' | 'cancelled'
  serviceType: {
    id: string
    name: string
    defaultStartTime: string
  }
  leader?: {
    id: string
    name: string
    email: string
  }
  worshipSet?: {
    id: string
    status: 'draft' | 'published'
    leaderUserId?: string
    leaderUser?: {
      id: string
      name: string
      email: string
    }
    setSongs: {
      id: string
      position: number
      isNew?: boolean
      keyOverride?: string | null
      youtubeUrlOverride?: string | null
      singerId?: string | null
      singer?: {
        id: string
        name: string
      } | null
      songVersion: {
        id: string
        name: string
        defaultKey?: string
        youtubeUrl?: string
        song: {
          id: string
          title: string
          artist: string
          defaultYoutubeUrl?: string
        }
      }
    }[]
    assignments: {
      id: string
      user: {
        name: string
        email: string
      }
      instrument: {
        displayName: string
      }
      status: 'pending' | 'accepted' | 'declined'
    }[]
  }
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const serviceId = params.id as string
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddSongsModal, setShowAddSongsModal] = useState(false)
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedSongVersions, setSelectedSongVersions] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingSongs, setLoadingSongs] = useState(false)
  const [addingSongs, setAddingSongs] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [songToRemove, setSongToRemove] = useState<{ id: string; title: string } | null>(null)
  const [removingSong, setRemovingSong] = useState(false)
  const [editingSong, setEditingSong] = useState<Service['worshipSet']['setSongs'][0] | null>(null)
  const [listenedSongIds, setListenedSongIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const approveSuggestion = useApproveSuggestion()
  const rejectSuggestion = useRejectSuggestion()

  // Check if current user is the worship set leader or admin
  const isAdmin = session?.user?.roles?.includes('admin')
  const isWorshipSetLeader = service?.worshipSet?.leaderUserId === session?.user?.id
  const canManageWorshipSet = isAdmin || isWorshipSetLeader

  const fetchService = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await apiClient.get(`/services/${serviceId}`)
      if (error) {
        if (error.code === 'NOT_FOUND') {
          toast({
            title: 'Service Not Found',
            description: 'The requested service could not be found.',
            variant: 'destructive',
          })
          router.push('/services')
        } else {
          throw new Error(error.message)
        }
      } else if (data) {
        setService(data)
      }
    } catch (error) {
      console.error('Error fetching service:', error)
      toast({
        title: 'Error',
        description: 'Failed to load service details. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [serviceId, toast, router])

  const fetchListenedStatus = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      const { data, error } = await apiClient.get(
        `/users/${session.user.id}/song-progress?upcoming=true`
      )
      if (error) throw new Error(error.message)
      if (data) {
        // Find the service in the response and extract listened song IDs
        const serviceData = data.find((sp: any) => sp.service.id === serviceId)
        if (serviceData) {
          const listenedIds = new Set(
            serviceData.songs
              .filter((s: any) => s.listened)
              .map((s: any) => s.setSong.id)
          )
          setListenedSongIds(listenedIds as Set<string>)
        }
      }
    } catch (error) {
      console.error('Error fetching listened status:', error)
    }
  }, [session?.user?.id, serviceId])

  useEffect(() => {
    if (serviceId) {
      fetchService()
    }
  }, [serviceId, fetchService])

  useEffect(() => {
    if (serviceId && session?.user?.id) {
      fetchListenedStatus()
    }
  }, [serviceId, session?.user?.id, fetchListenedStatus])

  const handleConfirmDelete = async () => {
    if (!service) return

    try {
      const { data, error } = await apiClient.delete(`/services/${serviceId}`)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: 'Service deleted successfully.',
      })
      router.push('/services')
    } catch (error) {
      console.error('Error deleting service:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete service. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setShowDeleteConfirm(false)
    }
  }

  const fetchSongs = async () => {
    try {
      setLoadingSongs(true)
      const { data, error } = await apiClient.get('/songs')
      if (error) {
        throw new Error(error.message)
      }
      if (data) {
        setSongs(data)
      }
    } catch (error) {
      console.error('Error fetching songs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load songs. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoadingSongs(false)
    }
  }

  const handleOpenAddSongsModal = () => {
    setShowAddSongsModal(true)
    setSelectedSongVersions({})
    setSearchTerm('')
    fetchSongs()
  }

  const handleToggleSongSelection = (songId: string, versionId?: string) => {
    setSelectedSongVersions(prev => {
      const newSelection = { ...prev }
      if (songId in newSelection) {
        // If already selected and no specific version provided, deselect
        if (!versionId) {
          delete newSelection[songId]
        } else {
          // Update to different version
          newSelection[songId] = versionId
        }
      } else {
        // Select the song with the specified version (or first version as default)
        const song = songs.find(s => s.id === songId)
        newSelection[songId] = versionId || song?.versions[0]?.id || ''
      }
      return newSelection
    })
  }

  const handleVersionChange = (songId: string, versionId: string) => {
    setSelectedSongVersions(prev => ({
      ...prev,
      [songId]: versionId
    }))
  }

  const handleAddSongsToSet = async () => {
    const selectedEntries = Object.entries(selectedSongVersions)
    if (selectedEntries.length === 0) {
      toast({
        title: 'No Songs Selected',
        description: 'Please select at least one song to add.',
        variant: 'destructive',
      })
      return
    }

    try {
      setAddingSongs(true)

      // Create worship set songs for each selected song with its chosen version
      const setSongPromises = selectedEntries.map(async ([songId, versionId], index) => {
        if (!versionId) {
          console.error(`No version selected for song ${songId}`)
          return false
        }

        const { data, error } = await apiClient.post('/set-songs', {
          setId: service?.worshipSet?.id,
          songVersionId: versionId,
          position: (service?.worshipSet?.setSongs?.length || 0) + index + 1,
        })
        return !error
      })

      const results = await Promise.all(setSongPromises)

      if (results.every(success => success)) {
        toast({
          title: 'Success',
          description: `Added ${selectedEntries.length} song(s) to worship set.`,
        })
        setShowAddSongsModal(false)
        setSelectedSongVersions({}) // Clear selection
        setSearchTerm('') // Clear search
        fetchService() // Refresh the service data
      } else {
        throw new Error('Some songs failed to add')
      }
    } catch (error) {
      console.error('Error adding songs:', error)
      toast({
        title: 'Error',
        description: 'Failed to add songs to worship set. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setAddingSongs(false)
    }
  }

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artist?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddSuggestionToSet = async (suggestion: any, versionId: string) => {
    try {
      await approveSuggestion.mutateAsync({
        suggestionId: suggestion.id,
        addToSet: true,
        songVersionId: versionId,
      })
      toast({
        title: 'Success',
        description: 'Song added to worship set',
      })
      fetchService() // Refresh service data
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add song to set',
        variant: 'destructive',
      })
    }
  }

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      await rejectSuggestion.mutateAsync(suggestionId)
      toast({
        title: 'Success',
        description: 'Suggestion rejected',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject suggestion',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveSongFromSet = async () => {
    if (!songToRemove) return

    try {
      setRemovingSong(true)
      const { error } = await apiClient.delete(`/set-songs/${songToRemove.id}`)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: `"${songToRemove.title}" removed from worship set`,
      })
      setSongToRemove(null)
      fetchService() // Refresh the service data
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove song',
        variant: 'destructive',
      })
    } finally {
      setRemovingSong(false)
    }
  }

  const handleMoveSong = async (direction: 'up' | 'down') => {
    if (!service?.worshipSet?.setSongs) return

    const songs = [...service.worshipSet.setSongs].sort((a, b) => a.position - b.position)
    const currentIndex = songs.findIndex(s => s.id === songToRemove?.id)

    // Find the song that will be moved and calculate new position
    // This is handled by getting song IDs in new order

    // Create a simple swap instead
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= songs.length) return

    // Swap the positions
    const newOrder = songs.map(s => s.id)
    ;[newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]]

    try {
      const { error } = await apiClient.put(`/set-songs/set/${service.worshipSet.id}/reorder`, {
        songIds: newOrder
      })

      if (error) {
        throw new Error(error.message)
      }

      fetchService()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reorder songs',
        variant: 'destructive',
      })
    }
  }

  const handleReorderSong = async (songId: string, direction: 'up' | 'down') => {
    if (!service?.worshipSet?.setSongs) return

    const songs = [...service.worshipSet.setSongs].sort((a, b) => a.position - b.position)
    const currentIndex = songs.findIndex(s => s.id === songId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= songs.length) return

    // Create new order by swapping
    const newOrder = songs.map(s => s.id)
    ;[newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]]

    try {
      const { error } = await apiClient.put(`/set-songs/set/${service.worshipSet.id}/reorder`, {
        songIds: newOrder
      })

      if (error) {
        throw new Error(error.message)
      }

      fetchService()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reorder songs',
        variant: 'destructive',
      })
    }
  }

  const getStatusVariant = (status: Service['status']) => {
    switch (status) {
      case 'published':
        return 'default' as const
      case 'cancelled':
        return 'destructive' as const
      default:
        return 'secondary' as const
    }
  }

  const getAssignmentStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default' as const
      case 'declined':
        return 'destructive' as const
      default:
        return 'secondary' as const
    }
  }

  const handleListenedChange = (setSongId: string, listened: boolean) => {
    setListenedSongIds(prev => {
      const next = new Set(prev)
      if (listened) {
        next.add(setSongId)
      } else {
        next.delete(setSongId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid gap-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Service Not Found"
          description="The requested service could not be found."
        />
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Service not found</p>
            <Button asChild className="mt-4">
              <Link href="/services">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Services
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/services">Services</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{service.serviceType.name} - {new Date(service.serviceDate).toLocaleDateString()}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <PageHeader
            title={`${service.serviceType.name} Service`}
            description={`${new Date(service.serviceDate).toLocaleDateString()} at ${service.serviceType.defaultStartTime}`}
          />
          {isWorshipSetLeader && (
            <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
              <Crown className="mr-1 h-3 w-3" />
              You are leading this worship set
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/services">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Services
            </Link>
          </Button>
          {canManageWorshipSet && (
            <div className="flex gap-2">
              <Button asChild>
                <Link href={`/services/${serviceId}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Service
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} aria-label="Delete service">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Service Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={getStatusVariant(service.status)}>
                {service.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Service Type:</span>
              <span className="text-sm">{service.serviceType.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Date:</span>
              <span className="text-sm">{new Date(service.serviceDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Time:</span>
              <span className="text-sm">{service.serviceType.defaultStartTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Leader:</span>
              {service.worshipSet?.leaderUser ? (
                <div className="text-sm flex items-center gap-2">
                  <Crown className="h-3 w-3 text-yellow-500" />
                  {service.worshipSet.leaderUser.name}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Not assigned</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Worship Set */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Worship Set
                </CardTitle>
                {service.worshipSet && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className={service.worshipSet.setSongs.length >= 6 ? "text-destructive font-medium" : ""}>
                      {service.worshipSet.setSongs.length}/6 songs
                    </span>
                    <span>•</span>
                    <span className={service.worshipSet.setSongs.filter((s) => s.isNew).length >= 1 ? "text-destructive font-medium" : ""}>
                      {service.worshipSet.setSongs.filter((s) => s.isNew).length}/1 new
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {service.worshipSet && (
                  <Badge variant="outline">
                    {service.worshipSet.status}
                  </Badge>
                )}
                {canManageWorshipSet && (
                  <Button
                    size="sm"
                    onClick={handleOpenAddSongsModal}
                    disabled={(service.worshipSet?.setSongs?.length ?? 0) >= 6}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Songs
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {service.worshipSet?.setSongs && service.worshipSet.setSongs.length > 0 ? (
              <div className="space-y-3">
                {/* Practice progress indicator */}
                {session?.user?.id && (
                  <div className="flex items-center justify-between text-sm mb-4 p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Headphones className="h-4 w-4" />
                      <span>Practice Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {listenedSongIds.size}/{service.worshipSet.setSongs.length}
                      </span>
                      {listenedSongIds.size === service.worshipSet.setSongs.length && (
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {service.worshipSet.setSongs
                  .sort((a, b) => a.position - b.position)
                  .map((setSong, index, sortedSongs) => (
                    <ExpandableSongRow
                      key={setSong.id}
                      setSong={setSong}
                      index={index}
                      totalSongs={sortedSongs.length}
                      canManage={canManageWorshipSet}
                      listened={listenedSongIds.has(setSong.id)}
                      onEdit={() => setEditingSong(setSong)}
                      onMoveUp={() => handleReorderSong(setSong.id, 'up')}
                      onMoveDown={() => handleReorderSong(setSong.id, 'down')}
                      onRemove={() => setSongToRemove({ id: setSong.id, title: setSong.songVersion.song.title })}
                      onListenedChange={(listened) => handleListenedChange(setSong.id, listened)}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No songs added to worship set</p>
                {canManageWorshipSet ? (
                  <>
                    <p className="text-sm">Add songs to get started</p>
                    <Button className="mt-4" onClick={handleOpenAddSongsModal}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Songs
                    </Button>
                  </>
                ) : (
                  <p className="text-sm">Songs will appear here once added by the worship set leader</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Assignments
            </CardTitle>
            <Button asChild variant={canManageWorshipSet ? "default" : "outline"}>
              <Link href={`/services/${serviceId}/assignments`}>
                {canManageWorshipSet ? (
                  <>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Assignments
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    View Assignments
                  </>
                )}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {service.worshipSet?.assignments && service.worshipSet.assignments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {service.worshipSet.assignments.map((assignment) => (
                <div key={assignment.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{assignment.instrument.displayName}</span>
                    <Badge variant={getAssignmentStatusVariant(assignment.status)} className="text-xs">
                      {assignment.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {assignment.user.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {assignment.user.email}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members assigned</p>
              {canManageWorshipSet ? (
                <>
                  <p className="text-sm">Assign musicians to get started</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href={`/services/${serviceId}/assignments`}>
                      Assign Musicians
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm">Musicians will appear here once assigned</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Songs */}
      {service.worshipSet && (
        <SuggestedSongs
          worshipSetId={service.worshipSet.id}
          onAddToSet={canManageWorshipSet ? handleAddSuggestionToSet : undefined}
          onReject={canManageWorshipSet ? handleRejectSuggestion : undefined}
        />
      )}

      {/* Add Songs Modal */}
      <Dialog open={showAddSongsModal} onOpenChange={setShowAddSongsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Songs to Worship Set</DialogTitle>
            <DialogDescription>
              Select songs to add to your worship set. You can search by title or artist.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search songs by title or artist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Song List */}
            <div className="flex-1 border rounded-lg overflow-y-auto min-h-0">
              {loadingSongs ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading songs...</p>
                </div>
              ) : filteredSongs.length > 0 ? (
                <div className="space-y-2 p-4">
                  {filteredSongs.map((song) => {
                    const isSelected = song.id in selectedSongVersions
                    const selectedVersionId = selectedSongVersions[song.id]
                    const hasMultipleVersions = song.versions.length > 1
                    const selectedVersion = song.versions.find(v => v.id === selectedVersionId) || song.versions[0]

                    return (
                      <div
                        key={song.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-primary/5 border-primary/30'
                            : 'hover:bg-muted/50 border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSongSelection(song.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{song.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {song.artist && `by ${song.artist}`}
                              {song.language && ` • ${song.language}`}
                            </div>
                          </div>
                        </div>

                        {/* Version selector - show when selected OR when song has multiple versions */}
                        {isSelected && song.versions.length > 0 && (
                          <div className="mt-3 ml-7 flex items-center gap-3">
                            {hasMultipleVersions ? (
                              <>
                                <span className="text-sm text-muted-foreground">Version:</span>
                                <Select
                                  value={selectedVersionId}
                                  onValueChange={(value) => handleVersionChange(song.id, value)}
                                >
                                  <SelectTrigger className="w-[200px] h-8">
                                    <SelectValue placeholder="Select version" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {song.versions.map((version) => (
                                      <SelectItem key={version.id} value={version.id}>
                                        <div className="flex items-center gap-2">
                                          <span>{version.name}</span>
                                          {version.defaultKey && (
                                            <span className="text-xs text-muted-foreground">
                                              (Key: {version.defaultKey})
                                            </span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Version: {selectedVersion?.name}
                                {selectedVersion?.defaultKey && ` • Key: ${selectedVersion.defaultKey}`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No songs found</p>
                  {searchTerm && <p className="text-sm">Try adjusting your search terms</p>}
                </div>
              )}
            </div>

            {/* Selected Count */}
            {Object.keys(selectedSongVersions).length > 0 && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-sm font-medium">
                  {Object.keys(selectedSongVersions).length} song(s) selected
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAddSongsModal(false)}
                disabled={addingSongs}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSongsToSet}
                disabled={Object.keys(selectedSongVersions).length === 0 || addingSongs}
              >
                {addingSongs ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding Songs...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add {Object.keys(selectedSongVersions).length > 0 ? `${Object.keys(selectedSongVersions).length} ` : ''}Song{Object.keys(selectedSongVersions).length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be undone and will remove all associated worship sets and assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Song Confirmation Dialog */}
      <AlertDialog open={!!songToRemove} onOpenChange={(open) => !open && setSongToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Song</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{songToRemove?.title}" from the worship set?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingSong}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveSongFromSet}
              disabled={removingSong}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingSong ? 'Removing...' : 'Remove Song'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Set Song Modal */}
      <EditSetSongModal
        open={!!editingSong}
        onOpenChange={(open) => !open && setEditingSong(null)}
        setSong={editingSong}
        onSave={() => {
          fetchService()
          toast({
            title: 'Success',
            description: 'Song updated successfully',
          })
        }}
      />
    </div>
  )
}