'use client'

import { useRouter } from 'next/navigation'
import { ServiceForm } from '@/components/forms/service-form'
import { PageHeader } from '@/components/layout/page-header'

export default function NewServicePage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New Service"
        description="Schedule a new worship service and automatically create a worship set"
      />

      <ServiceForm
        onSuccess={() => {
          router.push('/services')
        }}
        onCancel={() => {
          router.push('/services')
        }}
      />
    </div>
  )
}