'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChordSheetRenderer } from '@/components/chord-sheet/chord-sheet-renderer'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft, ExternalLink, Music2, FileText } from 'lucide-react'

interface TransposedChordSheet {
  id: string
  chordText: string | null
  originalKey: string | null
  fileUrl: string | null
  fileName: string | null
  externalUrl: string | null
  displayKey: string | null
  songTitle: string
  songArtist: string | null
  versionName: string
}

export default function ChordViewerPage() {
  const params = useParams()
  const router = useRouter()
  const setSongId = params.id as string

  const [chordSheet, setChordSheet] = useState<TransposedChordSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChordSheet = async () => {
      try {
        setLoading(true)
        const { data, error } = await apiClient.get<TransposedChordSheet>(
          `/set-songs/${setSongId}/chord-sheet`
        )

        if (error) {
          setError(error.message)
          return
        }

        setChordSheet(data ?? null)
      } catch (err) {
        setError('Could not load chord sheet')
      } finally {
        setLoading(false)
      }
    }

    fetchChordSheet()
  }, [setSongId])

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !chordSheet) {
    return (
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {error || 'No chord sheet available for this song'}
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{chordSheet.songTitle}</h1>
        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
          {chordSheet.songArtist && <span>{chordSheet.songArtist}</span>}
          {chordSheet.versionName && (
            <>
              <span>-</span>
              <span>{chordSheet.versionName}</span>
            </>
          )}
        </div>
        {chordSheet.displayKey && (
          <Badge variant="outline" className="mt-2">
            <Music2 className="h-3 w-3 mr-1" />
            Key of {chordSheet.displayKey}
          </Badge>
        )}
      </div>

      {/* Text chords */}
      {chordSheet.chordText && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <ChordSheetRenderer
              chordText={chordSheet.chordText}
              className="text-base"
            />
          </CardContent>
        </Card>
      )}

      {/* PDF/Image */}
      {chordSheet.fileUrl && (
        <Card className="mb-6">
          <CardContent className="p-6">
            {chordSheet.fileUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={chordSheet.fileUrl}
                className="w-full h-[80vh] border-0 rounded"
                title="Chord sheet PDF"
              />
            ) : (
              <img
                src={chordSheet.fileUrl}
                alt={`Chord sheet for ${chordSheet.songTitle}`}
                className="max-w-full mx-auto rounded"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* External link */}
      {chordSheet.externalUrl && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              View chord sheet on external site
            </p>
            <Button asChild>
              <a
                href={chordSheet.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Chord Sheet
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
