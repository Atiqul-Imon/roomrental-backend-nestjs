import { PrismaClient } from '@prisma/client';

/** Must match ensure-landlord-service-account.ts */
const DESK_EMAIL = 'admin@roomrentalusa.com';
const DESK_NAME = 'Roomrental Desk';

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

const SOURCE_USER_EMAIL = process.env.SOURCE_USER_EMAIL?.trim();
const SOURCE_USER_NAME = (process.env.SOURCE_USER_NAME ?? 'Rahat Ahmed').trim();
const DRY_RUN = ['1', 'true', 'yes'].includes((process.env.DRY_RUN ?? '').toLowerCase());

function maxDate(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a > b ? a : b;
}

/**
 * Step 1: Create or normalize Roomrental Desk (same rules as ensure-landlord-service-account.ts).
 * Listing migration must not run until this returns a user id.
 */
async function ensureRoomrentalDeskUser() {
  const existing = await prisma.user.findUnique({
    where: { email: DESK_EMAIL },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email: DESK_EMAIL,
        name: DESK_NAME,
        role: 'landlord',
        password: null,
        emailVerified: true,
        verification: 'verified',
        bio: 'Official RoomRentalUSA landlord service account',
      },
      select: { id: true, email: true, name: true, role: true },
    });
    console.log(`  Created Roomrental Desk user: ${created.email} (id=${created.id})`);
    return created;
  }

  const updated = await prisma.user.update({
    where: { email: DESK_EMAIL },
    data: {
      name: DESK_NAME,
      role: 'landlord',
      emailVerified: true,
      verification: 'verified',
      bio:
        existing.role === 'landlord'
          ? undefined
          : 'Official RoomRentalUSA landlord service account',
    },
    select: { id: true, email: true, name: true, role: true },
  });
  console.log(`  Roomrental Desk user ready: ${updated.email} (id=${updated.id})`);
  return updated;
}

async function findSourceUser() {
  if (SOURCE_USER_EMAIL) {
    const u = await prisma.user.findUnique({
      where: { email: SOURCE_USER_EMAIL },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!u) {
      throw new Error(`No user with SOURCE_USER_EMAIL=${SOURCE_USER_EMAIL}`);
    }
    return u;
  }

  const matches = await prisma.user.findMany({
    where: { name: { equals: SOURCE_USER_NAME, mode: 'insensitive' } },
    select: { id: true, email: true, name: true, role: true },
  });

  if (matches.length === 0) {
    throw new Error(
      `No user with name matching "${SOURCE_USER_NAME}" (case-insensitive). Set SOURCE_USER_EMAIL to pick a specific account.`,
    );
  }
  if (matches.length > 1) {
    console.error('Multiple users match that name. Set SOURCE_USER_EMAIL to one of:\n');
    matches.forEach((m) => console.error(`  ${m.email}  (${m.name})  id=${m.id}`));
    throw new Error('Ambiguous SOURCE_USER_NAME; use SOURCE_USER_EMAIL.');
  }
  return matches[0];
}

/**
 * Rewire conversations so the former landlord receives nothing; Desk is the counterparty.
 * Merges into an existing (student, Desk, listingId) row when the unique key would conflict.
 */
async function migrateConversationsFromUserToUser(fromUserId: string, toUserId: string) {
  const convs = await prisma.conversation.findMany({
    where: {
      OR: [{ participant1Id: fromUserId }, { participant2Id: fromUserId }],
    },
    select: {
      id: true,
      participant1Id: true,
      participant2Id: true,
      listingId: true,
      lastMessageAt: true,
      lastEmailSentAt: true,
    },
  });

  let updated = 0;
  let merged = 0;
  let deletedSelf = 0;

  for (const conv of convs) {
    const newP1 = conv.participant1Id === fromUserId ? toUserId : conv.participant1Id;
    const newP2 = conv.participant2Id === fromUserId ? toUserId : conv.participant2Id;

    if (newP1 === newP2) {
      if (!DRY_RUN) {
        await prisma.conversation.delete({ where: { id: conv.id } });
      }
      deletedSelf++;
      continue;
    }

    const dup = await prisma.conversation.findFirst({
      where: {
        id: { not: conv.id },
        listingId: conv.listingId,
        OR: [
          { participant1Id: newP1, participant2Id: newP2 },
          { participant1Id: newP2, participant2Id: newP1 },
        ],
      },
      select: {
        id: true,
        lastMessageAt: true,
        lastEmailSentAt: true,
      },
    });

    if (dup) {
      if (DRY_RUN) {
        merged++;
        continue;
      }
      await prisma.$transaction(async (tx) => {
        await tx.message.updateMany({
          where: { conversationId: conv.id },
          data: { conversationId: dup.id },
        });
        const latest = await tx.message.findFirst({
          where: { conversationId: dup.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });
        await tx.conversation.update({
          where: { id: dup.id },
          data: {
            lastMessageAt: latest?.createdAt ?? maxDate(dup.lastMessageAt, conv.lastMessageAt),
            lastEmailSentAt: maxDate(dup.lastEmailSentAt, conv.lastEmailSentAt),
          },
        });
        await tx.conversation.delete({ where: { id: conv.id } });
      });
      merged++;
    } else {
      if (!DRY_RUN) {
        await prisma.conversation.update({
          where: { id: conv.id },
          data: { participant1Id: newP1, participant2Id: newP2 },
        });
      }
      updated++;
    }
  }

  return { total: convs.length, updated, merged, deletedSelf };
}

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no database writes.\n' : 'Running with database writes.\n');

  // --- Step 1: Roomrental Desk account (always first on a real run) ---
  let desk: { id: string; email: string; name: string | null };
  if (DRY_RUN) {
    console.log('[1/3] Roomrental Desk account (preview only; no creates in DRY RUN)');
    const found = await prisma.user.findUnique({
      where: { email: DESK_EMAIL },
      select: { id: true, email: true, name: true },
    });
    if (!found) {
      throw new Error(
        `No Roomrental Desk user (${DESK_EMAIL}). Run without DRY_RUN to create it in step 1, or: npm run ensure-landlord-service-account`,
      );
    }
    desk = found;
    console.log(`      Found: ${desk.email} (id=${desk.id})\n`);
  } else {
    console.log('[1/3] Ensuring Roomrental Desk account exists (create or normalize)...');
    desk = await ensureRoomrentalDeskUser();
    console.log('');
  }

  // --- Step 2: Who currently owns the listings ---
  console.log('[2/3] Resolving source user (current listing owner)...');
  const source = await findSourceUser();
  console.log(`      id: ${source.id}`);
  console.log(`      email: ${source.email}`);
  console.log(`      name: ${source.name}\n`);

  if (source.id === desk.id) {
    throw new Error('Source user is already Roomrental Desk; nothing to do.');
  }

  const listingCount = await prisma.listing.count({ where: { landlordId: source.id } });
  const convCount = await prisma.conversation.count({
    where: { OR: [{ participant1Id: source.id }, { participant2Id: source.id }] },
  });

  console.log(`      Listings to move: ${listingCount}`);
  console.log(`      Conversations to rewire: ${convCount}\n`);

  if (listingCount === 0 && convCount === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  // --- Step 3: Migrate listings, then conversations ---
  if (DRY_RUN) {
    console.log('[3/3] DRY RUN — would migrate:');
    console.log(`      Listings: set landlordId -> ${desk.id} (${DESK_EMAIL}) for ${listingCount} row(s).`);
    const preview = await migrateConversationsFromUserToUser(source.id, desk.id);
    console.log(
      `      Conversations: ${preview.total} row(s) — ${preview.updated} in-place, ${preview.merged} merge(s), ${preview.deletedSelf} self-delete(s).`,
    );
    return;
  }

  console.log('[3/3] Migrating listings to Roomrental Desk...');
  const listingResult = await prisma.listing.updateMany({
    where: { landlordId: source.id },
    data: { landlordId: desk.id },
  });
  console.log(`      Updated ${listingResult.count} listing(s).`);

  console.log('      Rewiring conversations to Roomrental Desk...');
  const convStats = await migrateConversationsFromUserToUser(source.id, desk.id);
  console.log(
    `      Conversations: ${convStats.total} processed — ${convStats.updated} participant swap(s), ${convStats.merged} merged, ${convStats.deletedSelf} removed (invalid self-pair).`,
  );
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
