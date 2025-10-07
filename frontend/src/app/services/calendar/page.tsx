import { PageHeader } from '@/components/layout/page-header'
import { CalendarView } from '@/components/calendar/calendar-view'
import { Button } from '@/components/ui/button'
import { Plus, List } from 'lucide-react'
import Link from 'next/link'

export default function ServiceCalendarPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Service Calendar"
        description="Plan and view worship services on a calendar"
      />

      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/services">
              <List className="h-4 w-4 mr-2" />
              List View
            </Link>
          </Button>
        </div>
        <Button asChild>
          <Link href="/services/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Service
          </Link>
        </Button>
      </div>

      <CalendarView />
    </div>
  )
}