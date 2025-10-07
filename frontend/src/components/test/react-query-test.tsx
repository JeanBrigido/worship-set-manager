"use client"

import { useSongs, useCreateSong } from '@/hooks/useSongs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Music, Plus } from 'lucide-react'

export function ReactQueryTest() {
  const { data: songs, isLoading, error, refetch, isFetching } = useSongs()
  const createSongMutation = useCreateSong()

  const handleCreateTestSong = () => {
    const testSong = {
      title: `Test Song ${Date.now()}`,
      artist: 'Test Artist',
      tags: ['test'],
      language: 'English',
      familiarityScore: 75
    }

    createSongMutation.mutate(testSong)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            React Query Test - Songs
          </CardTitle>
          <CardDescription>
            This component demonstrates React Query functionality with the songs API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="outline"
              size="sm"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refetch Songs
            </Button>
            <Button
              onClick={handleCreateTestSong}
              disabled={createSongMutation.isPending}
              size="sm"
            >
              {createSongMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Test Song
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading songs...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium">Error loading songs:</p>
              <p className="text-red-600 text-sm">{error.message}</p>
            </div>
          )}

          {/* Success State */}
          {songs && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">
                Found {songs.length} songs:
              </h3>
              <div className="space-y-2">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {song.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        by {song.artist}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {song.language}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Score: {song.familiarityScore}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mutation Status */}
          {createSongMutation.isError && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium">Error creating song:</p>
              <p className="text-red-600 text-sm">{createSongMutation.error?.message}</p>
            </div>
          )}

          {createSongMutation.isSuccess && (
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">Song created successfully!</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>React Query Features Demonstrated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>✅ Data fetching</div>
            <div>✅ Loading states</div>
            <div>✅ Error handling</div>
            <div>✅ Manual refetching</div>
            <div>✅ Mutations</div>
            <div>✅ Cache invalidation</div>
            <div>✅ Optimistic updates</div>
            <div>✅ Background refetching</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}