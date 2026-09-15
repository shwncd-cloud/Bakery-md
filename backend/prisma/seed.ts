import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/// Seeds the Platform Admin account and the pilot bakery tenant with its
/// Owner. Staff accounts (cashier, waiters, cook) and the product catalog
/// are created afterward through the app itself, not hardcoded here.
async function main() {
  const adminNationalId = process.env.SEED_ADMIN_NATIONAL_ID ?? '0000000000';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-now';

  const admin = await prisma.user.upsert({
    where: { nationalId: adminNationalId },
    update: {},
    create: {
      nationalId: adminNationalId,
      fullName: 'Platform Admin',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: Role.PLATFORM_ADMIN,
      tenantId: null,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { id: process.env.SEED_PILOT_TENANT_ID ?? '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Pilot Bakery',
      country: 'CO',
    },
  });

  const ownerNationalId = process.env.SEED_OWNER_NATIONAL_ID ?? '1111111111';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? 'change-me-now';

  const owner = await prisma.user.upsert({
    where: { nationalId: ownerNationalId },
    update: {},
    create: {
      nationalId: ownerNationalId,
      fullName: 'Bakery Owner',
      passwordHash: await bcrypt.hash(ownerPassword, 10),
      role: Role.OWNER,
      tenantId: tenant.id,
    },
  });

  console.log('Seeded:', { admin: admin.nationalId, tenant: tenant.name, owner: owner.nationalId });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
