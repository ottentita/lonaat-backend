import dotenv from 'dotenv'
import path from 'path'

// Load test env when running tests
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') })
}

let prismaClient: any
if (process.env.NODE_ENV === 'test') {
  // use test-generated Prisma client to avoid colliding with dev client
  // path: backend-node/node_modules/.prisma-test/client
  // require used to avoid TS compile-time binding
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('../node_modules/.prisma-test/client')
  prismaClient = new PrismaClient()
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client')
  prismaClient = new PrismaClient()
}

export const prisma = prismaClient
export default prismaClient
