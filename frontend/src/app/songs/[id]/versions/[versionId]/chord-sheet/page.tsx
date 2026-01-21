'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChordSheetEditor } from '@/components/chord-sheet/chord-sheet-editor'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft } from 'lucide-react'

interface ChordSheet {
  id: string
  songVersionId: string
  chordText: string | null
  originalKey: string | null
  fileUrl: string | null
  fileName: string | null
  externalUrl: string | null
}

interface SongVersion {
  id: string
  name: string
  songId: string
  defaultKey?: string
  bpm?: number
  youtubeUrl?: string
  notes?: string
}

interface Song {
  id: string
  title: string
  artist: string | null
}

interface SongVersionWithSong extends SongVersion {
  song: Song
  chordSheet?: ChordSheet | null
}

export default function ChordSheetEditPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()

  const songId = params.id as string
  const versionId = params.versionId as string

  const [songVersion, setSongVersion] = useState<SongVersionWithSong | null>(null)
  const [chordSheet, setChordSheet] = useState<ChordSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdminOrLeader = session?.user?.roles?.some(
    (r: string) => r === 'admin' || r === 'leader'
  )

  useEffect(() => {
    // Wait for session to load and check authorization
    if (status === 'loading') return
    if (!isAdminOrLeader) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch song version and song data in parallel
        const [versionResult, songResult] = await Promise.all([
          apiClient.get<SongVersion>(`/song-versions/${versionId}`),
          apiClient.get<Song>(`/songs/${songId}`),
        ])

        if (versionResult.error || !versionResult.data) {
          setError(versionResult.error?.message || 'Song version not found')
          return
        }

        if (songResult.error || !songResult.data) {
          setError(songResult.error?.message || 'Song not found')
          return
        }

        // Fetch chord sheet (may not exist)
        const chordSheetResult = await apiClient.get<ChordSheet>(
          `/song-versions/${versionId}/chord-sheet`
        )

        setSongVersion({
          ...versionResult.data,
          song: songResult.data,
        })
        setChordSheet(chordSheetResult.data || null)
      } catch (err) {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [versionId, songId, status, isAdminOrLeader])

  const handleRefresh = async () => {
    const { data } = await apiClient.get<ChordSheet>(
      `/song-versions/${versionId}/chord-sheet`
    )
    setChordSheet(data || null)
  }

  // Session still loading
  if (status === 'loading') {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Not authorized
  if (!isAdminOrLeader) {
    return (
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You do not have permission to edit chord sheets
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Data loading
  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Error or not found
  if (error || !songVersion) {
    return (
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {error || 'Song version not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Chord Sheet</CardTitle>
          <CardDescription>
            {songVersion.song.title} - {songVersion.name}
            {songVersion.song.artist && ` by ${songVersion.song.artist}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChordSheetEditor
            songVersionId={versionId}
            initialData={chordSheet}
            onSave={handleRefresh}
            onDelete={handleRefresh}
          />
        </CardContent>
      </Card>
    </div>
  )
}
