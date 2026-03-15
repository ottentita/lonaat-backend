// prisma client loaded lazily to avoid startup work during module import
async function getPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: prisma } = await import('../../prisma')
  return prisma
}

export async function logTokenTransaction(userId: number, amount: number, type: 'credit' | 'debit', reason: string) {
  const prisma = await getPrisma()
  return prisma.tokenTransaction.create({ data: { userId, amount, type, reason } })
}

export default { logTokenTransaction }
