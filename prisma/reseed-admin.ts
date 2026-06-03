import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

// Resets ONLY the admin user's password — does not touch any site content.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hidhowugreat@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!Secure';

async function main() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, passwordHash: hash, name: 'Josh' },
    update: { passwordHash: hash },
  });
  console.log(`✓ Admin password reset for ${ADMIN_EMAIL}`);
  console.log(`  Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => { console.error('❌ Reseed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
