import { prisma } from "../prisma";

export async function createPayment(data: any) {
  // map incoming `reference` to existing `transactionId` for compatibility
  const payload = { ...data } as any;
  if (data.reference && !data.transactionId) payload.transactionId = data.reference;
  // remove legacy `reference` field so Prisma doesn't reject unknown fields
  if (payload.reference) delete payload.reference;
  try {
    return await prisma.payment.create({ data: payload });
  } catch (err) {
    console.error('payment.service.createPayment error:', err);
    throw err;
  }
}

export async function confirmPayment(reference: string) {
  // update by transactionId (existing unique field in schema)
  return prisma.payment.update({
    where: { transactionId: reference },
    data: { status: "CONFIRMED" }
  });
}

export default { createPayment, confirmPayment }
