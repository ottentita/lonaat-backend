// lazy require prisma to avoid DB client on import
async function getPrisma() {
  const { default: prisma } = await import('../../prisma')
  return prisma
}
import { logTokenTransaction } from './tokenTransaction.service'

export async function getWallet(userId: number) {
  const prisma = await getPrisma()
  return prisma.adTokenWallet.findUnique({ where: { userId } })
}

export async function upsertWallet(userId: number) {
  const prisma = await getPrisma()
  return prisma.adTokenWallet.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {}
  })
}

export async function creditTokensTransactional(prismaTx: any, userId: number, amount: number, reason = 'subscription_credit') {
  // called inside a transaction
  const wallet = await prismaTx.adTokenWallet.upsert({ where: { userId }, create: { userId, balance: 0 }, update: {} })
  await prismaTx.adTokenWallet.update({ where: { userId }, data: { balance: { increment: amount } } })
  await prismaTx.tokenTransaction.create({ data: { userId, amount, type: 'credit', reason } })
  const updatedWallet = await prismaTx.adTokenWallet.findUnique({ where: { userId } })
  return updatedWallet!.balance
}

export async function debitTokensTransactional(prismaTx: any, userId: number, amount: number, reason = 'campaign_spend') {
  const wallet = await prismaTx.adTokenWallet.findUnique({ where: { userId } })
  if (!wallet) throw new Error('No token wallet')
  if (wallet.balance - amount < 0) throw new Error('Insufficient tokens')
  await prismaTx.adTokenWallet.update({ where: { userId }, data: { balance: { decrement: amount } } })
  await prismaTx.tokenTransaction.create({ data: { userId, amount, type: 'debit', reason } })
  const updatedWallet = await prismaTx.adTokenWallet.findUnique({ where: { userId } })
  return updatedWallet!.balance
}

export default { getWallet, upsertWallet, creditTokensTransactional, debitTokensTransactional }
