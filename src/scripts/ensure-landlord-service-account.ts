import { PrismaClient } from '@prisma/client';

/**
 * Ensure a landlord service account exists for system-owned listings.
 * - idempotent: safe to run multiple times
 * - does not set a password by default (service account, non-human login)
 */
const SERVICE_EMAIL = 'admin@roomrentalusa.com';
const SERVICE_NAME = 'Roomrental Desk';

const prisma = new PrismaClient();

async function ensureLandlordServiceAccount() {
  console.log('🔎 Ensuring landlord service account...');
  console.log(`   Email: ${SERVICE_EMAIL}`);
  console.log(`   Name : ${SERVICE_NAME}\n`);

  const existing = await prisma.user.findUnique({
    where: { email: SERVICE_EMAIL },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true,
      emailVerified: true,
      verification: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email: SERVICE_EMAIL,
        name: SERVICE_NAME,
        role: 'landlord',
        password: null,
        emailVerified: true,
        verification: 'verified',
        bio: 'Official RoomRentalUSA landlord service account',
      },
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

    console.log('✅ Service account created');
    console.log(created);
    return created;
  }

  const updated = await prisma.user.update({
    where: { email: SERVICE_EMAIL },
    data: {
      name: SERVICE_NAME,
      role: 'landlord',
      emailVerified: true,
      verification: 'verified',
      bio: existing.role === 'landlord'
        ? undefined
        : 'Official RoomRentalUSA landlord service account',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      verification: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log('✅ Service account already existed; normalized profile/role');
  console.log(updated);
  return updated;
}

ensureLandlordServiceAccount()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✨ Done');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Failed to ensure service account:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

