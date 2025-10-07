import { Role } from '@prisma/client'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      roles: Role[]
    }
  }

  interface User {
    id: string
    email: string
    name: string
    image?: string | null
    roles: Role[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    roles: Role[]
  }
}