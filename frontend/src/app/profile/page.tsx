'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Checkbox } from '@/components/ui/checkbox'
import { User, Mail, Phone, Shield, Calendar, Music, Music2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface Instrument {
  id: string
  code: string
  displayName: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })

  // Instruments state
  const [allInstruments, setAllInstruments] = useState<Instrument[]>([])
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<Set<string>>(new Set())
  const [originalInstrumentIds, setOriginalInstrumentIds] = useState<Set<string>>(new Set())
  const [instrumentsLoading, setInstrumentsLoading] = useState(true)
  const [savingInstruments, setSavingInstruments] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: (session.user as any).phone || '',
      })
    }
  }, [session])

  // Fetch instruments when user is available
  useEffect(() => {
    const fetchInstruments = async () => {
      const userId = (session?.user as any)?.id
      if (!userId) return

      try {
        setInstrumentsLoading(true)

        // Fetch all available instruments
        const allRes = await fetch('/api/instruments')
        if (allRes.ok) {
          const allData = await allRes.json()
          setAllInstruments(allData.data || allData || [])
        }

        // Fetch user's instruments
        const userRes = await fetch(`/api/users/${userId}/instruments`)
        if (userRes.ok) {
          const userData = await userRes.json()
          const instrumentIds = new Set<string>((userData.data || []).map((i: Instrument) => i.id))
          setSelectedInstrumentIds(instrumentIds)
          setOriginalInstrumentIds(new Set<string>(instrumentIds))
        }
      } catch (error) {
        console.error('Error fetching instruments:', error)
      } finally {
        setInstrumentsLoading(false)
      }
    }

    if (session?.user) {
      fetchInstruments()
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userId = (session?.user as any)?.id
      if (!userId) {
        throw new Error('User ID not found')
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phoneE164: formData.phone,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const result = await response.json()

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
    } catch (error) {
      console.error('Error updating user:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleInstrument = (instrumentId: string) => {
    setSelectedInstrumentIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(instrumentId)) {
        newSet.delete(instrumentId)
      } else {
        newSet.add(instrumentId)
      }
      return newSet
    })
  }

  const hasInstrumentChanges = () => {
    if (selectedInstrumentIds.size !== originalInstrumentIds.size) return true
    for (const id of Array.from(selectedInstrumentIds)) {
      if (!originalInstrumentIds.has(id)) return true
    }
    return false
  }

  const saveInstruments = async () => {
    const userId = (session?.user as any)?.id
    if (!userId) return

    setSavingInstruments(true)
    try {
      const response = await fetch(`/api/users/${userId}/instruments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instrumentIds: Array.from(selectedInstrumentIds),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update instruments')
      }

      setOriginalInstrumentIds(new Set(selectedInstrumentIds))

      toast({
        title: 'Success',
        description: 'Instruments updated successfully',
      })
    } catch (error) {
      console.error('Error saving instruments:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update instruments',
        variant: 'destructive',
      })
    } finally {
      setSavingInstruments(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!session) {
    return null
  }

  const userRoles = (session.user as any)?.roles || []
  const createdAt = (session.user as any)?.createdAt
  const userId = (session.user as any)?.id

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={session.user.image || ''} />
                <AvatarFallback className="text-2xl">
                  {session.user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle>{session.user.name}</CardTitle>
                <CardDescription>{session.user.email}</CardDescription>
                <div className="flex gap-2 mt-2">
                  {userRoles.map((role: string) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  <User className="inline h-4 w-4 mr-2" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="inline h-4 w-4 mr-2" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  disabled={loading}
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* My Instruments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              My Instruments
            </CardTitle>
            <CardDescription>Select the instruments you play</CardDescription>
          </CardHeader>
          <CardContent>
            {instrumentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : allInstruments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No instruments configured yet
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {allInstruments.map((instrument) => (
                    <div
                      key={instrument.id}
                      className="flex items-center space-x-3"
                    >
                      <Checkbox
                        id={`instrument-${instrument.id}`}
                        checked={selectedInstrumentIds.has(instrument.id)}
                        onCheckedChange={() => toggleInstrument(instrument.id)}
                      />
                      <Label
                        htmlFor={`instrument-${instrument.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {instrument.displayName}
                      </Label>
                    </div>
                  ))}
                </div>

                {hasInstrumentChanges() && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={saveInstruments}
                      disabled={savingInstruments}
                    >
                      {savingInstruments ? (
                        <>
                          <LoadingSpinner className="mr-2 h-4 w-4" />
                          Saving...
                        </>
                      ) : (
                        'Save Instruments'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Song Keys */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-b border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40">
                <Music2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>My Song Keys</CardTitle>
                <CardDescription>View your preferred keys for each song you've sung</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Track which keys you use when singing different songs. This helps leaders assign the right key for you automatically.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/users/${userId}/keys`}>
                View My Song Keys
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">User ID</span>
              </div>
              <span className="text-sm text-muted-foreground font-mono">{userId}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Member Since</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Roles</span>
              </div>
              <div className="flex gap-2">
                {userRoles.map((role: string) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/settings')}>
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
