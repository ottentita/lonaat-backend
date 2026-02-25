import dotenv from 'dotenv'
import path from 'path'

// Load test env when running tests
if (process.env.NODE_ENV === 'test') {
	dotenv.config({ path: path.resolve(__dirname, '../.env.test') })
}

let prisma: any
if (process.env.NODE_ENV === 'test') {
	// use test-generated Prisma client to avoid colliding with dev client
	// path: backend-node/node_modules/.prisma-test/client
	// require used to avoid TS compile-time binding
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { PrismaClient } = require('../node_modules/.prisma-test/client')
	prisma = new PrismaClient()
} else {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { PrismaClient } = require('@prisma/client')
	prisma = new PrismaClient()
}

export default prisma
