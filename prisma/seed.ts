import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean handoff: keep one admin account, remove all seeded app data.
  await prisma.job.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClientAccount" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "customerId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('DELETE FROM "ClientAccount"');
  await prisma.admin.deleteMany({ where: { email: { not: "admin@example.com" } } });

  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@example.com" },
    update: {
      password: adminPassword,
      name: "JTN Admin",
    },
    create: {
      email: "admin@example.com",
      password: adminPassword,
      name: "JTN Admin",
    },
  });

  console.log("Seed complete.");
  console.log("Admin login:", admin.email);
  console.log("No demo workers/customers/jobs/share links were created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
