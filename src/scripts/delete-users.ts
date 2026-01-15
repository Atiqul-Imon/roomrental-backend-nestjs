import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const emailsToDelete = [
  'atiqulimon.dev@gmail.com',
  'imonatikulislam@gmail.com',
];

async function deleteUsers() {
  try {
    console.log('🗑️  Deleting user accounts...\n');

    for (const email of emailsToDelete) {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              listings: true,
              favorites: true,
              reviewsGiven: true,
              reviewsReceived: true,
              conversationsAsParticipant1: true,
              conversationsAsParticipant2: true,
              sentMessages: true,
              savedSearches: true,
              searchHistory: true,
            },
          },
        },
      });

      if (!user) {
        console.log(`⚠️  User not found: ${email}`);
        continue;
      }

      console.log(`\n📋 User to delete:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log(`\n📊 Related records:`);
      console.log(`   Listings: ${user._count.listings}`);
      console.log(`   Favorites: ${user._count.favorites}`);
      console.log(`   Reviews Given: ${user._count.reviewsGiven}`);
      console.log(`   Reviews Received: ${user._count.reviewsReceived}`);
      console.log(`   Conversations (P1): ${user._count.conversationsAsParticipant1}`);
      console.log(`   Conversations (P2): ${user._count.conversationsAsParticipant2}`);
      console.log(`   Messages: ${user._count.sentMessages}`);
      console.log(`   Saved Searches: ${user._count.savedSearches}`);
      console.log(`   Search History: ${user._count.searchHistory}`);

      // Delete user (related records will be cascade deleted)
      await prisma.user.delete({
        where: { email },
      });

      console.log(`\n✅ Successfully deleted user: ${email}\n`);
    }

    console.log('\n✅ All specified users have been deleted!\n');
  } catch (error) {
    console.error('❌ Error deleting users:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

deleteUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

