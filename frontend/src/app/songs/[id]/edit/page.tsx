'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { SongForm } from '@/components/forms/song-form'
import { PageHeader } from '@/components/layout/page-header'
import { LoadingCard } from '@/components/ui/loading-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface SongVersion {
  id: string
  name: string
  defaultKey?: string
  bpm?: number
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

export default function EditSongPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  const { data: song, isLoading, error } = useQuery({
    queryKey: ['songs', params.id],
    queryFn: () => fetchSong(params.id),
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Loading..." description="Loading song for editing..." />
        <LoadingCard />
      </div>
    )
  }

  if (error || !song) {
    return (
      <div className="space-y-8">
        <PageHeader title="Error" description="Failed to load song for editing" />
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive mb-4">
              {error instanceof Error ? error.message : 'Song not found'}
            </p>
            <Button
              onClick={() => router.push('/songs')}
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
        title="Edit Song"
        description={song.artist ? `Editing "${song.title}" by ${song.artist}` : `Editing "${song.title}"`}
      />

      <SongForm
        songId={params.id}
        initialData={{
          title: song.title,
          artist: song.artist || '',
          key: song.versions[0]?.defaultKey,
          tempo: song.versions[0]?.bpm,
          ccliNumber: song.ccliNumber,
          familiarityScore: song.familiarityScore,
        }}
        onSuccess={() => {
          router.push(`/songs/${params.id}`)
        }}
        onCancel={() => {
          router.push(`/songs/${params.id}`)
        }}
      />
    </div>
  )
}