import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "titasembi@gmail.com";
  const plainPassword = "Far@el11";

  // Hash password using bcryptjs
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    // Update existing admin
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: "admin",
        isActive: true,
      },
    });

    console.log("✅ Admin user updated successfully");
    return;
  }

  // Create new admin user
  await prisma.user.create({
    data: {
      name: "Admin",
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    },
  });

  console.log("✅ Admin user created successfully");
}

main()
  .catch((e) => {
    console.error("❌ Admin seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
