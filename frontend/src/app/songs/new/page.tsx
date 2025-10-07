'use client'

import { useRouter } from 'next/navigation'
import { SongForm } from '@/components/forms/song-form'
import { PageHeader } from '@/components/layout/page-header'

export default function NewSongPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Song"
        description="Add a new song to your worship catalog"
      />

      <SongForm
        onSuccess={() => {
          router.push('/songs')
        }}
        onCancel={() => {
          router.push('/songs')
        }}
      />
    </div>
  )
}