'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { TableLoading } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import {
  Music,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  ArrowUpDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchSongs()
  }, [])

  const fetchSongs = async () => {
    try {
      setLoading(true)
      const { data, error } = await apiClient.get('/songs')
      if (error) {
        throw new Error(error.message)
      }
      if (data) {
        setSongs(data)
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
  }

  const deleteSong = async (id: string) => {
    if (!confirm('Are you sure you want to delete this song?')) {
      return
    }

    try {
      const { data, error } = await apiClient.delete(`/songs/${id}`)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: 'Song deleted successfully',
      })
      fetchSongs() // Refresh the list
    } catch (error) {
      console.error('Error deleting song:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete song. Please try again.',
        variant: 'destructive',
      })
    }
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

  const columns: ColumnDef<Song>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent p-0 font-medium"
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "artist",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent p-0 font-medium"
          >
            Artist
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
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
      header: "Familiarity",
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

      {loading ? (
        <TableLoading rows={8} columns={8} />
      ) : (
        <DataTable
          columns={columns}
          data={songs}
          searchKey="title"
          searchPlaceholder="Search songs..."
        />
      )}
    </div>
  )
}