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
const index_1 = __importDefault(require("../src/index"));
const vitest_1 = require("vitest");
const prisma_1 = __importDefault(require("../src/prisma"));
// Mock GenericNetworkAdapter to return deterministic offers
vitest_1.vi.mock('../src/networks/GenericNetworkAdapter', () => ({
    default: class {
        constructor(baseApiUrl) { this.base = baseApiUrl; }
        async fetchOffers() {
            return [{ id: 'ext1', name: 'Imported Offer', url: 'https://example.com/track?o=1', payout: 1.5, trackingUrl: 'https://example.com/track?o=1&{click_token}' }];
        }
    }
}));
let server;
let token;
(0, vitest_1.beforeAll)(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
    process.env.NETWORK_CREDENTIAL_SECRET = process.env.NETWORK_CREDENTIAL_SECRET || 'test_secret';
    await prisma_1.default.$connect();
    server = index_1.default.listen(0);
});
(0, vitest_1.afterAll)(async () => {
    server && server.close();
    await prisma_1.default.$disconnect();
});
(0, vitest_1.describe)('Marketplace pipeline', () => {
    (0, vitest_1.it)('imports offers for user via service', async () => {
        const user = await prisma_1.default.user.create({ data: { name: 'Bob', email: `bob+${Date.now()}@example.com`, password: 'x' } });
        const net = await prisma_1.default.affiliateNetwork.create({ data: { name: 'net1', baseApiUrl: 'https://net1.example' } });
        await prisma_1.default.userNetworkCredential.create({ data: { userId: user.id, networkId: net.id } });
        const { importOffersForUser } = await Promise.resolve().then(() => __importStar(require('../src/services/offerImport.service')));
        const res = await importOffersForUser(user.id, net.id);
        (0, vitest_1.expect)(res.imported).toBeGreaterThan(0);
        const offer = await prisma_1.default.offer.findFirst({ where: { externalOfferId: 'ext1' } });
        (0, vitest_1.expect)(offer).toBeTruthy();
    });
    (0, vitest_1.it)('creates marketplace item via API for eligible user', async () => {
        // create user with active subscription
        const user = await prisma_1.default.user.create({ data: { name: 'Carol', email: `carol+${Date.now()}@example.com`, password: 'x' } });
        const plan = await prisma_1.default.plan.create({ data: { name: 'p', price: 0, monthlyTokens: 10 } });
        await prisma_1.default.subscription.create({ data: { userId: user.id, planId: plan.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } });
        // create an offer to import
        const offer = await prisma_1.default.offer.create({ data: { title: 'offerX', name: 'offerX', slug: 'offerX', url: 'https://x', externalOfferId: `eo-${Date.now()}`, trackingUrl: 'https://track.example/clk' } });
        const { generateToken } = await Promise.resolve().then(() => __importStar(require('../src/utils/jwt')));
        token = generateToken({ id: user.id, role: 'user', email: user.email, name: user.name });
        const res = await (0, supertest_1.default)(server)
            .post('/api/marketplace/import-offer')
            .set('Authorization', `Bearer ${token}`)
            .send({ networkOfferId: offer.id });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.marketplaceItem).toBeTruthy();
    });
    (0, vitest_1.it)('creates campaign and deducts tokens', async () => {
        const user = await prisma_1.default.user.create({ data: { name: 'Dave', email: `dave+${Date.now()}@example.com`, password: 'x' } });
        const offer = await prisma_1.default.offer.create({ data: { title: 'offerY', name: 'offerY', slug: 'offerY', url: 'https://y', externalOfferId: `eo2-${Date.now()}`, trackingUrl: 'https://trk.example/offer' } });
        const item = await prisma_1.default.marketplaceItem.create({ data: { userId: user.id, offerId: offer.id } });
        await prisma_1.default.adTokenWallet.create({ data: { userId: user.id, balance: 100 } });
        const { generateToken } = await Promise.resolve().then(() => __importStar(require('../src/utils/jwt')));
        const t = generateToken({ id: user.id, role: 'user', email: user.email, name: user.name });
        const res = await (0, supertest_1.default)(server)
            .post('/api/campaigns/marketplace')
            .set('Authorization', `Bearer ${t}`)
            .send({ marketplaceItemId: item.id, budgetTokens: 50 });
        (0, vitest_1.expect)(res.status).toBe(201);
        const updated = await prisma_1.default.adTokenWallet.findUnique({ where: { userId: user.id } });
        (0, vitest_1.expect)(Number(updated.balance)).toBe(50);
    });
    (0, vitest_1.it)('click redirect includes aff_id, sub_id and click_token', async () => {
        const user = await prisma_1.default.user.create({ data: { name: 'Eve', email: `eve+${Date.now()}@example.com`, password: 'x' } });
        const offer = await prisma_1.default.offer.create({ data: { title: 'offerZ', name: 'offerZ', slug: 'offerZ', url: 'https://z', externalOfferId: `eo3-${Date.now()}`, trackingUrl: 'https://redir.example/offer' } });
        const item = await prisma_1.default.marketplaceItem.create({ data: { userId: user.id, offerId: offer.id } });
        const { generateToken } = await Promise.resolve().then(() => __importStar(require('../src/utils/jwt')));
        const t = generateToken({ id: user.id, role: 'user', email: user.email, name: user.name });
        const res = await (0, supertest_1.default)(server)
            .get(`/api/track/click/${item.id}`)
            .set('Authorization', `Bearer ${t}`)
            .redirects(0);
        (0, vitest_1.expect)([301, 302]).toContain(res.status);
        const loc = res.headers.location;
        (0, vitest_1.expect)(loc).toContain('aff_id=');
        (0, vitest_1.expect)(loc).toMatch(/sub_id=.*-/);
        (0, vitest_1.expect)(loc).toContain('click_token=');
    });
});
