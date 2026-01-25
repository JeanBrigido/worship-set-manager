'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { TableLoading } from '@/components/ui/page-loading'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  Music,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'

interface SongVersion {
  id: string
  name: string
  defaultKey?: string
  bpm?: number
  youtubeUrl?: string
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

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('title')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const { toast } = useToast()

  const debouncedSearch = useDebounce(search, 300)

  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
      })
      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }

      const { data, error } = await apiClient.get(`/songs?${params.toString()}`)
      if (error) {
        throw new Error(error.message)
      }
      if (data) {
        setSongs(data.data || data)
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching songs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load songs. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, sortBy, sortOrder, toast])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  // Reset to page 1 when search changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [debouncedSearch])

  const deleteSong = async (id: string) => {
    if (!confirm('Are you sure you want to delete this song?')) {
      return
    }

    // Optimistic update: remove song from UI immediately
    const previousSongs = songs
    setSongs(prev => prev.filter(song => song.id !== id))

    try {
      const { data, error } = await apiClient.delete(`/songs/${id}`)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: 'Song deleted successfully',
      })
      // Refetch to sync with server (but UI already updated)
      fetchSongs()
    } catch (error) {
      // Revert optimistic update on error
      setSongs(previousSongs)
      console.error('Error deleting song:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete song. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page: Math.max(1, Math.min(page, prev.totalPages)) }))
  }

  const getFamiliarityColor = (score: number) => {
    if (score >= 80) return 'default'
    if (score >= 50) return 'secondary'
    return 'outline'
  }

  const getFamiliarityLabel = (score: number) => {
    if (score >= 80) return 'Well Known'
    if (score >= 50) return 'Familiar'
    return 'New'
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const columns: ColumnDef<Song>[] = [
    {
      accessorKey: "title",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort('title')}
          className="hover:bg-transparent p-0 font-medium"
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "artist",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort('artist')}
          className="hover:bg-transparent p-0 font-medium"
        >
          Artist
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      id: "key",
      header: "Key",
      cell: ({ row }) => {
        const song = row.original
        const defaultKey = song.versions[0]?.defaultKey
        return (
          <div className="text-center">
            {defaultKey || "-"}
          </div>
        )
      },
    },
    {
      id: "tempo",
      header: "Tempo",
      cell: ({ row }) => {
        const song = row.original
        const bpm = song.versions[0]?.bpm
        return (
          <div className="text-center">
            {bpm ? `${bpm} BPM` : "-"}
          </div>
        )
      },
    },
    {
      accessorKey: "language",
      header: "Language",
    },
    {
      accessorKey: "familiarityScore",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort('familiarityScore')}
          className="hover:bg-transparent p-0 font-medium"
        >
          Familiarity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const score = row.getValue("familiarityScore") as number
        return (
          <Badge variant={getFamiliarityColor(score)}>
            {getFamiliarityLabel(score)} ({score})
          </Badge>
        )
      },
    },
    {
      accessorKey: "ccliNumber",
      header: "CCLI",
      cell: ({ row }) => (
        <div className="text-center">
          {row.getValue("ccliNumber") || "-"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const song = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <div className="h-4 w-4">⋯</div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/songs/${song.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/songs/${song.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteSong(song.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Songs"
          description="Manage your church's worship songs and hymns"
        />
        <Button asChild>
          <Link href="/songs/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New Song
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search songs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={pagination.limit.toString()} onValueChange={(value) => setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="20">20 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">100 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableLoading rows={8} columns={8} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={songs}
          />

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} songs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
