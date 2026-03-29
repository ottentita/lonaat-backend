"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = __importDefault(require("../src/prisma"));
const aiEngine_1 = __importDefault(require("../src/ai/aiEngine"));
const aiTypes_1 = require("../src/ai/aiTypes");
let proPlan = null;
let proUser = null;
(0, vitest_1.beforeAll)(async () => {
    // ensure clean
    await prisma_1.default.adTokenWallet.deleteMany({ where: { user: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } } });
    await prisma_1.default.subscription.deleteMany({ where: { user: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } } });
    await prisma_1.default.user.deleteMany({ where: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } });
    await prisma_1.default.plan.deleteMany({ where: { name: { in: ['pro'] } } });
    proPlan = await prisma_1.default.plan.create({ data: { name: 'pro', price: 100, monthlyTokens: 1000 } });
    proUser = await prisma_1.default.user.create({ data: { email: 'video-pro@example.com', password: 'x', balance: 0 } });
    await prisma_1.default.subscription.create({ data: { userId: proUser.id, planId: proPlan.id, status: 'active', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
    await prisma_1.default.adTokenWallet.create({ data: { userId: proUser.id, balance: 1000 } });
    // low-balance user
    const low = await prisma_1.default.user.create({ data: { email: 'video-lowbal@example.com', password: 'x', balance: 0 } });
    await prisma_1.default.subscription.create({ data: { userId: low.id, planId: proPlan.id, status: 'active', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
    await prisma_1.default.adTokenWallet.create({ data: { userId: low.id, balance: 5 } });
});
(0, vitest_1.afterAll)(async () => {
    await prisma_1.default.adTokenWallet.deleteMany({ where: { user: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } } });
    await prisma_1.default.subscription.deleteMany({ where: { user: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } } });
    await prisma_1.default.user.deleteMany({ where: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } });
    await prisma_1.default.plan.deleteMany({ where: { name: 'pro' } });
    await prisma_1.default.$disconnect();
});
(0, vitest_1.describe)('VIDEO_GENERATION dynamic token costs', () => {
    (0, vitest_1.it)('10s 720p standard => 10 tokens (dry-run)', async () => {
        const res = await aiEngine_1.default.executeAI({ action: aiTypes_1.AIActionType.VIDEO_GENERATION, payload: { durationSeconds: 10, resolution: '720p', modelTier: 'standard' }, dry: true }, proUser.id);
        (0, vitest_1.expect)(res).toBeDefined();
        (0, vitest_1.expect)(res.success).toBe(true);
        (0, vitest_1.expect)(res.tokensUsed).toBe(10);
        (0, vitest_1.expect)(res.simulated).toBe(true);
    });
    (0, vitest_1.it)('20s 1080p high => computed tokens (dry-run)', async () => {
        const res = await aiEngine_1.default.executeAI({ action: aiTypes_1.AIActionType.VIDEO_GENERATION, payload: { durationSeconds: 20, resolution: '1080p', modelTier: 'high' }, dry: true }, proUser.id);
        // calculation: (20/10)*10 = 20; 1080p x1.5 => 30; high x1.4 => 42 => ceil(42)=42
        (0, vitest_1.expect)(res).toBeDefined();
        (0, vitest_1.expect)(res.success).toBe(true);
        (0, vitest_1.expect)(res.tokensUsed).toBe(42);
        (0, vitest_1.expect)(res.simulated).toBe(true);
    });
    (0, vitest_1.it)('rejects when insufficient balance (non-dry)', async () => {
        const low = await prisma_1.default.user.findUnique({ where: { email: 'video-lowbal@example.com' } });
        const res = await aiEngine_1.default.executeAI({ action: aiTypes_1.AIActionType.VIDEO_GENERATION, payload: { durationSeconds: 10, resolution: '720p', modelTier: 'standard' }, dry: false }, low.id);
        (0, vitest_1.expect)(res).toBeDefined();
        (0, vitest_1.expect)(res.success).toBe(false);
        (0, vitest_1.expect)((res.error || '').toLowerCase()).toContain('insufficient');
    });
});
