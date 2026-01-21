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
  const { data: session } = useSession()

  const songId = params.id as string
  const versionId = params.versionId as string

  const [songVersion, setSongVersion] = useState<SongVersionWithSong | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdminOrLeader = session?.user?.roles?.some(
    (r: string) => r === 'admin' || r === 'leader'
  )

  useEffect(() => {
    const fetchSongVersion = async () => {
      try {
        setLoading(true)

        // Fetch song version and song data in parallel
        const [versionResult, songResult] = await Promise.all([
          apiClient.get<SongVersion>(`/song-versions/${versionId}`),
          apiClient.get<Song>(`/songs/${songId}`),
        ])

        if (versionResult.error || !versionResult.data) {
          console.error('Failed to fetch song version:', versionResult.error)
          return
        }

        if (songResult.error || !songResult.data) {
          console.error('Failed to fetch song:', songResult.error)
          return
        }

        // Fetch chord sheet (may not exist)
        const chordSheetResult = await apiClient.get<ChordSheet>(
          `/song-versions/${versionId}/chord-sheet`
        )

        setSongVersion({
          ...versionResult.data,
          song: songResult.data,
          chordSheet: chordSheetResult.data || null,
        })
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSongVersion()
  }, [versionId, songId])

  const handleRefresh = async () => {
    // Refetch chord sheet data
    const chordSheetResult = await apiClient.get<ChordSheet>(
      `/song-versions/${versionId}/chord-sheet`
    )

    if (songVersion) {
      setSongVersion({
        ...songVersion,
        chordSheet: chordSheetResult.data || null,
      })
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!songVersion) {
    return (
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p>Song version not found</p>
      </div>
    )
  }

  if (!isAdminOrLeader) {
    return (
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p>You do not have permission to edit chord sheets</p>
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
            initialData={songVersion.chordSheet}
            onSave={() => handleRefresh()}
            onDelete={() => handleRefresh()}
          />
        </CardContent>
      </Card>
    </div>
  )
}
