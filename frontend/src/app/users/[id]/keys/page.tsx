'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft, Music2, Calendar, History, User } from 'lucide-react'
import Link from 'next/link'

interface KeyEntry {
  id: string
  key: string
  serviceDate: string
  notes: string | null
}

interface SongKeyProfile {
  song: {
    id: string
    title: string
    artist: string | null
  }
  entries: KeyEntry[]
  mostRecentKey: string
}

interface UserProfile {
  id: string
  name: string
  email: string
}

export default function UserKeyProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const userId = params.id as string

  const [user, setUser] = useState<UserProfile | null>(null)
  const [keyProfile, setKeyProfile] = useState<SongKeyProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isOwnProfile = session?.user?.id === userId
  const isAdmin = session?.user?.roles?.includes('admin')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch user info and key profile in parallel
        const [userRes, profileRes] = await Promise.all([
          apiClient.get(`/users/${userId}`),
          apiClient.get(`/users/${userId}/key-profile`),
        ])

        if (userRes.error) throw new Error(userRes.error.message)
        if (profileRes.error) throw new Error(profileRes.error.message)

        setUser(userRes.data)
        setKeyProfile(profileRes.data || [])
      } catch (err) {
        console.error('Error fetching key profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load key profile')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchData()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Error" description={error || 'User not found'} />
        <Button asChild variant="outline">
          <Link href="/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {isOwnProfile ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/profile">Profile</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>My Song Keys</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/users">Users</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{user.name}'s Song Keys</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
            <User className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <PageHeader
              title={isOwnProfile ? 'My Song Keys' : `${user.name}'s Song Keys`}
              description={`Key preferences for ${keyProfile.length} song${keyProfile.length !== 1 ? 's' : ''}`}
            />
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={isOwnProfile ? '/profile' : '/users'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {keyProfile.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <Music2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Song Keys Recorded</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isOwnProfile
                ? "You don't have any song keys recorded yet. Keys are automatically saved when you're assigned as a singer for songs in worship sets."
                : "This user doesn't have any song keys recorded yet. Keys are automatically saved when they are assigned as a singer for songs in worship sets."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Accordion type="multiple" className="space-y-4">
            {keyProfile.map((songProfile) => (
              <AccordionItem
                key={songProfile.song.id}
                value={songProfile.song.id}
                className="border rounded-lg px-4 bg-card"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50">
                      <Music2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium truncate">{songProfile.song.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {songProfile.song.artist || 'Unknown Artist'}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 font-mono text-base px-3 py-1 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    >
                      {songProfile.mostRecentKey}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="pl-14 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <History className="h-4 w-4" />
                      Key History ({songProfile.entries.length} record
                      {songProfile.entries.length !== 1 ? 's' : ''})
                    </div>
                    <div className="space-y-2">
                      {songProfile.entries.map((entry, index) => (
                        <div
                          key={entry.id}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg
                            ${index === 0
                              ? 'bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30'
                              : 'bg-muted/30'
                            }
                          `}
                        >
                          <Badge
                            variant={index === 0 ? 'default' : 'secondary'}
                            className={`
                              font-mono shrink-0
                              ${index === 0
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : ''
                              }
                            `}
                          >
                            {entry.key}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(entry.serviceDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Most Recent
                            </Badge>
                          )}
                          {entry.notes && (
                            <span className="text-sm text-muted-foreground italic ml-auto">
                              {entry.notes}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  )
}
