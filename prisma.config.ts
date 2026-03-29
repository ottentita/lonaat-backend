import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "backend-node/prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL
  }
})
