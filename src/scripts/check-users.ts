import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking database for users...\n');

    // Count all users
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total Users: ${totalUsers}\n`);

    if (totalUsers === 0) {
      console.log('⚠️  No users found in database!');
      console.log('💡 Run: npm run seed\n');
      await prisma.$disconnect();
      return;
    }

    // Get users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    console.log('👥 Users by Role:');
    usersByRole.forEach((group) => {
      console.log(`   ${group.role}: ${group._count.role}`);
    });
    console.log('');

    // Get first 5 users
    const users = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        verification: true,
        createdAt: true,
      },
    });

    console.log('📋 Sample Users (first 5):');
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'N/A'} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Verification: ${user.verification}`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
    });

    console.log('\n✅ Database check completed!\n');
  } catch (error) {
    console.error('❌ Error checking database:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
