'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export function UserProfile() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    )
  }

  if (!session) {
    return (
      <Link
        href="/auth/signin"
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        Sign In
      </Link>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="text-right">
        <p className="font-medium text-gray-900">{session.user.name}</p>
        <div className="flex space-x-1 justify-end mt-1">
          {session.user.roles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize"
            >
              {role}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {session.user.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}