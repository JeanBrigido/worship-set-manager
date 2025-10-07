'use client'

import { useRouter } from 'next/navigation'
import { AssignmentForm } from '@/components/forms/assignment-form'
import { PageHeader } from '@/components/layout/page-header'

export default function NewAssignmentPage() {
  const router = useRouter()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create New Assignment"
        description="Assign a musician to an instrument for a worship set"
      />

      <AssignmentForm
        onSuccess={() => {
          router.push('/assignments')
        }}
        onCancel={() => {
          router.push('/assignments')
        }}
      />
    </div>
  )
}