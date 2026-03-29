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

  // Seed sample affiliate products
  const sampleProducts = [
    {
      name: "Premium Fitness Tracker Pro",
      price: 79.99,
      category: "Electronics",
      image_url: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400",
      affiliate_link: "https://example.com/fitness-tracker",
      network: "demo",
      description: "Advanced fitness tracker with heart rate monitoring and GPS",
    },
    {
      name: "Wireless Noise-Canceling Headphones",
      price: 149.99,
      category: "Electronics",
      image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      affiliate_link: "https://example.com/headphones",
      network: "demo",
      description: "Premium noise-canceling headphones with 30-hour battery life",
    },
    {
      name: "Smart Home Security Camera",
      price: 89.99,
      category: "Smart Home",
      image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
      affiliate_link: "https://example.com/camera",
      network: "demo",
      description: "HD security camera with night vision and mobile alerts",
    },
    {
      name: "Portable Power Bank 20000mAh",
      price: 39.99,
      category: "Electronics",
      image_url: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400",
      affiliate_link: "https://example.com/powerbank",
      network: "demo",
      description: "High-capacity power bank with fast charging support",
    },
    {
      name: "Professional Blender Set",
      price: 129.99,
      category: "Kitchen",
      image_url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400",
      affiliate_link: "https://example.com/blender",
      network: "demo",
      description: "Professional-grade blender with multiple speed settings",
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { affiliate_link: product.affiliate_link },
      update: {},
      create: {
        ...product,
        is_active: true,
        extra_data: {
          commission_rate: 0.15,
          currency: "USD",
        },
      },
    });
  }

  console.log("✅ Seed users created:");
  console.log("Admin → admin@lonaat.com / Admin123!");
  console.log("User  → user@lonaat.com / User123!");
  console.log(`✅ Created ${sampleProducts.length} sample products`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
