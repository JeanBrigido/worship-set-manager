"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight, Music } from "lucide-react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

interface Service {
  id: string
  serviceDate: string
  status: 'planned' | 'published' | 'cancelled'
  serviceType: {
    id: string
    name: string
    defaultStartTime: string
  }
  worshipSet?: {
    id: string
    status: string
    leaderUserId?: string
    leaderUser?: {
      id: string
      name: string
      email: string
    }
    _count?: {
      setSongs: number
    }
    assignments?: {
      id: string
      user: { name: string }
      instrument: { displayName: string }
    }[]
  }
}

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch services when month changes
  useEffect(() => {
    fetchServicesForMonth(currentMonth)
  }, [currentMonth])

  const fetchServicesForMonth = async (month: Date) => {
    try {
      setLoading(true)

      // Get first and last day of the month
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)

      const response = await apiClient.get<Service[]>(
        `/services?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )

      if (response.error) {
        console.error('Error fetching services:', response.error)
        setServices([])
      } else {
        setServices(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  // Get services for selected date
  const selectedServices = selectedDate
    ? services.filter(service => {
        const serviceDate = new Date(service.serviceDate)
        return serviceDate.toDateString() === selectedDate.toDateString()
      })
    : []

  // Get all service dates for calendar highlighting
  const serviceDates = services.map(service => new Date(service.serviceDate))

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  const formatMonthYear = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default' as const
      case 'cancelled':
        return 'destructive' as const
      default:
        return 'secondary' as const
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Service Calendar
              </CardTitle>
              <CardDescription>
                Select a date to view scheduled services
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-center text-lg font-semibold mt-2">
            {formatMonthYear(currentMonth)}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={{
                hasService: serviceDates
              }}
              modifiersStyles={{
                hasService: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold'
                }
              }}
              className="rounded-md border w-full"
            />
          )}
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate ? formatDate(selectedDate) : "Select a date"}
          </CardTitle>
          <CardDescription>
            {loading
              ? "Loading services..."
              : selectedServices.length > 0
                ? `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} scheduled`
                : "No services scheduled"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : selectedServices.length > 0 ? (
            selectedServices.map((service) => (
              <div key={service.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{service.serviceType.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {service.serviceType.defaultStartTime}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(service.status)}>
                    {service.status}
                  </Badge>
                </div>

                {service.worshipSet?.leaderUser && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Led by {service.worshipSet.leaderUser.name}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {service.worshipSet?.assignments && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {service.worshipSet.assignments.length} assigned
                    </div>
                  )}
                  {service.worshipSet?._count && (
                    <div className="flex items-center gap-1">
                      <Music className="h-3 w-3" />
                      {service.worshipSet._count.setSongs} songs
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link href={`/services/${service.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link href={`/services/${service.id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                No services scheduled for this date
              </p>
              <Button size="sm" asChild>
                <Link href="/services/new">
                  <Plus className="h-3 w-3 mr-1" />
                  Create Service
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
