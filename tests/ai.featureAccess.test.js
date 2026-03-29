"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = __importDefault(require("../src/prisma"));
const aiEngine_1 = __importDefault(require("../src/ai/aiEngine"));
const aiTypes_1 = require("../src/ai/aiTypes");
let trialUser = null;
let basicUser = null;
let proUser = null;
let basicPlan = null;
let proPlan = null;
(0, vitest_1.beforeAll)(async () => {
    // ensure previous runs cleaned up
    await prisma_1.default.adTokenWallet.deleteMany({ where: { user: { email: { in: ['ai-trial-test@example.com', 'ai-basic-test@example.com', 'ai-pro-test@example.com'] } } } });
    await prisma_1.default.subscription.deleteMany({ where: { user: { email: { in: ['ai-trial-test@example.com', 'ai-basic-test@example.com', 'ai-pro-test@example.com'] } } } });
    await prisma_1.default.user.deleteMany({ where: { email: { in: ['ai-trial-test@example.com', 'ai-basic-test@example.com', 'ai-pro-test@example.com'] } } });
    // create or get plan fixtures
    basicPlan = (await prisma_1.default.plan.findFirst({ where: { name: 'basic' } })) || (await prisma_1.default.plan.create({ data: { name: 'basic', price: 0, monthlyTokens: 100 } }));
    proPlan = (await prisma_1.default.plan.findFirst({ where: { name: 'pro' } })) || (await prisma_1.default.plan.create({ data: { name: 'pro', price: 100, monthlyTokens: 1000 } }));
    // helper to find-or-create user
    async function findOrCreateUser(email, balance) {
        const existing = await prisma_1.default.user.findUnique({ where: { email } });
        if (existing)
            return existing;
        return prisma_1.default.user.create({ data: { email, password: 'x', balance } });
    }
    // create or reuse test users (use `balance` per current schema)
    trialUser = await findOrCreateUser('ai-trial-test@example.com', 0);
    basicUser = await findOrCreateUser('ai-basic-test@example.com', 200);
    proUser = await findOrCreateUser('ai-pro-test@example.com', 1000);
    // attach subscriptions for basic and pro users if not present
    const basicSub = await prisma_1.default.subscription.findFirst({ where: { userId: basicUser.id, planId: basicPlan.id } });
    if (!basicSub)
        await prisma_1.default.subscription.create({ data: { userId: basicUser.id, planId: basicPlan.id, status: 'active', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
    const proSub = await prisma_1.default.subscription.findFirst({ where: { userId: proUser.id, planId: proPlan.id } });
    if (!proSub)
        await prisma_1.default.subscription.create({ data: { userId: proUser.id, planId: proPlan.id, status: 'active', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
    // ensure ad token wallets exist and have balances
    const basicWallet = await prisma_1.default.adTokenWallet.findUnique({ where: { userId: basicUser.id } });
    if (!basicWallet)
        await prisma_1.default.adTokenWallet.create({ data: { userId: basicUser.id, balance: 200 } });
    const proWallet = await prisma_1.default.adTokenWallet.findUnique({ where: { userId: proUser.id } });
    if (!proWallet)
        await prisma_1.default.adTokenWallet.create({ data: { userId: proUser.id, balance: 1000 } });
    // fixtures created above (idempotent)
});
(0, vitest_1.afterAll)(async () => {
    // cleanup only the records we created if they still exist
    await prisma_1.default.subscription.deleteMany({ where: { userId: { in: [basicUser?.id, proUser?.id].filter(Boolean) } } });
    await prisma_1.default.adTokenWallet.deleteMany({ where: { userId: { in: [basicUser?.id, proUser?.id].filter(Boolean) } } });
    await prisma_1.default.user.deleteMany({ where: { email: { in: ['ai-trial-test@example.com', 'ai-basic-test@example.com', 'ai-pro-test@example.com'] } } });
    await prisma_1.default.plan.deleteMany({ where: { name: { in: ['basic', 'pro'] } } });
    await prisma_1.default.$disconnect();
});
(0, vitest_1.describe)('Feature access control', () => {
    (0, vitest_1.it)('denies trial users from IMAGE_ANALYSIS', async () => {
        const res = await aiEngine_1.default.executeAI({ action: aiTypes_1.AIActionType.IMAGE_ANALYSIS, payload: {}, dry: true }, trialUser.id);
        (0, vitest_1.expect)(res).toBeDefined();
        (0, vitest_1.expect)(res.success).toBe(false);
        (0, vitest_1.expect)(res.requiredPlan).toBe('basic');
    });
    (0, vitest_1.it)('denies basic users from VIDEO_GENERATION', async () => {
        const res = await aiEngine_1.default.executeAI({ action: aiTypes_1.AIActionType.VIDEO_GENERATION, payload: {}, dry: true }, basicUser.id);
        (0, vitest_1.expect)(res).toBeDefined();
        (0, vitest_1.expect)(res.success).toBe(false);
        (0, vitest_1.expect)(res.requiredPlan).toBe('pro');
    });
    (0, vitest_1.it)('allows pro users to run VIDEO_GENERATION', async () => {
        const res = await aiEngine_1.default.executeAI({ action: aiTypes_1.AIActionType.VIDEO_GENERATION, payload: {}, dry: true }, proUser.id);
        (0, vitest_1.expect)(res).toBeDefined();
        (0, vitest_1.expect)(res.success).toBe(true);
        (0, vitest_1.expect)(res.tokensUsed).toBeGreaterThanOrEqual(1);
    });
});
