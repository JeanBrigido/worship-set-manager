'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Music2,
  Mic2,
  Youtube,
  ExternalLink,
  Check,
  Circle,
  FileMusic,
  FilePlus2,
} from 'lucide-react'
import Link from 'next/link'

interface SetSong {
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
    chordSheet?: {
      id: string
    } | null
    song: {
      id: string
      title: string
      artist: string
      defaultYoutubeUrl?: string
    }
  }
}

interface ExpandableSongRowProps {
  setSong: SetSong
  index: number
  totalSongs: number
  canManage: boolean
  listened: boolean
  onEdit: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onListenedChange: (listened: boolean) => void
}

export function ExpandableSongRow({
  setSong,
  index,
  totalSongs,
  canManage,
  listened,
  onEdit,
  onMoveUp,
  onMoveDown,
  onRemove,
  onListenedChange,
}: ExpandableSongRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState(false)
  const { toast } = useToast()

  const displayKey = setSong.keyOverride || setSong.songVersion.defaultKey

  // Resolve YouTube URL (priority: override > version > song default)
  const youtubeUrl = setSong.youtubeUrlOverride
    || setSong.songVersion.youtubeUrl
    || setSong.songVersion.song.defaultYoutubeUrl
    || null

  const handleYoutubeClick = async () => {
    if (!youtubeUrl) return

    // Open YouTube in new tab
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer')

    // Mark as listened
    if (!listened) {
      await handleToggleListened(true)
    }
  }

  const handleToggleListened = async (newValue: boolean) => {
    try {
      setToggling(true)

      if (newValue) {
        const { error } = await apiClient.post(`/set-songs/${setSong.id}/listened`, {})
        if (error) throw new Error(error.message)
      } else {
        const { error } = await apiClient.delete(`/set-songs/${setSong.id}/listened`)
        if (error) throw new Error(error.message)
      }

      onListenedChange(newValue)

      if (newValue) {
        toast({
          title: 'Song marked as listened',
          description: 'Keep up the great practice!',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not update listened status',
        variant: 'destructive',
      })
    } finally {
      setToggling(false)
    }
  }

  return (
    <div
      className={`
        border rounded-lg overflow-hidden transition-all
        ${listened
          ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50'
          : 'bg-muted/30 border-transparent hover:border-border'
        }
      `}
    >
      {/* Collapsed Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Position */}
        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium shrink-0">
          {index + 1}
        </div>

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${listened ? 'text-green-700 dark:text-green-300' : ''}`}>
              {setSong.songVersion.song.title}
            </span>
            {displayKey && (
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                <Music2 className="h-3 w-3 mr-1" />
                {displayKey}
              </Badge>
            )}
            {setSong.singer && (
              <Badge variant="secondary" className="text-xs shrink-0">
                <Mic2 className="h-3 w-3 mr-1" />
                {setSong.singer.name}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            by {setSong.songVersion.song.artist}
          </div>
        </div>

        {/* Listened indicator (always visible) */}
        <div className="flex items-center gap-2">
          {listened ? (
            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center" title="Listened">
              <Check className="h-4 w-4 text-white" />
            </div>
          ) : youtubeUrl ? (
            <div className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600" title="Not listened" />
          ) : null}
        </div>

        {/* Expand button */}
        {(youtubeUrl || canManage) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0 shrink-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50">
          <div className="flex items-center justify-between pt-3">
            {/* YouTube & Listened controls */}
            <div className="flex items-center gap-2">
              {youtubeUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleYoutubeClick}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                >
                  <Youtube className="h-4 w-4 mr-1" />
                  Watch on YouTube
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}

              {setSong.songVersion.chordSheet && (
                <Link href={`/set-songs/${setSong.id}/chords`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 border-purple-200 dark:border-purple-800"
                  >
                    <FileMusic className="h-4 w-4 mr-1" />
                    View Chords
                  </Button>
                </Link>
              )}

              {canManage && (
                <Link href={`/songs/${setSong.songVersion.song.id}/versions/${setSong.songVersion.id}/chord-sheet`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
                  >
                    {setSong.songVersion.chordSheet ? (
                      <>
                        <FileMusic className="h-4 w-4 mr-1" />
                        Edit Chords
                      </>
                    ) : (
                      <>
                        <FilePlus2 className="h-4 w-4 mr-1" />
                        Add Chords
                      </>
                    )}
                  </Button>
                </Link>
              )}

              <Button
                variant={listened ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleToggleListened(!listened)}
                disabled={toggling}
                className={listened ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60' : ''}
              >
                {toggling ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                ) : listened ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Circle className="h-4 w-4 mr-1" />
                )}
                {listened ? 'Listened' : 'Mark as listened'}
              </Button>
            </div>

            {/* Management controls */}
            {canManage && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                  title="Edit singer & key"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMoveUp}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMoveDown}
                  disabled={index === totalSongs - 1}
                  className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
