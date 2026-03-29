"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const subscription_service_1 = __importDefault(require("../../src/modules/ads/subscription.service"));
const adEngine_service_1 = __importDefault(require("../../src/modules/ads/adEngine.service"));
const prisma_1 = __importDefault(require("../../src/prisma"));
const db = prisma_1.default;
vitest_1.describe.skip('Ads integration (sqlite)', () => {
    let user;
    let plan;
    let campaign;
    (0, vitest_1.beforeAll)(async () => {
        // fetch seeded user/plan created in global setup
        user = await db.user.findFirst({ where: { email: 'testuser@example.com' } });
        plan = await db.plan.findFirst({ where: { name: 'Test Plan' } });
    });
    (0, vitest_1.it)('credits tokens after activating subscription', async () => {
        const res = await subscription_service_1.default.activateSubscription(user.id, plan.id, 1);
        (0, vitest_1.expect)(res).toBeDefined();
        const wallet = await db.adTokenWallet.findUnique({ where: { userId: user.id } });
        (0, vitest_1.expect)(wallet).toBeDefined();
        (0, vitest_1.expect)(wallet.balance).toBe(Number(plan.monthlyTokens));
    });
    (0, vitest_1.it)('deducts tokens on ad click and auto-pauses when zero', async () => {
        // ensure wallet has small balance
        await db.adTokenWallet.update({ where: { userId: user.id }, data: { balance: 2 } });
        // create campaign
        campaign = await db.adCampaign.create({ data: { userId: user.id, dailyBudget: 10 } });
        // first click should succeed and reduce balance to 0 and pause campaign
        const r1 = await adEngine_service_1.default.processAdClick(campaign.id, '127.0.0.1', false);
        (0, vitest_1.expect)(r1).toBeDefined();
        const walletAfter = await db.adTokenWallet.findUnique({ where: { userId: user.id } });
        (0, vitest_1.expect)(walletAfter.balance).toBe(0);
        const camp = await db.adCampaign.findUnique({ where: { id: campaign.id } });
        (0, vitest_1.expect)(camp.status).toBe('paused');
    });
    vitest_1.it.skip('prevents negative balance and blocks rapid repeat clicks', async () => {
        // top up wallet a bit and unpause campaign
        await db.adTokenWallet.update({ where: { userId: user.id }, data: { balance: 4 } });
        await db.adCampaign.update({ where: { id: campaign.id }, data: { status: 'active' } });
        // first click: should deduct
        await adEngine_service_1.default.processAdClick(campaign.id, '10.0.0.1', false);
        // immediate second click from same IP should be blocked by fraud check
        let threw = false;
        try {
            await adEngine_service_1.default.processAdClick(campaign.id, '10.0.0.1', false);
        }
        catch (e) {
            threw = true;
            (0, vitest_1.expect)(String(e.message)).toMatch(/Rapid duplicate click detected/);
        }
        (0, vitest_1.expect)(threw).toBe(true);
        // now test database-level uniqueness when ip is missing; in-memory check is skipped
        threw = false;
        try {
            await adEngine_service_1.default.processAdClick(campaign.id, undefined, false);
            // second call within same bucket should hit unique index
            await adEngine_service_1.default.processAdClick(campaign.id, undefined, false);
        }
        catch (e) {
            threw = true;
            (0, vitest_1.expect)(e.name).toBe('DuplicateClickError');
        }
        (0, vitest_1.expect)(threw).toBe(true);
    });
});
