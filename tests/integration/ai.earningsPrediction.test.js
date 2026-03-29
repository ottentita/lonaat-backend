"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = __importDefault(require("../../src/prisma"));
const aiController_1 = __importDefault(require("../../src/ai/aiController"));
const supertest_1 = __importDefault(require("supertest"));
const src_1 = __importDefault(require("../../src"));
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.default;
(0, vitest_1.describe)('Earnings prediction engine', () => {
    let user, offer;
    (0, vitest_1.beforeAll)(async () => {
        process.env.AD_CLICK_COST = '1'; // deterministic token cost
        user = await db.user.create({ data: { email: `earn${Date.now()}@example.com`, password: 'foo', role: 'user' } });
        const slugEarn = `offer-earn-${Date.now()}`;
        offer = await db.offer.create({ data: { title: 'Offer Earn', name: 'Offer Earn', slug: slugEarn, url: '', network: 'net', payout: 20 } });
        // simulate 50 clicks with 2 conversions
        for (let i = 0; i < 50; i++) {
            // generate UUIDs to avoid collisions across runs and satisfy possible uuid schema
            const token = crypto_1.default.randomUUID();
            const cid = crypto_1.default.randomUUID();
            const click = await db.click.create({ data: { offerId: offer.id, adId: offer.id, userId: user.id, timeBucket: i, clickId: cid, clickToken: token } });
            if (i < 2) {
                await db.commission.create({ data: { user_id: user.id, click_id: click.id, amount: 20, status: 'pending' } });
                await db.conversion.create({ data: { offerId: offer.id, clickId: click.clickId, clickToken: click.clickToken, amount: 100 } });
            }
        }
    }, 30000);
    (0, vitest_1.it)('service computes expected values and risk level', async () => {
        const result = await aiController_1.default.earningsPrediction(user.id, offer.id, 100);
        (0, vitest_1.expect)(result).toHaveProperty('expectedConversions');
        (0, vitest_1.expect)(result.expectedConversions).toBeCloseTo(4); // 2/50=0.04 conv rate -> 4 conversions
        (0, vitest_1.expect)(result).toHaveProperty('expectedEarnings', vitest_1.expect.any(Number));
        (0, vitest_1.expect)(result).toHaveProperty('roi', vitest_1.expect.any(Number));
        (0, vitest_1.expect)(result.riskLevel).toBe('LOW');
    });
    (0, vitest_1.it)('endpoint returns same structure', async () => {
        process.env.NODE_ENV = 'development';
        const res = await (0, supertest_1.default)(src_1.default).get(`/api/ai/earnings-prediction?offerId=${offer.id}&clicks=100`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toHaveProperty('expectedConversions');
        (0, vitest_1.expect)(res.body).toHaveProperty('expectedEarnings');
        (0, vitest_1.expect)(res.body).toHaveProperty('roi');
        (0, vitest_1.expect)(res.body).toHaveProperty('riskLevel');
        process.env.NODE_ENV = 'test';
    });
});
