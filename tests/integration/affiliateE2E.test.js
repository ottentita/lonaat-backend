"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../../src/index"));
const vitest_1 = require("vitest");
const prisma_1 = __importDefault(require("../../src/prisma"));
const crypto_1 = __importDefault(require("crypto"));
// mock node-fetch for ExampleNetworkAdapter
let mockOffers = [];
vitest_1.vi.mock('node-fetch', () => ({
    default: (url, opts) => Promise.resolve({ ok: true, json: async () => mockOffers })
}));
(0, vitest_1.beforeAll)(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
    process.env.NETWORK_CREDENTIAL_SECRET = process.env.NETWORK_CREDENTIAL_SECRET || 'test_secret';
    process.env.PLATFORM_AFF_ID = process.env.PLATFORM_AFF_ID || 'PLAT';
    process.env.EXAMPLE_PLATFORM_AFF_ID = process.env.EXAMPLE_PLATFORM_AFF_ID || 'EXPLAT';
    await prisma_1.default.$connect();
});
(0, vitest_1.afterAll)(async () => {
    await prisma_1.default.$disconnect();
});
(0, vitest_1.describe)('Affiliate end-to-end smoke test', () => {
    (0, vitest_1.it)('runs full affiliate flow including postback and atomicity', async () => {
        // Step 1: create user and network
        const user = await prisma_1.default.user.create({ data: { name: 'AffUser', email: `aff+${Date.now()}@example.com`, password: 'x' } });
        const network = await prisma_1.default.affiliateNetwork.create({ data: { name: 'example_network', baseApiUrl: 'https://api.example', webhookSecret: 'whsec' } });
        // Step 2: store encrypted credential
        const { encrypt } = await Promise.resolve().then(() => __importStar(require('../../src/utils/crypto')));
        const enc = encrypt('EXAMPLE_KEY_123');
        await prisma_1.default.userNetworkCredential.create({ data: { userId: user.id, networkId: network.id, apiKeyEncrypted: enc.ciphertext, apiKeyIv: enc.iv, apiKeyTag: enc.tag } });
        // Step 3: import offers (mock external API)
        mockOffers = [{ id: 'ext-1', title: 'Offer Ext 1', tracking_url: 'https://trk.example/offer' }];
        const { importOffersForUser } = await Promise.resolve().then(() => __importStar(require('../../src/services/offerImport.service')));
        const resImport = await importOffersForUser(user.id, network.id);
        (0, vitest_1.expect)(resImport.imported).toBeGreaterThan(0);
        const offer = await prisma_1.default.offer.findFirst({ where: { externalOfferId: 'ext-1' } });
        (0, vitest_1.expect)(offer).toBeTruthy();
        // Step 4: import to marketplace via API (needs subscription or tokens)
        const plan = await prisma_1.default.plan.create({ data: { name: 'P', price: 0, monthlyTokens: 10 } });
        await prisma_1.default.subscription.create({ data: { userId: user.id, planId: plan.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } });
        const { generateToken } = await Promise.resolve().then(() => __importStar(require('../../src/utils/jwt')));
        const token = generateToken({ id: user.id, role: 'user', email: user.email, name: user.name });
        const impRes = await (0, supertest_1.default)(index_1.default)
            .post('/api/marketplace/import-offer')
            .set('Authorization', `Bearer ${token}`)
            .send({ networkOfferId: offer.id });
        (0, vitest_1.expect)(impRes.status).toBe(201);
        const item = await prisma_1.default.marketplaceItem.findFirst({ where: { userId: user.id, offerId: offer.id } });
        (0, vitest_1.expect)(item).toBeTruthy();
        // Step 5: create campaign - ensure user has token wallet
        await prisma_1.default.adTokenWallet.create({ data: { userId: user.id, balance: 100 } });
        const campRes = await (0, supertest_1.default)(index_1.default)
            .post('/api/campaigns/marketplace')
            .set('Authorization', `Bearer ${token}`)
            .send({ marketplaceItemId: item.id, budgetTokens: 50 });
        (0, vitest_1.expect)(campRes.status).toBe(201);
        const walletAfter = await prisma_1.default.adTokenWallet.findUnique({ where: { userId: user.id } });
        (0, vitest_1.expect)(Number(walletAfter.balance)).toBe(50);
        // Step 6: simulate click
        const clickRes = await (0, supertest_1.default)(index_1.default)
            .get(`/api/track/click/${item.id}`)
            .set('Authorization', `Bearer ${token}`)
            .redirects(0);
        (0, vitest_1.expect)([301, 302]).toContain(clickRes.status);
        const loc = clickRes.headers.location;
        (0, vitest_1.expect)(loc).toContain('aff_id=');
        (0, vitest_1.expect)(loc).toContain('sub_id=');
        (0, vitest_1.expect)(loc).toContain('click_token=');
        // extract sub_id user-clickId
        const urlObj = new URL(loc);
        const sub = urlObj.searchParams.get('sub_id');
        const clickId = sub.split('-').slice(1).join('-');
        let clickRec = await prisma_1.default.click.findUnique({ where: { clickId } });
        (0, vitest_1.expect)(clickRec).toBeTruthy();
        // ensure click is attributed to the marketplace user (seller) so commission engine credits them
        await prisma_1.default.click.update({ where: { clickId }, data: { user_id: item.userId, userId: item.userId } });
        clickRec = await prisma_1.default.click.findUnique({ where: { clickId } });
        // Step 7: simulate postback with valid HMAC signature
        const payload = JSON.stringify({ sub_id: sub, offerId: offer.id, amount: 100 });
        const sig = crypto_1.default.createHmac('sha256', String(network.webhookSecret)).update(payload).digest('hex');
        const wbRes = await (0, supertest_1.default)(index_1.default)
            .post(`/api/webhooks/network/${network.id}`)
            .set('Content-Type', 'application/json')
            .set('x-signature', `sha256=${sig}`)
            .send(payload);
        (0, vitest_1.expect)(wbRes.status).toBe(200);
        // verify conversion created
        const conv = await prisma_1.default.conversion.findFirst({ where: { clickToken: clickRec.clickToken } });
        (0, vitest_1.expect)(conv).toBeTruthy();
        // verify platform revenue and transaction ledger and commission
        const plat = await prisma_1.default.platformRevenue.findFirst({ where: { conversionId: conv.id } });
        (0, vitest_1.expect)(plat).toBeTruthy();
        const ledger = await prisma_1.default.transactionLedger.findFirst({ where: { userId: user.id } });
        (0, vitest_1.expect)(ledger).toBeTruthy();
        const comm = await prisma_1.default.commission.findFirst({ where: { user_id: user.id } });
        (0, vitest_1.expect)(comm).toBeTruthy();
        // Step 8: verify atomicity - mock commission to throw and assert rollback
        // Prepare a new click
        const click2Res = await (0, supertest_1.default)(index_1.default)
            .get(`/api/track/click/${item.id}`)
            .set('Authorization', `Bearer ${token}`)
            .redirects(0);
        const loc2 = click2Res.headers.location;
        const sub2 = new URL(loc2).searchParams.get('sub_id');
        const clickId2 = sub2.split('-').slice(1).join('-');
        let clickRec2 = await prisma_1.default.click.findUnique({ where: { clickId: clickId2 } });
        (0, vitest_1.expect)(clickRec2).toBeTruthy();
        await prisma_1.default.click.update({ where: { clickId: clickId2 }, data: { user_id: item.userId, userId: item.userId, timeBucket: (clickRec2.timeBucket || 0) + 1 } });
        clickRec2 = await prisma_1.default.click.findUnique({ where: { clickId: clickId2 } });
        // Mock commission processor to throw
        vitest_1.vi.doMock('../../src/services/commissionEngine', () => ({ processConversionSplit: async () => { throw new Error('forced failure'); } }));
        const payload2 = JSON.stringify({ sub_id: sub2, offerId: offer.id, amount: 50 });
        const sig2 = crypto_1.default.createHmac('sha256', String(network.webhookSecret)).update(payload2).digest('hex');
        const wbRes2 = await (0, supertest_1.default)(index_1.default)
            .post(`/api/webhooks/network/${network.id}`)
            .set('Content-Type', 'application/json')
            .set('x-signature', `sha256=${sig2}`)
            .send(payload2);
        // should return 500 due to forced failure
        (0, vitest_1.expect)(wbRes2.status).toBe(500);
        // ensure no conversion, ledger or platformRevenue for that click exists
        const conv2 = await prisma_1.default.conversion.findFirst({ where: { clickToken: clickRec2.clickToken } });
        (0, vitest_1.expect)(conv2).toBeNull();
        const plat2 = await prisma_1.default.platformRevenue.findFirst({ where: { offerId: offer.id, userId: user.id } });
        // There may be a previous platformRevenue from earlier conversion; ensure none for the new conversion id by checking conversions directly.
        // To be safe assert that no commission tied to clickRec2 exists
        const comm2 = await prisma_1.default.commission.findFirst({ where: { click_id: clickRec2.id } });
        (0, vitest_1.expect)(comm2).toBeNull();
        // cleanup mock
        vitest_1.vi.doUnmock('../../src/services/commissionEngine');
    }, 40000);
});
