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
let mockProducts = [];
vitest_1.vi.mock('node-fetch', () => ({
    default: (url, opts) => Promise.resolve({ ok: true, json: async () => mockProducts })
}));
(0, vitest_1.beforeAll)(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
    process.env.NETWORK_CREDENTIAL_SECRET = process.env.NETWORK_CREDENTIAL_SECRET || 'test_secret';
    process.env.DIGISTORE_IPN_SECRET = process.env.DIGISTORE_IPN_SECRET || 'digisecret';
    process.env.PLATFORM_AFF_ID = process.env.PLATFORM_AFF_ID || 'PLAT';
    // new envs used by legacy /track route
    process.env.DIGISTORE_PRODUCT_ID = process.env.DIGISTORE_PRODUCT_ID || 'prod-env';
    process.env.DIGISTORE_AFFILIATE_ID = process.env.DIGISTORE_AFFILIATE_ID || 'aff-env';
    process.env.DIGISTORE_WEBHOOK_SECRET = process.env.DIGISTORE_WEBHOOK_SECRET || 'webhook_secret';
    await prisma_1.default.$connect();
});
(0, vitest_1.afterAll)(async () => {
    await prisma_1.default.$disconnect();
});
(0, vitest_1.describe)('Digistore24 integration', () => {
    (0, vitest_1.it)('imports offer, creates campaign, tracks click and processes IPN', async () => {
        // create user and network
        const user = await prisma_1.default.user.create({ data: { name: 'DigiSeller', email: `digi+${Date.now()}@example.com`, password: 'x' } });
        const network = await prisma_1.default.affiliateNetwork.create({ data: { name: 'digistore24', baseApiUrl: 'https://api.digistore24.test' } });
        // store affiliate username in extraConfig for seller
        const affiliateUsername = 'seller_digi';
        await prisma_1.default.userNetworkCredential.create({ data: { userId: user.id, networkId: network.id, extraConfig: JSON.stringify({ affiliateUsername }) } });
        // mock products returned by Digistore API
        mockProducts = [{ product_id: 'prod-1', name: 'Digi Prod 1', description: 'desc', payout: 10 }];
        const { importOffersForUser } = await Promise.resolve().then(() => __importStar(require('../../src/services/offerImport.service')));
        const resImport = await importOffersForUser(user.id, network.id);
        (0, vitest_1.expect)(resImport.imported).toBeGreaterThan(0);
        const offer = await prisma_1.default.offer.findFirst({ where: { externalOfferId: 'prod-1' } });
        (0, vitest_1.expect)(offer).toBeTruthy();
        // after our change, trackingUrl should be the placeholder value rather than a full URL
        (0, vitest_1.expect)(offer.trackingUrl).toBe('digistore24');
        // marketplace import (needs subscription or tokens)
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
        // add wallet and create campaign
        await prisma_1.default.adTokenWallet.create({ data: { userId: user.id, balance: 100 } });
        const campRes = await (0, supertest_1.default)(index_1.default)
            .post('/api/campaigns/marketplace')
            .set('Authorization', `Bearer ${token}`)
            .send({ marketplaceItemId: item.id, budgetTokens: 50 });
        (0, vitest_1.expect)(campRes.status).toBe(201);
        // simulate click via marketplace click endpoint (redirect)
        const clickRes = await (0, supertest_1.default)(index_1.default)
            .get(`/api/track/click/${item.id}`)
            .set('Authorization', `Bearer ${token}`)
            .redirects(0);
        (0, vitest_1.expect)([301, 302]).toContain(clickRes.status);
        const loc = clickRes.headers.location;
        (0, vitest_1.expect)(loc).toContain('/redir/');
        (0, vitest_1.expect)(loc).toContain(affiliateUsername);
        (0, vitest_1.expect)(loc).toContain('subid=');
        // extract subid = userId-clickId
        const urlObj = new URL(loc);
        const sub = urlObj.searchParams.get('subid') || urlObj.searchParams.get('sub_id') || urlObj.searchParams.get('sub');
        (0, vitest_1.expect)(sub).toBeTruthy();
        const clickId = String(sub).split('-').slice(1).join('-');
        const clickRec = await prisma_1.default.click.findUnique({ where: { clickId } });
        (0, vitest_1.expect)(clickRec).toBeTruthy();
        // attribute click to marketplace item owner (seller)
        await prisma_1.default.click.update({ where: { clickId }, data: { user_id: item.userId, userId: item.userId } });
        // simulate IPN postback (HMAC over raw body using DIGISTORE_IPN_SECRET)
        const payloadObj = { transaction_id: 'tx123', product_id: offer.externalOfferId, affiliate: affiliateUsername, amount: 100, currency: 'USD', subid: `${item.userId}-${clickId}` };
        const payload = JSON.stringify(payloadObj);
        const sig = crypto_1.default.createHmac('sha256', String(process.env.DIGISTORE_IPN_SECRET)).update(payload).digest('hex');
        const wbRes = await (0, supertest_1.default)(index_1.default)
            .post(`/api/webhooks/network/${network.id}`)
            .set('Content-Type', 'application/json')
            .set('x-signature', `sha256=${sig}`)
            .send(payload);
        (0, vitest_1.expect)(wbRes.status).toBe(200);
        const conv = await prisma_1.default.conversion.findFirst({ where: { clickToken: clickRec.clickToken } });
        (0, vitest_1.expect)(conv).toBeTruthy();
        const plat = await prisma_1.default.platformRevenue.findFirst({ where: { conversionId: conv.id } });
        (0, vitest_1.expect)(plat).toBeTruthy();
        const ledger = await prisma_1.default.transactionLedger.findFirst({ where: { userId: user.id } });
        (0, vitest_1.expect)(ledger).toBeTruthy();
        const comm = await prisma_1.default.commission.findFirst({ where: { user_id: user.id } });
        (0, vitest_1.expect)(comm).toBeTruthy();
    }, 40000);
    (0, vitest_1.it)('legacy /track endpoint should build URL from ENV and preserve external subid', async () => {
        // create a standalone offer; trackingUrl is just the magic string
        const offer = await prisma_1.default.offer.create({
            data: {
                title: 'Env Digi Offer',
                slug: 'digi-test',
                network: 'digistore24',
                trackingUrl: 'digistore24',
                isActive: true,
            }
        });
        const external = 'abc123';
        const res = await (0, supertest_1.default)(index_1.default)
            .get(`/track?network=digistore24&offer=digi-test&subid=${external}`)
            .redirects(0);
        (0, vitest_1.expect)(res.status).toBe(302);
        const loc = res.headers.location;
        // URL built from env variables, not the external subid
        (0, vitest_1.expect)(loc).toContain(`/redir/${process.env.DIGISTORE_PRODUCT_ID}/${process.env.DIGISTORE_AFFILIATE_ID}/`);
        // parse returned subid – should be internal click id from DB
        const urlObj = new URL(loc);
        const forwardedSub = urlObj.searchParams.get('subid');
        (0, vitest_1.expect)(forwardedSub).toBeTruthy();
        (0, vitest_1.expect)(forwardedSub).not.toBe(external);
        // click record created with externalSubId saved
        const clickRec = await prisma_1.default.click.findFirst({ where: { offerId: offer.id } });
        (0, vitest_1.expect)(clickRec).toBeTruthy();
        (0, vitest_1.expect)(clickRec.externalSubId).toBe(external);
        // stats endpoint should increment at least once
        const stats = await (0, supertest_1.default)(index_1.default).get('/stats');
        (0, vitest_1.expect)(stats.status).toBe(200);
        (0, vitest_1.expect)(stats.body.totalClicks).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('digistore conversion webhook should mark click converted', async () => {
        // create a click record manually
        const click = await prisma_1.default.click.create({ data: {
                network: 'digistore24', offerId: 0, adId: 0, userId: 0,
                timeBucket: 0, clickId: 'testconvert', clickToken: 'tok', ip: '1.1.1.1',
                userAgent: 'ua', externalSubId: null
            } });
        const secret = process.env.DIGISTORE_WEBHOOK_SECRET || 'webhook_secret';
        const payload = { subid: String(click.id), amount: '47.00', secret };
        const wbRes = await (0, supertest_1.default)(index_1.default)
            .post('/webhook/digistore')
            .send(payload);
        (0, vitest_1.expect)(wbRes.status).toBe(200);
        (0, vitest_1.expect)(wbRes.body).toEqual({
            status: 'conversion-recorded',
            clickId: click.id,
            revenue: 47
        });
        // invalid secret should be rejected
        const wbBad = await (0, supertest_1.default)(index_1.default)
            .post('/webhook/digistore')
            .send({ subid: String(click.id), amount: '1.00', secret: 'wrong' });
        (0, vitest_1.expect)(wbBad.status).toBe(401);
        const updated = await prisma_1.default.click.findUnique({ where: { id: click.id } });
        (0, vitest_1.expect)(updated).toBeTruthy();
        (0, vitest_1.expect)(updated.converted).toBe(true);
        (0, vitest_1.expect)(updated.revenue).toBeCloseTo(47.00);
        // stats should reflect the revenue and new metrics
        const statsRes = await (0, supertest_1.default)(index_1.default).get('/stats');
        (0, vitest_1.expect)(statsRes.status).toBe(200);
        (0, vitest_1.expect)(statsRes.body.totalRevenue).toBeGreaterThanOrEqual(47.00);
        (0, vitest_1.expect)(statsRes.body.conversions).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(statsRes.body.epc).toBeDefined();
        (0, vitest_1.expect)(statsRes.body.conversionRate).toBeDefined();
    });
});
