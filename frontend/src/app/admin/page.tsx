'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // Check if user is admin
    const userRoles = (session?.user as any)?.roles || []
    if (!userRoles.includes('admin')) {
      router.push('/')
      return
    }

    // Redirect to dashboard
    router.push('/admin/dashboard')
  }, [status, session, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner />
    </div>
  )
}
