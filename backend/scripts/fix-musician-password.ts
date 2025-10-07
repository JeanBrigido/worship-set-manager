import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function fixMusicianPassword() {
  try {
    // Hash the correct password
    const hashedPassword = await bcrypt.hash('password123', 12)

    // Update the musician user
    const result = await prisma.user.update({
      where: { email: 'musician@test.com' },
      data: { password: hashedPassword }
    })

    console.log('✅ Updated musician@test.com password')
    console.log(`Email: ${result.email}`)
    console.log(`Name: ${result.name}`)
    console.log(`Roles: ${result.roles.join(', ')}`)
    console.log(`Password hash (first 50 chars): ${result.password?.substring(0, 50)}...`)
  } catch (error) {
    console.error('❌ Error updating password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixMusicianPassword()
