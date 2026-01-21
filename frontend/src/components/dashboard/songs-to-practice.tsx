'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import {
  Music2,
  Youtube,
  Check,
  Circle,
  Calendar,
  ExternalLink,
  Headphones,
  ChevronRight,
} from 'lucide-react'

interface SongProgress {
  setSong: {
    id: string
    position: number
    keyOverride?: string
  }
  songVersion: {
    id: string
    name: string
    youtubeUrl?: string
  }
  song: {
    id: string
    title: string
    artist?: string
    defaultYoutubeUrl?: string
  }
  singer?: {
    id: string
    name: string
  }
  youtubeUrl: string | null
  listened: boolean
  listenedAt?: string
}

interface ServiceProgress {
  service: {
    id: string
    serviceDate: string
    serviceType: {
      id: string
      name: string
      defaultStartTime: string
    }
  }
  songs: SongProgress[]
}

function formatServiceDate(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function SongsToPractice() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [serviceProgress, setServiceProgress] = useState<ServiceProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const userId = session?.user?.id

  useEffect(() => {
    if (userId) {
      fetchSongProgress()
    }
  }, [userId])

  const fetchSongProgress = async () => {
    if (!userId) return
    try {
      setLoading(true)
      const { data, error } = await apiClient.get<ServiceProgress[]>(
        `/users/${userId}/song-progress?upcoming=true`
      )
      if (error) throw new Error(error.message)
      setServiceProgress(data || [])
    } catch (error) {
      console.error('Error fetching song progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleYoutubeClick = async (setSongId: string, youtubeUrl: string) => {
    // Open YouTube in new tab
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer')

    // Mark as listened
    await markAsListened(setSongId)
  }

  const markAsListened = async (setSongId: string) => {
    try {
      setTogglingIds(prev => new Set(prev).add(setSongId))

      const { error } = await apiClient.post(`/set-songs/${setSongId}/listened`, {})
      if (error) throw new Error(error.message)

      // Update local state
      setServiceProgress(prev => prev.map(sp => ({
        ...sp,
        songs: sp.songs.map(s =>
          s.setSong.id === setSongId
            ? { ...s, listened: true, listenedAt: new Date().toISOString() }
            : s
        )
      })))

      toast({
        title: 'Song marked as listened',
        description: 'Keep up the great practice!',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not update listened status',
        variant: 'destructive',
      })
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(setSongId)
        return next
      })
    }
  }

  const unmarkAsListened = async (setSongId: string) => {
    try {
      setTogglingIds(prev => new Set(prev).add(setSongId))

      const { error } = await apiClient.delete(`/set-songs/${setSongId}/listened`)
      if (error) throw new Error(error.message)

      // Update local state
      setServiceProgress(prev => prev.map(sp => ({
        ...sp,
        songs: sp.songs.map(s =>
          s.setSong.id === setSongId
            ? { ...s, listened: false, listenedAt: undefined }
            : s
        )
      })))
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not update listened status',
        variant: 'destructive',
      })
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(setSongId)
        return next
      })
    }
  }

  const toggleListened = async (setSongId: string, currentlyListened: boolean) => {
    if (currentlyListened) {
      await unmarkAsListened(setSongId)
    } else {
      await markAsListened(setSongId)
    }
  }

  // Filter to only show services with songs that have YouTube URLs
  const servicesWithSongs = serviceProgress.filter(sp => sp.songs.length > 0)

  if (loading) {
    return (
      <Card className="border-purple-200 dark:border-purple-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <div className="space-y-2">
                  {[1, 2, 3].map(j => (
                    <Skeleton key={j} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (servicesWithSongs.length === 0) {
    return null // Don't show anything if no songs to practice
  }

  // Calculate total progress
  const totalSongs = servicesWithSongs.reduce((sum, sp) => sum + sp.songs.length, 0)
  const listenedSongs = servicesWithSongs.reduce(
    (sum, sp) => sum + sp.songs.filter(s => s.listened).length,
    0
  )
  const progressPercent = totalSongs > 0 ? Math.round((listenedSongs / totalSongs) * 100) : 0

  return (
    <Card className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-violet-50/50 dark:from-purple-950/20 dark:to-violet-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Headphones className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              Songs to Practice
            </CardTitle>
            <CardDescription className="mt-1">
              Listen to prepare for your upcoming services
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {listenedSongs}/{totalSongs}
            </div>
            <div className="text-xs text-muted-foreground">songs listened</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-purple-100 dark:bg-purple-900/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {servicesWithSongs.map((sp) => {
          const serviceListened = sp.songs.filter(s => s.listened).length
          const serviceTotal = sp.songs.length

          return (
            <div key={sp.service.id} className="space-y-3">
              {/* Service header */}
              <div className="flex items-center justify-between">
                <Link
                  href={`/services/${sp.service.id}`}
                  className="flex items-center gap-2 text-sm font-medium hover:text-purple-600 transition-colors group"
                >
                  <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-purple-600" />
                  <span>{sp.service.serviceType.name}</span>
                  <span className="text-muted-foreground">
                    {formatServiceDate(sp.service.serviceDate)}
                  </span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Badge
                  variant={serviceListened === serviceTotal ? 'default' : 'secondary'}
                  className={serviceListened === serviceTotal ? 'bg-green-600' : ''}
                >
                  {serviceListened}/{serviceTotal}
                </Badge>
              </div>

              {/* Songs list */}
              <div className="space-y-2">
                {sp.songs.map((song) => {
                  const isToggling = togglingIds.has(song.setSong.id)
                  const key = song.setSong.keyOverride || song.songVersion.name

                  return (
                    <div
                      key={song.setSong.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border transition-all
                        ${song.listened
                          ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50'
                          : 'bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700'
                        }
                      `}
                    >
                      {/* Listened toggle */}
                      <button
                        onClick={() => toggleListened(song.setSong.id, song.listened)}
                        disabled={isToggling}
                        className={`
                          flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all
                          ${song.listened
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
                          }
                          ${isToggling ? 'opacity-50' : ''}
                        `}
                      >
                        {song.listened && <Check className="h-4 w-4" />}
                      </button>

                      {/* Song info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${song.listened ? 'text-green-700 dark:text-green-300' : ''}`}>
                            {song.song.title}
                          </span>
                          {key && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {key}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {song.song.artist}
                          {song.singer && (
                            <span className="ml-2">
                              <Music2 className="h-3 w-3 inline mr-1" />
                              {song.singer.name}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* YouTube button */}
                      {song.youtubeUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleYoutubeClick(song.setSong.id, song.youtubeUrl!)}
                          className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Youtube className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Watch</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
