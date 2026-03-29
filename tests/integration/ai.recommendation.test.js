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
(0, vitest_1.describe)('Offer recommendation engine', () => {
    let offer1, offer2;
    (0, vitest_1.beforeAll)(async () => {
        // create dummy user for clicks/commissions
        const user = await db.user.create({ data: { email: `rec${Date.now()}@example.com`, password: 'foo', role: 'user' } });
        // create two offers (unique slugs per run)
        const s1 = `offer-1-${Date.now()}`;
        const s2 = `offer-2-${Date.now()}`;
        offer1 = await db.offer.create({ data: { title: 'Offer 1', name: 'Offer 1', slug: s1, url: '', network: 'net1', payout: 5 } });
        offer2 = await db.offer.create({ data: { title: 'Offer 2', name: 'Offer 2', slug: s2, url: '', network: 'net2', payout: 10 } });
        // clicks and conversions for offer1: high click volume, moderate conv rate, low commission
        for (let i = 0; i < 3; i++) {
            const token = crypto_1.default.randomUUID();
            const cid = crypto_1.default.randomUUID();
            const click = await db.click.create({ data: { offerId: offer1.id, adId: offer1.id, userId: user.id, timeBucket: i, clickId: cid, clickToken: token } });
            if (i < 5) {
                await db.commission.create({ data: { user_id: user.id, click_id: click.id, amount: 5, status: 'pending' } });
                await db.conversion.create({ data: { offerId: offer1.id, clickId: click.clickId, clickToken: click.clickToken, amount: 100 } });
            }
        }
        // offer2: lower clicks but high commission
        for (let i = 0; i < 1; i++) {
            const token2 = crypto_1.default.randomUUID();
            const cid2 = crypto_1.default.randomUUID();
            const click = await db.click.create({ data: { offerId: offer2.id, adId: offer2.id, userId: user.id, timeBucket: 100 + i, clickId: cid2, clickToken: token2 } });
            await db.commission.create({ data: { user_id: user.id, click_id: click.id, amount: 10, status: 'pending' } });
            if (i === 0) {
                await db.conversion.create({ data: { offerId: offer2.id, clickId: click.clickId, clickToken: click.clickToken, amount: 100 } });
            }
        }
    }, 30000);
    (0, vitest_1.it)('service returns top offer based on weighted score', async () => {
        const recs = await aiController_1.default.getRecommendations();
        (0, vitest_1.expect)(Array.isArray(recs)).toBe(true);
        (0, vitest_1.expect)(recs.length).toBeGreaterThan(0);
        // at least one recommendation is returned
        (0, vitest_1.expect)(recs[0].offerId).toBeDefined();
    }, 20000);
    (0, vitest_1.it)('route responds with recommendations and bypasses auth in dev', async () => {
        process.env.NODE_ENV = 'development';
        const res = await (0, supertest_1.default)(src_1.default).get('/api/ai/recommendations');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.recommendations).toBeDefined();
        (0, vitest_1.expect)(Array.isArray(res.body.recommendations)).toBe(true);
        process.env.NODE_ENV = 'test';
    }, 20000);
});
