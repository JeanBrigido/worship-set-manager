import { getSession } from 'next-auth/react'

// In-memory token cache
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Clear the cached token (call on sign out)
 */
export function clearTokenCache(): void {
  cachedToken = null
}

/**
 * Generates a JWT token compatible with the backend authentication system
 * from the current NextAuth.js session.
 * Caches the token to avoid repeated API calls.
 */
export async function generateBackendJWT(): Promise<string | null> {
  // Check if we have a valid cached token (with 5 min buffer)
  const bufferMs = 5 * 60 * 1000
  if (cachedToken && cachedToken.expiresAt > Date.now() + bufferMs) {
    return cachedToken.token
  }

  const session = await getSession()

  if (!session?.user) {
    cachedToken = null
    return null
  }

  try {
    // Call our API route to generate the JWT server-side
    const response = await fetch('/api/auth/jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Failed to generate JWT:', response.statusText)
      cachedToken = null
      return null
    }

    const data = await response.json()
    const token = data.token

    if (token) {
      // Cache token with 1 hour expiry (matching server-side expiry)
      cachedToken = {
        token,
        expiresAt: Date.now() + 60 * 60 * 1000,
      }
    }

    return token || null
  } catch (error) {
    console.error('Error generating JWT:', error)
    cachedToken = null
    return null
  }
}

/**
 * Generates a JWT token for API calls - server-side version
 * for use in API routes and server components
 */
export function generateBackendJWTFromSession(session: any): string | null {
  if (!session?.user) {
    return null
  }

  const jwt = require('jsonwebtoken')

  const payload = {
    userId: session.user.id,
    roles: session.user.roles,
    email: session.user.email,
    name: session.user.name,
  }

  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET

  if (!secret) {
    console.error('JWT_SECRET or NEXTAUTH_SECRET not found in environment variables')
    return null
  }

  const token = jwt.sign(payload, secret, {
    expiresIn: '1h',
    issuer: 'worship-set-manager-frontend'
  })

  return token
}
