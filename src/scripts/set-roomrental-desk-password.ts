import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../common/utils/password.util';

/** Must match ensure-landlord-service-account.ts */
const DESK_EMAIL = 'admin@roomrentalusa.com';

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

async function main() {
  const plain = process.env.DESK_PASSWORD?.trim();
  if (!plain || plain.length < 8) {
    throw new Error(
      'Set DESK_PASSWORD in the environment (min 8 characters). Example: DESK_PASSWORD=\'your-secret\' npm run set-roomrental-desk-password',
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: DESK_EMAIL },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new Error(
      `No user with email ${DESK_EMAIL}. Run: npm run ensure-landlord-service-account`,
    );
  }

  const password = await hashPassword(plain);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password,
      emailVerified: true,
      verification: 'verified',
    },
  });

  console.log(`Password updated for ${DESK_EMAIL} (${user.name ?? 'Roomrental Desk'}).`);
  console.log('You can sign in at /auth/login with that email and the password you set.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
