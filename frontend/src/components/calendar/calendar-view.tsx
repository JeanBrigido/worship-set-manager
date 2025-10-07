"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar as CalendarIcon, Clock, Users } from "lucide-react"
import Link from "next/link"

// Mock service data for demonstration
const mockServices = [
  {
    id: "1",
    date: "2025-01-26",
    serviceType: "Sunday",
    title: "Sunday Morning Worship",
    time: "10:00 AM",
    assignments: 8,
    worshipSet: {
      songs: [
        { title: "Amazing Grace", artist: "Traditional" },
        { title: "How Great Thou Art", artist: "Traditional" },
        { title: "10,000 Reasons", artist: "Matt Redman" }
      ]
    }
  },
  {
    id: "2",
    date: "2025-01-28",
    serviceType: "Tuesday",
    title: "Tuesday Evening Prayer",
    time: "7:00 PM",
    assignments: 4,
    worshipSet: {
      songs: [
        { title: "Be Still My Soul", artist: "Katharina von Schlegel" },
        { title: "In Christ Alone", artist: "Keith Getty" }
      ]
    }
  },
  {
    id: "3",
    date: "2025-01-29",
    serviceType: "Youth",
    title: "Youth Worship Night",
    time: "6:30 PM",
    assignments: 6,
    worshipSet: {
      songs: [
        { title: "Reckless Love", artist: "Cory Asbury" },
        { title: "What a Beautiful Name", artist: "Hillsong" },
        { title: "Good Good Father", artist: "Chris Tomlin" }
      ]
    }
  }
]

const serviceTypeColors = {
  Sunday: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Tuesday: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Youth: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
}

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  // Get services for selected date
  const selectedServices = selectedDate
    ? mockServices.filter(service => {
        const serviceDate = new Date(service.date)
        return serviceDate.toDateString() === selectedDate.toDateString()
      })
    : []

  // Get all service dates for calendar highlighting
  const serviceDates = mockServices.map(service => new Date(service.date))

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Service Calendar
          </CardTitle>
          <CardDescription>
            Select a date to view scheduled services and worship sets
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate ? formatDate(selectedDate) : "Select a date"}
          </CardTitle>
          <CardDescription>
            {selectedServices.length > 0
              ? `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} scheduled`
              : "No services scheduled"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedServices.length > 0 ? (
            selectedServices.map((service) => (
              <div key={service.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{service.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {service.time}
                    </div>
                  </div>
                  <Badge className={serviceTypeColors[service.serviceType as keyof typeof serviceTypeColors]}>
                    {service.serviceType}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {service.assignments} assignments
                </div>

                {service.worshipSet.songs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Worship Set</h4>
                    <div className="space-y-1">
                      {service.worshipSet.songs.map((song, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          {index + 1}. {song.title} - {song.artist}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/services/${service.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
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