import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "titasembi@gmail.com";
  const password = "Far@el11";

  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  if (existingAdmin) {
    await prisma.user.update({
      where: { email },
      data: {
        password_hash: passwordHash,
        role: "ADMIN",
        is_admin: true,
      },
    });

    console.log("Admin updated successfully");
    return;
  }

  await prisma.user.create({
    data: {
      name: "Admin",
      email,
      password_hash: passwordHash,
      role: "ADMIN",
      is_admin: true,
      referral_code: "ADMIN001",
    },
  });

  console.log("Admin created successfully");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
