import { prisma } from "../prisma";

export async function allocateMonthlyTokens() {
  const users = await prisma.user.findMany({ include: { planRef: true } });

  for (const user of users) {
    if (user.planRef) {
      await prisma.user.update({ where: { id: user.id }, data: { tokenBalance: user.planRef.monthlyTokens } });
    }
  }
}
