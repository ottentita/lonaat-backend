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
const crypto_1 = __importDefault(require("crypto"));
// mock commission engine so we can assert it's not called on invalid signatures
vitest_1.vi.mock('../src/services/commissionEngine', () => ({
    processConversionSplit: vitest_1.vi.fn()
}));
let processConversionSplit;
let server;
(0, vitest_1.beforeAll)(async () => {
    // ensure test env secret is present
    process.env.NETWORK_CREDENTIAL_SECRET = process.env.NETWORK_CREDENTIAL_SECRET || 'test_secret';
    await prisma_1.default.$connect();
    server = index_1.default.listen(0);
    // import the (mocked) commission engine after mocking so the mock is returned
    const mod = await Promise.resolve().then(() => __importStar(require('../src/services/commissionEngine')));
    processConversionSplit = mod.processConversionSplit;
});
(0, vitest_1.afterAll)(async () => {
    server && server.close();
    await prisma_1.default.$disconnect();
});
(0, vitest_1.describe)('Network webhook signature verification', () => {
    (0, vitest_1.it)('returns 401 when missing signature', async () => {
        const net = await prisma_1.default.affiliateNetwork.create({ data: { name: 'test-net', baseApiUrl: 'https://example.com' } });
        const payload = JSON.stringify({ sub_id: '1-abc', offerId: 1 });
        const res = await (0, supertest_1.default)(server)
            .post(`/api/webhooks/network/${net.id}`)
            .set('Content-Type', 'application/json')
            .send(payload);
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(processConversionSplit).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 401 when signature invalid', async () => {
        const net = await prisma_1.default.affiliateNetwork.create({ data: { name: 'test-net2', baseApiUrl: 'https://example.com', webhookSecret: 'secret1' } });
        const payload = JSON.stringify({ sub_id: '1-abc', offerId: 1 });
        const badSig = crypto_1.default.createHmac('sha256', 'wrong').update(payload).digest('hex');
        const res = await (0, supertest_1.default)(server)
            .post(`/api/webhooks/network/${net.id}`)
            .set('Content-Type', 'application/json')
            .set('x-signature', `sha256=${badSig}`)
            .send(payload);
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(processConversionSplit).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 200 when signature valid and calls commission engine', async () => {
        const net = await prisma_1.default.affiliateNetwork.create({ data: { name: 'test-net3', baseApiUrl: 'https://example.com', webhookSecret: 'secret2' } });
        // create an offer and a click so webhook can create conversion
        const user = await prisma_1.default.user.create({ data: { name: 'Alice', email: `alice+${Date.now()}@example.com`, password: 'x' } });
        const offer = await prisma_1.default.offer.create({ data: { title: 'o', name: 'o', slug: `o-${Date.now()}`, url: 'https://x', externalOfferId: 'e1' } });
        const click = await prisma_1.default.click.create({ data: { offerId: offer.id, adId: 1, userId: user.id, timeBucket: 1, clickId: 'clk1', clickToken: 'tok1' } });
        const payload = JSON.stringify({ sub_id: `${user.id}-${click.clickId}`, offerId: offer.id });
        const sig = crypto_1.default.createHmac('sha256', 'secret2').update(payload).digest('hex');
        const res = await (0, supertest_1.default)(server)
            .post(`/api/webhooks/network/${net.id}`)
            .set('Content-Type', 'application/json')
            .set('x-signature', `sha256=${sig}`)
            .send(payload);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(processConversionSplit).toHaveBeenCalled();
        // event should be logged for idempotency when model exists
        if (prisma_1.default.affiliateEvent) {
            const events = await prisma_1.default.affiliateEvent.findMany({ where: { network: 'test-net3' } });
            (0, vitest_1.expect)(events.length).toBeGreaterThan(0);
        }
    });
    (0, vitest_1.it)('ignores duplicate events and does not create second conversion', async () => {
        const net = await prisma_1.default.affiliateNetwork.create({ data: { name: 'dup-net', baseApiUrl: 'https://example.com', webhookSecret: 'secret3' } });
        const user = await prisma_1.default.user.create({ data: { name: 'Bob', email: `bob+${Date.now()}@example.com`, password: 'x' } });
        const offer = await prisma_1.default.offer.create({ data: { title: 'o', name: 'o', slug: `o2-${Date.now()}`, url: 'https://x', externalOfferId: 'e2' } });
        const click = await prisma_1.default.click.create({ data: { offerId: offer.id, adId: 1, userId: user.id, timeBucket: 1, clickId: 'clk2', clickToken: 'tok2' } });
        const payload = JSON.stringify({ sub_id: `${user.id}-${click.clickId}`, offerId: offer.id });
        const sig = crypto_1.default.createHmac('sha256', 'secret3').update(payload).digest('hex');
        // first call
        const first = await (0, supertest_1.default)(server)
            .post(`/api/webhooks/network/${net.id}`)
            .set('Content-Type', 'application/json')
            .set('x-signature', `sha256=${sig}`)
            .send(payload);
        (0, vitest_1.expect)(first.status).toBe(200);
        const countAfterFirst = await prisma_1.default.conversion.count({ where: { offerId: offer.id } });
        // second call with same payload
        const second = await (0, supertest_1.default)(server)
            .post(`/api/webhooks/network/${net.id}`)
            .set('Content-Type', 'application/json')
            .set('x-signature', `sha256=${sig}`)
            .send(payload);
        (0, vitest_1.expect)(second.status).toBe(200);
        const countAfterSecond = await prisma_1.default.conversion.count({ where: { offerId: offer.id } });
        (0, vitest_1.expect)(countAfterSecond).toBe(countAfterFirst); // no new conversion
    });
    (0, vitest_1.it)('also works via the named-network /webhooks/digistore route with config secret', async () => {
        process.env.DIGISTORE_WEBHOOK_SECRET = 'nmsecret';
        const user = await prisma_1.default.user.create({ data: { name: 'Named', email: `named+${Date.now()}@example.com`, password: 'x' } });
        const offer = await prisma_1.default.offer.create({ data: { title: 'n', name: 'n', slug: `n-${Date.now()}`, url: 'https://n', externalOfferId: 'e3' } });
        const click = await prisma_1.default.click.create({ data: { offerId: offer.id, adId: 1, userId: user.id, timeBucket: 1, clickId: 'clk3', clickToken: 'tok3' } });
        const payload = JSON.stringify({ sub_id: `${user.id}-${click.clickId}`, offerId: offer.id });
        const sig = crypto_1.default.createHmac('sha256', 'nmsecret').update(payload).digest('hex');
        const res = await (0, supertest_1.default)(server)
            .post('/webhooks/digistore')
            .set('Content-Type', 'application/json')
            .set('x-signature', `sha256=${sig}`)
            .send(payload);
        (0, vitest_1.expect)(res.status).toBe(200);
        const conv = await prisma_1.default.conversion.findFirst({ where: { offerId: offer.id } });
        (0, vitest_1.expect)(conv).toBeTruthy();
    });
});
