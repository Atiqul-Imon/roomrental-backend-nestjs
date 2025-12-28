import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAdminUsersQuery() {
  try {
    console.log('🧪 Testing admin users query...\n');

    const query = { page: 1, limit: 20 };
    const { page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    console.log('📊 Query parameters:');
    console.log('   page:', page);
    console.log('   limit:', limit);
    console.log('   skip:', skip);
    console.log('   where:', JSON.stringify(where, null, 2));
    console.log('');

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    console.log(`✅ Query successful!`);
    console.log(`   Found ${users.length} users (total: ${total})\n`);

    // Test transformation
    console.log('🔄 Testing data transformation...\n');
    const transformedUsers = users.map((user) => {
      return {
        id: user.id,
        _id: user.id,
        email: user.email || '',
        name: user.name || '',
        role: user.role,
        profileImage: user.profileImage || null,
        bio: user.bio || null,
        phone: user.phone || null,
        verification: {
          emailVerified: user.emailVerified || false,
          phoneVerified: false,
          idVerified: user.verification === 'verified',
        },
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
        preferences: user.preferences || null,
      };
    });

    console.log('✅ Transformation successful!');
    console.log(`   Transformed ${transformedUsers.length} users\n`);

    // Show sample
    if (transformedUsers.length > 0) {
      console.log('📋 Sample transformed user:');
      console.log(JSON.stringify(transformedUsers[0], null, 2));
    }

    const result = {
      success: true,
      data: {
        users: transformedUsers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    };

    console.log('\n✅ Final result structure:');
    console.log(`   success: ${result.success}`);
    console.log(`   users count: ${result.data.users.length}`);
    console.log(`   pagination.total: ${result.data.pagination.total}`);
    console.log(`   pagination.page: ${result.data.pagination.page}`);
    console.log(`   pagination.limit: ${result.data.pagination.limit}`);
    console.log(`   pagination.totalPages: ${result.data.pagination.totalPages}`);

    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testAdminUsersQuery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });

