// Minimal test seed that uses the generated test Prisma client (created by test setup)
async function run() {
	try {
		const { PrismaClient } = require('./node_modules/.prisma-test/client')
		const prisma = new PrismaClient()
		// create a minimal admin user if not exists
		try {
			const existing = await prisma.user.findUnique({ where: { email: 'test-admin@local' } })
			if (!existing) {
				await prisma.user.create({ data: { name: 'Test Admin', email: 'test-admin@local', password: 'test', role: 'ADMIN', balance: 0 } })
			}
		} catch (e) {
			// ignore if users table doesn't exist yet
		}
		await prisma.$disconnect()
	} catch (e) {
		console.error('Error running test seed:', e)
		process.exit(1)
	}
}
run()
