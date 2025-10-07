require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        password: true,
        isActive: true
      }
    })

    console.log('Users in database:')
    users.forEach(user => {
      console.log({
        email: user.email,
        name: user.name,
        roles: user.roles,
        hasPassword: !!user.password,
        isActive: user.isActive
      })
    })

  } catch (error) {
    console.error('Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()