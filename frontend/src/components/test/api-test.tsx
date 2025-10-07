'use client'

import { useSession } from 'next-auth/react'
import { useApiTest } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorMessage } from '@/components/ui/error-message'

export function ApiTest() {
  const { data: session } = useSession()
  const { data: response, isLoading, error, refetch } = useApiTest() as { data: any, isLoading: boolean, error: any, refetch: () => void }

  if (!session) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-xl">
        <div className="flex items-center">
          <span className="text-amber-500 mr-3">⚠️</span>
          <div>
            <p className="font-medium">Authentication Required</p>
            <p className="text-sm text-amber-700">Please sign in to test the API connection</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorMessage
        title="API Test Failed"
        message={error instanceof Error ? error.message : 'Failed to connect to the API'}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Connection Test</h3>
          <p className="text-sm text-muted-foreground">Test the NextAuth.js → JWT → Backend API integration</p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              Testing...
            </>
          ) : (
            'Test API'
          )}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {response && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
          <div className="flex items-start">
            <span className="text-green-500 mr-3 mt-0.5">✅</span>
            <div className="flex-1">
              <p className="font-medium">API Connection Successful!</p>
              <p className="text-sm text-green-600 mt-1">NextAuth.js → JWT Bridge → Backend API integration is working.</p>

              {response && Object.keys(response).length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-green-800 hover:text-green-900">
                    View API Response
                  </summary>
                  <pre className="mt-2 text-xs bg-green-100 p-3 rounded border overflow-auto max-h-40">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}