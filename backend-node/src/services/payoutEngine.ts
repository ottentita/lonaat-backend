import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const SUPPORTED_CURRENCIES = [
  "USD",
  "XAF",
  "EUR",
  "USDT",
  "BTC",
  "ETH",
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const PAYOUT_PROVIDERS: Record<
  string,
  {
    name: string;
    currencies: string[];
    minAmount: number;
    fee: number;
    countries?: string[];
  }
> = {
  payoneer: {
    name: "Payoneer",
    currencies: ["USD", "EUR"],
    minAmount: 20,
    fee: 2,
  },
  mtn_momo: {
    name: "MTN Mobile Money",
    currencies: ["XAF"],
    minAmount: 5000,
    fee: 1.5,
    countries: ["CM", "CI", "SN", "GH"],
  },
  orangemoney: {
    name: "Orange Money",
    currencies: ["XAF"],
    minAmount: 5000,
    fee: 1.5,
    countries: ["CM", "CI", "SN", "ML"],
  },
  usdt_trc20: {
    name: "USDT (TRC20)",
    currencies: ["USDT"],
    minAmount: 10,
    fee: 1,
  },
  usdt_erc20: {
    name: "USDT (ERC20)",
    currencies: ["USDT"],
    minAmount: 50,
    fee: 5,
  },
  btc: { name: "Bitcoin", currencies: ["BTC"], minAmount: 0.001, fee: 0.0001 },
  eth: { name: "Ethereum", currencies: ["ETH"], minAmount: 0.01, fee: 0.005 },
  bank_transfer: {
    name: "Bank Transfer",
    currencies: ["USD", "EUR", "XAF"],
    minAmount: 50,
    fee: 5,
  },
};

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  XAF: 600,
  USDT: 1,
  BTC: 42000,
  ETH: 2500,
};

export interface PayoutRequest {
  userId: number;
  payoutMethodId: number;
  amount: number;
  currency: SupportedCurrency;
  notes?: string;
}

export interface PayoutResult {
  success: boolean;
  payoutId?: number;
  error?: string;
  fraudScore?: number;
  requiresApproval: boolean;
}

export interface FraudCheckResult {
  score: number;
  flags: string[];
  blocked: boolean;
  reason?: string;
}

export async function getWalletBalance(
  userId: number,
  currency: SupportedCurrency,
): Promise<number> {
  const balance = await prisma.walletBalance.findUnique({
    where: { user_id_currency: { user_id: userId, currency } },
  });
  return balance ? Number(balance.balance) : 0;
}

export async function getAllWalletBalances(
  userId: number,
): Promise<
  Record<
    SupportedCurrency,
    { balance: number; pending: number; locked: number }
  >
> {
  const balances = await prisma.walletBalance.findMany({
    where: { user_id: userId },
  });

  const result: Record<
    string,
    { balance: number; pending: number; locked: number }
  > = {};
  for (const currency of SUPPORTED_CURRENCIES) {
    const found = balances.find((b) => b.currency === currency);
    result[currency] = {
      balance: found ? Number(found.balance) : 0,
      pending: found ? Number(found.pending) : 0,
      locked: found ? Number(found.locked) : 0,
    };
  }
  return result as Record<
    SupportedCurrency,
    { balance: number; pending: number; locked: number }
  >;
}

export async function addToWalletBalance(
  userId: number,
  currency: SupportedCurrency,
  amount: number,
  type: "balance" | "pending" = "balance",
): Promise<void> {
  const updateData =
    type === "balance"
      ? { balance: { increment: amount } }
      : { pending: { increment: amount } };

  await prisma.walletBalance.upsert({
    where: { user_id_currency: { user_id: userId, currency } },
    create: { user_id: userId, currency, [type]: amount },
    update: updateData,
  });
}

export async function lockBalance(
  userId: number,
  currency: SupportedCurrency,
  amount: number,
): Promise<boolean> {
  const balance = await prisma.walletBalance.findUnique({
    where: { user_id_currency: { user_id: userId, currency } },
  });

  if (!balance || Number(balance.balance) < amount) {
    return false;
  }

  await prisma.walletBalance.update({
    where: { user_id_currency: { user_id: userId, currency } },
    data: {
      balance: { decrement: amount },
      locked: { increment: amount },
    },
  });

  return true;
}

export async function unlockBalance(
  userId: number,
  currency: SupportedCurrency,
  amount: number,
): Promise<void> {
  await prisma.walletBalance.update({
    where: { user_id_currency: { user_id: userId, currency } },
    data: {
      balance: { increment: amount },
      locked: { decrement: amount },
    },
  });
}

export async function deductLockedBalance(
  userId: number,
  currency: SupportedCurrency,
  amount: number,
): Promise<void> {
  await prisma.walletBalance.update({
    where: { user_id_currency: { user_id: userId, currency } },
    data: {
      locked: { decrement: amount },
    },
  });
}

export function convertToUSD(
  amount: number,
  currency: SupportedCurrency,
): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return amount * rate;
}

export function convertFromUSD(
  amountUSD: number,
  currency: SupportedCurrency,
): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return amountUSD / rate;
}

export async function runFraudCheck(
  userId: number,
  amount: number,
  currency: SupportedCurrency,
): Promise<FraudCheckResult> {
  const flags: string[] = [];
  let score = 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fraud_score: true, created_at: true, is_blocked: true },
  });

  if (!user) {
    return {
      score: 100,
      flags: ["user_not_found"],
      blocked: true,
      reason: "User not found",
    };
  }

  if (user.is_blocked) {
    return {
      score: 100,
      flags: ["user_blocked"],
      blocked: true,
      reason: "Account is blocked",
    };
  }

  score += user.fraud_score || 0;
  if (user.fraud_score > 50) {
    flags.push("high_fraud_score");
  }

  const accountAgeHours =
    (Date.now() - user.created_at.getTime()) / (1000 * 60 * 60);
  if (accountAgeHours < 24) {
    score += 30;
    flags.push("new_account");
  } else if (accountAgeHours < 168) {
    score += 15;
    flags.push("young_account");
  }

  const amountUSD = convertToUSD(amount, currency);
  if (amountUSD > 1000) {
    score += 20;
    flags.push("large_withdrawal");
  }
  if (amountUSD > 5000) {
    score += 30;
    flags.push("very_large_withdrawal");
  }

  const recentPayouts = await prisma.payout.count({
    where: {
      user_id: userId,
      created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (recentPayouts >= 3) {
    score += 25;
    flags.push("multiple_payouts_24h");
  }

  const failedPayouts = await prisma.payout.count({
    where: {
      user_id: userId,
      status: "failed",
      created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  if (failedPayouts >= 2) {
    score += 20;
    flags.push("recent_failed_payouts");
  }

  const payoutMethods = await prisma.payoutMethod.count({
    where: { user_id: userId },
  });

  if (payoutMethods > 5) {
    score += 15;
    flags.push("many_payout_methods");
  }

  return {
    score: Math.min(score, 100),
    flags,
    blocked: score >= 80,
    reason: score >= 80 ? "High fraud risk detected" : undefined,
  };
}

export function getProviderFromMethod(method: any): string {
  switch (method.method_type) {
    case "payoneer":
      return "payoneer";
    case "mobile_money":
      return method.mobile_network === "mtn_momo" ? "mtn_momo" : "orange_money";
    case "usdt":
      return method.usdt_network === "trc20" ? "usdt_trc20" : "usdt_erc20";
    case "btc":
      return "btc";
    case "eth":
      return "eth";
    case "bank_transfer":
      return "bank_transfer";
    default:
      return "unknown";
  }
}

export async function createPayout(
  request: PayoutRequest,
): Promise<PayoutResult> {
  const { userId, payoutMethodId, amount, currency, notes } = request;

  const payoutMethod = await prisma.payoutMethod.findFirst({
    where: { id: payoutMethodId, user_id: userId },
  });

  if (!payoutMethod) {
    return {
      success: false,
      error: "Payout method not found",
      requiresApproval: false,
    };
  }

  if (!payoutMethod.is_verified) {
    return {
      success: false,
      error: "Payout method not verified",
      requiresApproval: false,
    };
  }

  const balance = await getWalletBalance(userId, currency);
  if (balance < amount) {
    return {
      success: false,
      error: "Insufficient balance",
      requiresApproval: false,
    };
  }

  const provider = getProviderFromMethod(payoutMethod);
  const providerConfig =
    PAYOUT_PROVIDERS[provider as keyof typeof PAYOUT_PROVIDERS];

  if (!providerConfig) {
    return {
      success: false,
      error: "Unknown payout provider",
      requiresApproval: false,
    };
  }

  if (!providerConfig.currencies.includes(currency)) {
    return {
      success: false,
      error: `${providerConfig.name} does not support ${currency}. Supported: ${providerConfig.currencies.join(", ")}`,
      requiresApproval: false,
    };
  }

  if (amount < providerConfig.minAmount) {
    return {
      success: false,
      error: `Minimum payout for ${providerConfig.name} is ${providerConfig.minAmount} ${currency}`,
      requiresApproval: false,
    };
  }

  const fraudCheck = await runFraudCheck(userId, amount, currency);

  if (fraudCheck.blocked) {
    return {
      success: false,
      error: fraudCheck.reason || "Payout blocked due to fraud risk",
      fraudScore: fraudCheck.score,
      requiresApproval: false,
    };
  }

  const locked = await lockBalance(userId, currency, amount);
  if (!locked) {
    return {
      success: false,
      error: "Failed to lock balance",
      requiresApproval: false,
    };
  }

  const amountInUSD = convertToUSD(amount, currency);
  const requiresApproval = fraudCheck.score >= 30 || amountInUSD >= 500;

  try {
    const payout = await prisma.payout.create({
      data: {
        user_id: userId,
        payout_method_id: payoutMethodId,
        amount: new Prisma.Decimal(amount),
        currency,
        amount_in_usd: new Prisma.Decimal(amountInUSD),
        provider,
        provider_fee: providerConfig
          ? new Prisma.Decimal(providerConfig.fee)
          : null,
        status: requiresApproval ? "pending" : "approved",
        fraud_score: fraudCheck.score,
        fraud_flags: fraudCheck.flags,
        fraud_cleared: fraudCheck.score < 30,
        notes,
        approved_at: requiresApproval ? null : new Date(),
      },
    });

    return {
      success: true,
      payoutId: payout.id,
      fraudScore: fraudCheck.score,
      requiresApproval,
    };
  } catch (error: any) {
    await unlockBalance(userId, currency, amount);
    return { success: false, error: error.message, requiresApproval: false };
  }
}

export async function approvePayout(
  payoutId: number,
  adminId: number,
  adminName: string,
): Promise<{ success: boolean; error?: string }> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    return { success: false, error: "Payout not found" };
  }

  if (payout.status !== "pending") {
    return {
      success: false,
      error: `Cannot approve payout with status: ${payout.status}`,
    };
  }

  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "approved",
      approved_at: new Date(),
      approved_by: adminId,
      approved_by_name: adminName,
      fraud_cleared: true,
      fraud_cleared_by: adminId,
    },
  });

  return { success: true };
}

export async function rejectPayout(
  payoutId: number,
  adminId: number,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    return { success: false, error: "Payout not found" };
  }

  if (payout.status !== "pending") {
    return {
      success: false,
      error: `Cannot reject payout with status: ${payout.status}`,
    };
  }

  await unlockBalance(
    payout.user_id,
    payout.currency as SupportedCurrency,
    Number(payout.amount),
  );

  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "cancelled",
      failure_reason: reason,
      failed_at: new Date(),
      admin_notes: `Rejected by admin ${adminId}: ${reason}`,
    },
  });

  return { success: true };
}

export async function processPayout(
  payoutId: number,
): Promise<{ success: boolean; providerRef?: string; error?: string }> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { payout_method: true },
  });

  if (!payout) {
    return { success: false, error: "Payout not found" };
  }

  if (payout.status !== "approved") {
    return {
      success: false,
      error: `Cannot process payout with status: ${payout.status}`,
    };
  }

  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "processing", processed_at: new Date() },
  });

  try {
    let providerRef: string;

    switch (payout.provider) {
      case "payoneer":
        providerRef = await processPayoneerPayout(payout);
        break;
      case "mtn_momo":
      case "orange_money":
        providerRef = await processMobileMoneyPayout(payout);
        break;
      case "usdt_trc20":
      case "usdt_erc20":
      case "btc":
      case "eth":
        providerRef = await processCryptoPayout(payout);
        break;
      case "bank_transfer":
        providerRef = await processBankTransferPayout(payout);
        break;
      default:
        throw new Error(`Unsupported provider: ${payout.provider}`);
    }

    await deductLockedBalance(
      payout.user_id,
      payout.currency as SupportedCurrency,
      Number(payout.amount),
    );

    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: "completed",
        completed_at: new Date(),
        provider_ref: providerRef,
      },
    });

    return { success: true, providerRef };
  } catch (error: any) {
    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: "failed",
        failed_at: new Date(),
        failure_reason: error.message,
      },
    });

    return { success: false, error: error.message };
  }
}

async function processPayoneerPayout(payout: any): Promise<string> {
  console.log(
    `Processing Payoneer payout: ${payout.id}, Amount: ${payout.amount} ${payout.currency}`,
  );
  return `PAYO_${Date.now()}_${payout.id}`;
}

async function processMobileMoneyPayout(payout: any): Promise<string> {
  const method = payout.payout_method;
  console.log(
    `Processing ${payout.provider} payout to ${method.mobile_number}`,
  );
  return `MOMO_${Date.now()}_${payout.id}`;
}

async function processCryptoPayout(payout: any): Promise<string> {
  const method = payout.payout_method;
  let address = "";

  switch (payout.provider) {
    case "usdt_trc20":
    case "usdt_erc20":
      address = method.usdt_address;
      break;
    case "btc":
      address = method.btc_address;
      break;
    case "eth":
      address = method.eth_address;
      break;
  }

  console.log(`Processing ${payout.provider} payout to ${address}`);
  return `CRYPTO_${Date.now()}_${payout.id}`;
}

async function processBankTransferPayout(payout: any): Promise<string> {
  console.log(`Processing bank transfer payout: ${payout.id}`);
  return `BANK_${Date.now()}_${payout.id}`;
}

export async function getPayoutHistory(
  userId: number,
  options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<any[]> {
  const { status, limit = 50, offset = 0 } = options;

  const where: any = { user_id: userId };
  if (status) {
    where.status = status;
  }

  const payouts = await prisma.payout.findMany({
    where,
    include: {
      payout_method: {
        select: {
          method_type: true,
          mobile_network: true,
          payoneer_email: true,
          usdt_network: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: limit,
    skip: offset,
  });

  return payouts.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    currency: p.currency,
    amount_in_usd: p.amount_in_usd ? Number(p.amount_in_usd) : null,
    provider: p.provider,
    provider_ref: p.provider_ref,
    status: p.status,
    fraud_score: p.fraud_score,
    created_at: p.created_at,
    approved_at: p.approved_at,
    completed_at: p.completed_at,
    failed_at: p.failed_at,
    failure_reason: p.failure_reason,
    method: p.payout_method,
  }));
}

export async function getPayoutStats(userId: number): Promise<{
  total_payouts: number;
  total_amount_usd: number;
  pending_count: number;
  pending_amount_usd: number;
  completed_count: number;
  completed_amount_usd: number;
}> {
  const payouts = await prisma.payout.findMany({
    where: { user_id: userId },
    select: { status: true, amount_in_usd: true },
  });

  let total_payouts = 0;
  let total_amount_usd = 0;
  let pending_count = 0;
  let pending_amount_usd = 0;
  let completed_count = 0;
  let completed_amount_usd = 0;

  for (const p of payouts) {
    total_payouts++;
    const amountUSD = p.amount_in_usd ? Number(p.amount_in_usd) : 0;
    total_amount_usd += amountUSD;

    if (
      p.status === "pending" ||
      p.status === "approved" ||
      p.status === "processing"
    ) {
      pending_count++;
      pending_amount_usd += amountUSD;
    } else if (p.status === "completed") {
      completed_count++;
      completed_amount_usd += amountUSD;
    }
  }

  return {
    total_payouts,
    total_amount_usd,
    pending_count,
    pending_amount_usd,
    completed_count,
    completed_amount_usd,
  };
}

export async function getPendingPayoutsForAdmin(
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<any[]> {
  const { limit = 50, offset = 0 } = options;

  const payouts = await prisma.payout.findMany({
    where: { status: "pending" },
    include: {
      user: {
        select: { id: true, name: true, email: true, fraud_score: true },
      },
      payout_method: true,
    },
    orderBy: { created_at: "asc" },
    take: limit,
    skip: offset,
  });

  return payouts;
}
