import { getSession } from 'next-auth/react'

/**
 * Generates a JWT token compatible with the backend authentication system
 * from the current NextAuth.js session.
 */
export async function generateBackendJWT(): Promise<string | null> {
  const session = await getSession()

  if (!session?.user) {
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
      return null
    }

    const data = await response.json()
    return data.token || null
  } catch (error) {
    console.error('Error generating JWT:', error)
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