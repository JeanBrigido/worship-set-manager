'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { LoadingCard } from '@/components/ui/loading-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Song {
  id: string
  title: string
  artist: string
  key?: string
  tempo?: number
  ccli?: string
  familiarityScore: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

async function fetchSong(id: string): Promise<Song> {
  const response = await fetch(`/api/songs/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch song')
  }
  return response.json()
}

export default function SongDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()

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
        description={`by ${song.artist}`}
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

      <Card>
        <CardHeader>
          <CardTitle>Song Details</CardTitle>
          <CardDescription>
            Information about this worship song
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Title</h3>
                <p className="text-lg font-medium">{song.title}</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Artist</h3>
                <p>{song.artist}</p>
              </div>

              {song.key && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Key</h3>
                  <Badge variant="secondary">{song.key}</Badge>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {song.tempo && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Tempo</h3>
                  <p>{song.tempo} BPM</p>
                </div>
              )}

              {song.ccli && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">CCLI</h3>
                  <p>{song.ccli}</p>
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
            </div>
          </div>

          <div className="pt-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <strong>Created:</strong> {new Date(song.createdAt).toLocaleDateString()}
              </div>
              <div>
                <strong>Updated:</strong> {new Date(song.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}