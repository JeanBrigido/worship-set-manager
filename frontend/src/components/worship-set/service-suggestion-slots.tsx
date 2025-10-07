'use client'

import { Badge } from '@/components/ui/badge'
import { useSuggestionSlotsByWorshipSet } from '@/hooks/use-suggestions'

interface ServiceSuggestionSlotsProps {
  worshipSetId: string | undefined
}

export function ServiceSuggestionSlots({ worshipSetId }: ServiceSuggestionSlotsProps) {
  const { data: slots = [], isLoading } = useSuggestionSlotsByWorshipSet(worshipSetId || '')

  if (!worshipSetId) {
    return <span className="text-muted-foreground text-sm">No worship set</span>
  }

  if (isLoading) {
    return <span className="text-muted-foreground text-sm">Loading...</span>
  }

  if (slots.length === 0) {
    return <span className="text-muted-foreground text-sm">No slots assigned</span>
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {slots.map((slot) => (
        <Badge key={slot.id} variant="outline" className="text-xs">
          {slot.assignedUser?.name || 'Unassigned'}
        </Badge>
      ))}
    </div>
  )
}
