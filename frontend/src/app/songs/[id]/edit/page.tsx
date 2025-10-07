'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { SongForm } from '@/components/forms/song-form'
import { PageHeader } from '@/components/layout/page-header'
import { LoadingCard } from '@/components/ui/loading-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

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
        description={`Editing "${song.title}" by ${song.artist}`}
      />

      <SongForm
        songId={params.id}
        initialData={{
          title: song.title,
          artist: song.artist,
          key: song.key,
          tempo: song.tempo,
          ccliNumber: song.ccli,
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