import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      )
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
      console.error('JWT_SECRET or NEXTAUTH_SECRET not found in environment variables')
      return NextResponse.json(
        { error: { message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    // Generate token with 1 hour expiration
    const token = jwt.sign(payload, secret, {
      expiresIn: '1h',
      issuer: 'worship-set-manager-frontend'
    })

    return NextResponse.json({ token })
  } catch (error) {
    console.error('JWT generation error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}