import { getServerSession } from 'next-auth'
import jwt from 'jsonwebtoken'
import { authOptions } from '@/lib/auth'

export async function generateJwtToken() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw new Error('No authenticated session found')
    }

    // Create JWT payload matching backend expectations
    const payload = {
      userId: session.user.id,
      roles: session.user.roles,
      email: session.user.email,
      name: session.user.name,
    }

    // Use the same secret as the backend
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET

    if (!secret) {
      throw new Error('JWT_SECRET or NEXTAUTH_SECRET not found in environment variables')
    }

    // Generate token with 1 hour expiration
    const token = jwt.sign(payload, secret, {
      expiresIn: '1h',
      issuer: 'worship-set-manager-frontend'
    })

    return token
  } catch (error) {
    console.error('JWT generation error:', error)
    throw error
  }
}