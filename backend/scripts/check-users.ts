import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isActive: true,
        password: true,
      }
    })

    console.log('Users in database:')
    users.forEach(user => {
      console.log(`\nEmail: ${user.email}`)
      console.log(`Name: ${user.name}`)
      console.log(`Roles: ${user.roles.join(', ')}`)
      console.log(`Active: ${user.isActive}`)
      console.log(`Has Password: ${!!user.password}`)
      console.log(`Password Hash (first 50 chars): ${user.password?.substring(0, 50)}...`)
    })

    console.log(`\nTotal users: ${users.length}`)
  } catch (error) {
    console.error('Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
