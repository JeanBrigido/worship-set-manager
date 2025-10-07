'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Calendar, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'

interface ServiceType {
  id: string
  name: string
  defaultStartTime: string
}

interface User {
  id: string
  name: string
  email: string
}

interface Service {
  id: string
  serviceDate: string
  status: 'planned' | 'published' | 'cancelled'
  serviceTypeId: string
  leaderId?: string
  serviceType: ServiceType
  leader?: User
}

export default function EditServicePage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  const [service, setService] = useState<Service | null>(null)
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    serviceDate: '',
    serviceTypeId: '',
    leaderId: '',
    status: 'planned' as 'planned' | 'published' | 'cancelled'
  })

  useEffect(() => {
    if (serviceId) {
      fetchData()
    }
  }, [serviceId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch service details
      const serviceResult = await apiClient.get(`/services/${serviceId}`)
      if (serviceResult.error) {
        throw new Error(serviceResult.error.message)
      }
      if (serviceResult.data) {
        setService(serviceResult.data)

        // Set form data
        setFormData({
          serviceDate: serviceResult.data.serviceDate.split('T')[0], // Format date for input
          serviceTypeId: serviceResult.data.serviceTypeId,
          leaderId: serviceResult.data.leaderId || 'no-leader',
          status: serviceResult.data.status
        })
      }

      // Fetch service types
      const serviceTypesResult = await apiClient.get('/service-types')
      if (serviceTypesResult.error) {
        throw new Error(serviceTypesResult.error.message)
      }
      if (serviceTypesResult.data) {
        setServiceTypes(serviceTypesResult.data)
      }

      // Fetch users (leaders)
      const usersResult = await apiClient.get('/users')
      if (usersResult.error) {
        throw new Error(usersResult.error.message)
      }
      if (usersResult.data) {
        setUsers(usersResult.data)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load service details. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.serviceDate || !formData.serviceTypeId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)

      const { data, error } = await apiClient.put(`/services/${serviceId}`, {
        serviceDate: new Date(formData.serviceDate).toISOString(),
        serviceTypeId: formData.serviceTypeId,
        leaderId: formData.leaderId === "no-leader" ? undefined : formData.leaderId || undefined,
        status: formData.status
      })

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: 'Service updated successfully.',
      })
      router.push(`/services/${serviceId}`)
    } catch (error) {
      console.error('Error updating service:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update service. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Service Not Found"
          description="The requested service could not be found."
        />
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Service not found</p>
            <Button asChild className="mt-4">
              <Link href="/services">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Services
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Edit Service"
          description={`Update details for ${service.serviceType.name} service`}
        />
        <Button variant="outline" asChild>
          <Link href={`/services/${serviceId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Service
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>
            Update the service information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serviceDate">Service Date *</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) => handleInputChange('serviceDate', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceTypeId">Service Type *</Label>
                <Select
                  value={formData.serviceTypeId}
                  onValueChange={(value) => handleInputChange('serviceTypeId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.defaultStartTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaderId">Service Leader</Label>
                <Select
                  value={formData.leaderId}
                  onValueChange={(value) => handleInputChange('leaderId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leader (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-leader">No leader assigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value as 'planned' | 'published' | 'cancelled')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" asChild>
                <Link href={`/services/${serviceId}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}