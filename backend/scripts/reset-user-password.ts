import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  const userId = process.argv.find(arg => arg.startsWith('--userId='))?.split('=')[1];
  const newPassword = process.argv.find(arg => arg.startsWith('--password='))?.split('=')[1];

  if (!userId) {
    console.error('❌ Error: --userId parameter is required');
    console.log('Usage: npx ts-node scripts/reset-user-password.ts --userId=<user-id> --password=<new-password>');
    process.exit(1);
  }

  if (!newPassword) {
    console.error('❌ Error: --password parameter is required');
    console.log('Usage: npx ts-node scripts/reset-user-password.ts --userId=<user-id> --password=<new-password>');
    process.exit(1);
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, roles: true }
    });

    if (!user) {
      console.error(`❌ User with ID ${userId} not found`);
      process.exit(1);
    }

    console.log('\n🔍 Found user:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Roles: ${user.roles.join(', ')}`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    console.log('\n✅ Password successfully reset!');
    console.log('   All JWT tokens for this user are now invalidated.');
    console.log('   User can now login with the new password.');

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
