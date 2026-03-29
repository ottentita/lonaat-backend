"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const src_1 = __importDefault(require("../../src"));
const prisma_1 = __importDefault(require("../../src/prisma"));
const vitest_1 = require("vitest");
const db = prisma_1.default;
vitest_1.describe.skip('Payment webhook handler', () => {
    let user;
    let plan;
    (0, vitest_1.beforeAll)(async () => {
        // create a test user and plan
        user = await db.user.create({ data: { email: `webhook${Date.now()}@example.com`, password: 'foo', role: 'user' } });
        plan = await db.plan.create({ data: { name: 'Test Plan', price: 10, monthlyTokens: 5 } });
    });
    (0, vitest_1.it)('should process webhook idempotently and mint tokens', async () => {
        const payload = {
            provider: 'stripe',
            providerRef: 'evt_12345',
            userId: String(user.id),
            planId: String(plan.id)
        };
        // first call
        const res1 = await (0, supertest_1.default)(src_1.default).post('/api/payments/webhook').send(payload).expect(200);
        (0, vitest_1.expect)(res1.body).toEqual({ status: 'ok' });
        const events = await db.paymentEvent.findMany({ where: { providerRef: 'evt_12345' } });
        (0, vitest_1.expect)(events.length).toBe(1);
        const subs = await db.subscription.findMany({ where: { userId: user.id, planId: plan.id } });
        (0, vitest_1.expect)(subs.length).toBe(1);
        const wallet = await db.adTokenWallet.findUnique({ where: { userId: user.id } });
        (0, vitest_1.expect)(wallet).toBeDefined();
        (0, vitest_1.expect)(wallet.balance).toBe(plan.monthlyTokens);
        // second call should be a no-op
        const res2 = await (0, supertest_1.default)(src_1.default).post('/api/payments/webhook').send(payload).expect(200);
        (0, vitest_1.expect)(res2.body).toEqual({ status: 'ok' });
        const events2 = await db.paymentEvent.findMany({ where: { providerRef: 'evt_12345' } });
        (0, vitest_1.expect)(events2.length).toBe(1);
        const wallet2 = await db.adTokenWallet.findUnique({ where: { userId: user.id } });
        (0, vitest_1.expect)(wallet2.balance).toBe(plan.monthlyTokens); // unchanged
    });
});
