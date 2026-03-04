import bcrypt from "bcryptjs";
import prisma from "../src/prisma";

async function main() {
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const userPassword = await bcrypt.hash("User123!", 10);

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@lonaat.com" },
    update: {},
    create: {
      email: "admin@lonaat.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Normal User
  await prisma.user.upsert({
    where: { email: "user@lonaat.com" },
    update: {},
    create: {
      email: "user@lonaat.com",
      password: userPassword,
      role: "USER",
    },
  });

  console.log("✅ Seed users created:");
  console.log("Admin → admin@lonaat.com / Admin123!");
  console.log("User  → user@lonaat.com / User123!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
