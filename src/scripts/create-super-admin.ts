import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

/** PgBouncer (e.g. Supabase :6543 pooler) needs prepared statements disabled */
function resolveDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL;
  if (direct?.trim()) return direct.trim();
  const url = process.env.DATABASE_URL || '';
  if (!url) return url;
  if (url.includes('pgbouncer=true')) return url;
  if (url.includes('pooler.') || url.includes(':6543')) {
    return url.includes('?') ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
  }
  return url;
}

const prisma = new PrismaClient({
  datasources: { db: { url: resolveDatabaseUrl() } },
});

// Simple credentials
const ADMIN_EMAIL = 'admin@roomrental.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Super Admin';

async function createSuperAdmin() {
  try {
    console.log('🔐 Creating Super Admin user...\n');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   ID: ${existingAdmin.id}\n`);
      
      // Update to super_admin if not already
      if (existingAdmin.role !== 'super_admin') {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { role: 'super_admin' },
        });
        console.log('✅ Updated user role to super_admin');
      }
      
      // Update password
      const passwordHash = await argon2.hash(ADMIN_PASSWORD);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: passwordHash },
      });
      console.log('✅ Password updated');
      
      console.log('\n📋 Admin Credentials:');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      console.log(`   Role: super_admin\n`);
      return;
    }

    // Hash password using Argon2 (same as the app uses)
    const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });

    // Create super admin user
    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: passwordHash,
        name: ADMIN_NAME,
        role: 'super_admin',
        emailVerified: true,
        verification: 'verified',
        bio: 'System Administrator',
      },
    });

    console.log('✅ Super Admin created successfully!\n');
    console.log('📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role:     super_admin`);
    console.log(`   ID:       ${admin.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 You can now login with these credentials at:');
    console.log('   Frontend: /auth/login');
    console.log('   API: POST /api/auth/login\n');
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin()
  .then(() => {
    console.log('✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

