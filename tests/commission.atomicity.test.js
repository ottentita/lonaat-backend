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
const vitest_1 = require("vitest");
const prisma_1 = __importDefault(require("../src/prisma"));
(0, vitest_1.describe)('Commission engine atomicity', () => {
    (0, vitest_1.it)('rolls back all writes when an error is thrown mid-transaction', async () => {
        // create user, offer, click, conversion
        const user = await prisma_1.default.user.create({ data: { name: 'Atomic Test', email: `atomic+${Date.now()}@local`, password: 'x', role: 'USER', balance: 0 } });
        const atomicSlug = `atomic-offer-${Date.now()}`;
        const offer = await prisma_1.default.offer.create({ data: { title: 'Atomic Offer', name: 'Atomic Offer', slug: atomicSlug, url: 'https://example.test/atomic', payout: 10, sellerId: user.id } });
        const click = await prisma_1.default.click.create({ data: { offerId: offer.id, adId: offer.id, userId: user.id, timeBucket: 1, clickId: `atomic_click_${Date.now()}`, clickToken: `atomic_token_${Date.now()}` } });
        const conv = await prisma_1.default.conversion.create({ data: { offerId: offer.id, clickId: click.clickId, clickToken: click.clickToken, amount: 100 } });
        // load commission engine
        const mod = await Promise.resolve().then(() => __importStar(require('../src/services/commissionEngine')));
        const { processConversionSplit } = mod;
        // monkeypatch prisma.$transaction to inject failure on platformRevenue.create
        const originalTx = prisma_1.default.$transaction.bind(prisma_1.default);
        prisma_1.default.$transaction = async (cb) => {
            return originalTx(async (tx) => {
                const txProxy = Object.create(tx);
                // forward everything except platformRevenue.create which will throw
                txProxy.platformRevenue = {
                    create: async () => {
                        throw new Error('Injected failure for test');
                    }
                };
                return cb(txProxy);
            });
        };
        let threw = false;
        try {
            await processConversionSplit(conv.id);
        }
        catch (e) {
            threw = true;
            (0, vitest_1.expect)(String(e.message)).toMatch(/Injected failure/);
        }
        (0, vitest_1.expect)(threw).toBe(true);
        // restore original transaction
        prisma_1.default.$transaction = originalTx;
        // Assert no Commission created for this click
        const comm = await prisma_1.default.commission.findFirst({ where: { click_id: click.id } });
        (0, vitest_1.expect)(comm).toBeNull();
        // Assert no TransactionLedger entry for this user referencing the conversion
        const ledger = await prisma_1.default.transactionLedger.findFirst({ where: { userId: user.id, reason: { contains: `conversion ${conv.id}` } } });
        (0, vitest_1.expect)(ledger).toBeNull();
        // Assert no PlatformRevenue row exists for this conversion
        const plat = await prisma_1.default.platformRevenue.findFirst({ where: { conversionId: conv.id } });
        (0, vitest_1.expect)(plat).toBeNull();
    }, 20000);
});
