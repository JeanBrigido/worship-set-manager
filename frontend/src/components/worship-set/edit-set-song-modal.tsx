'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api-client'
import { User, Music2, History, Users, Sparkles } from 'lucide-react'

interface SetSong {
  id: string
  position: number
  keyOverride?: string | null
  singerId?: string | null
  singer?: {
    id: string
    name: string
  } | null
  songVersion: {
    id: string
    name: string
    defaultKey?: string
    song: {
      id: string
      title: string
      artist: string
    }
  }
}

interface Singer {
  id: string
  name: string
}

interface KeySuggestion {
  singerHistory: Array<{
    id: string
    key: string
    serviceDate: string
    singer: { id: string; name: string }
  }>
  otherSingersHistory: Array<{
    id: string
    key: string
    serviceDate: string
    singer: { id: string; name: string }
  }>
  songVersions: Array<{
    id: string
    name: string
    defaultKey?: string
  }>
}

interface EditSetSongModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setSong: SetSong | null
  onSave: () => void
}

export function EditSetSongModal({
  open,
  onOpenChange,
  setSong,
  onSave,
}: EditSetSongModalProps) {
  const [singers, setSingers] = useState<Singer[]>([])
  const [suggestions, setSuggestions] = useState<KeySuggestion | null>(null)
  const [loadingSingers, setLoadingSingers] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(null)
  const [keyOverride, setKeyOverride] = useState('')

  // Reset form when modal opens with new song
  useEffect(() => {
    if (open && setSong) {
      setSelectedSingerId(setSong.singerId || null)
      setKeyOverride(setSong.keyOverride || setSong.songVersion.defaultKey || '')
      fetchSingers()
      fetchSuggestions(setSong.singerId || undefined)
    }
  }, [open, setSong])

  // Fetch suggestions when singer changes
  useEffect(() => {
    if (open && setSong && selectedSingerId) {
      fetchSuggestions(selectedSingerId)
    }
  }, [selectedSingerId])

  const fetchSingers = async () => {
    try {
      setLoadingSingers(true)
      // Fetch all active users who can be singers
      const { data, error } = await apiClient.get('/users?roles=admin,leader,musician&isActive=true')
      if (error) throw new Error(error.message)
      if (data) {
        setSingers(data)
      }
    } catch (error) {
      console.error('Error fetching singers:', error)
    } finally {
      setLoadingSingers(false)
    }
  }

  const fetchSuggestions = async (singerId?: string) => {
    if (!setSong) return
    try {
      setLoadingSuggestions(true)
      const songId = setSong.songVersion.song.id
      const params = new URLSearchParams({ songId })
      if (singerId) params.append('singerId', singerId)

      const { data, error } = await apiClient.get(`/singer-song-keys/suggestions?${params}`)
      if (error) throw new Error(error.message)
      if (data) {
        setSuggestions(data)
      }
    } catch (error) {
      console.error('Error fetching key suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleSave = async () => {
    if (!setSong) return
    try {
      setSaving(true)
      const { error } = await apiClient.put(`/set-songs/${setSong.id}`, {
        singerId: selectedSingerId || null,
        keyOverride: keyOverride || null,
      })
      if (error) throw new Error(error.message)
      onSave()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving set song:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyClick = (key: string) => {
    setKeyOverride(key)
  }

  if (!setSong) return null

  const defaultKey = setSong.songVersion.defaultKey

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
              <Music2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {setSong.songVersion.song.title}
              </DialogTitle>
              <DialogDescription className="text-sm">
                by {setSong.songVersion.song.artist}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Singer Selection */}
          <div className="space-y-2">
            <Label htmlFor="singer" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Singer
            </Label>
            <Select
              value={selectedSingerId || 'none'}
              onValueChange={(value) => setSelectedSingerId(value === 'none' ? null : value)}
            >
              <SelectTrigger id="singer" className="w-full">
                <SelectValue placeholder="Select a singer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Not assigned</span>
                </SelectItem>
                {loadingSingers ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  singers.map((singer) => (
                    <SelectItem key={singer.id} value={singer.id}>
                      {singer.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Key Override */}
          <div className="space-y-2">
            <Label htmlFor="key" className="flex items-center gap-2 text-sm font-medium">
              <Music2 className="h-4 w-4 text-muted-foreground" />
              Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="key"
                value={keyOverride}
                onChange={(e) => setKeyOverride(e.target.value)}
                placeholder={defaultKey || 'Enter key...'}
                className="flex-1"
              />
              {defaultKey && keyOverride !== defaultKey && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setKeyOverride(defaultKey)}
                  className="shrink-0"
                >
                  Reset to {defaultKey}
                </Button>
              )}
            </div>
            {defaultKey && (
              <p className="text-xs text-muted-foreground">
                Default key: {defaultKey}
              </p>
            )}
          </div>

          {/* Key Suggestions */}
          {selectedSingerId && (
            <div className="space-y-4">
              {/* Singer's History */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Previous Keys
                  {selectedSingerId && singers.find(s => s.id === selectedSingerId) && (
                    <span className="text-muted-foreground font-normal">
                      ({singers.find(s => s.id === selectedSingerId)?.name})
                    </span>
                  )}
                </Label>

                {loadingSuggestions ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                ) : suggestions?.singerHistory && suggestions.singerHistory.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.singerHistory.slice(0, 5).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleKeyClick(entry.key)}
                        className={`
                          group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                          border transition-all duration-150
                          ${keyOverride === entry.key
                            ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                            : 'bg-muted/50 border-transparent hover:bg-muted hover:border-border'
                          }
                        `}
                      >
                        <Sparkles className={`h-3 w-3 ${keyOverride === entry.key ? 'text-amber-500' : 'text-muted-foreground/50'}`} />
                        {entry.key}
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.serviceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic py-2 px-3 bg-muted/30 rounded-md">
                    No previous keys recorded for this singer and song
                  </p>
                )}
              </div>

              {/* Other Singers' Keys */}
              {suggestions?.otherSingersHistory && suggestions.otherSingersHistory.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Other Singers' Keys
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.otherSingersHistory.slice(0, 5).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleKeyClick(entry.key)}
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm
                          border transition-all duration-150
                          ${keyOverride === entry.key
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                            : 'bg-muted/30 border-transparent hover:bg-muted/60 hover:border-border'
                          }
                        `}
                      >
                        <span className="font-medium">{entry.key}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.singer.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
