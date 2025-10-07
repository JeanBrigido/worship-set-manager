require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 12)

    const user = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: hashedPassword,
        name: 'Test Admin',
        roles: ['admin'],
        isActive: true,
      }
    })

    console.log('Test user created successfully:', {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
    })

    // Also create a leader and musician for testing
    const leader = await prisma.user.create({
      data: {
        email: 'leader@test.com',
        password: hashedPassword,
        name: 'Test Leader',
        roles: ['leader'],
        isActive: true,
      }
    })

    const musician = await prisma.user.create({
      data: {
        email: 'musician@test.com',
        password: hashedPassword,
        name: 'Test Musician',
        roles: ['musician'],
        isActive: true,
      }
    })

    console.log('All test users created:')
    console.log('Admin:', { email: 'admin@test.com', password: 'password123' })
    console.log('Leader:', { email: 'leader@test.com', password: 'password123' })
    console.log('Musician:', { email: 'musician@test.com', password: 'password123' })

  } catch (error) {
    console.error('Error creating test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()