"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const src_1 = __importDefault(require("../src"));
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Validation middleware', () => {
    (0, vitest_1.beforeAll)(() => {
        // ensure auth middleware short-circuits to avoid 401s
        process.env.NODE_ENV = 'development';
    });
    (0, vitest_1.afterAll)(() => {
        process.env.NODE_ENV = 'test';
    });
    (0, vitest_1.it)('rejects click tracking with missing fields', async () => {
        const res = await (0, supertest_1.default)(src_1.default).post('/api/track/click').send({});
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.errors).toBeDefined();
    });
    (0, vitest_1.it)('allows click tracking when externalSubId provided', async () => {
        const res = await (0, supertest_1.default)(src_1.default).post('/api/track/click').send({ offerId: 1, clickId: 'abc', externalSubId: 'foo' });
        // body contains either click or error due to missing offer, but validation should pass (not 400)
        (0, vitest_1.expect)(res.status).not.toBe(400);
    });
    (0, vitest_1.it)('rejects conversion endpoint with neither offerId nor clickToken', async () => {
        const res = await (0, supertest_1.default)(src_1.default).post('/api/track/conversion').send({ amount: 10 });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.errors).toBeDefined();
    });
    (0, vitest_1.it)('rejects earnings prediction with invalid query params', async () => {
        const res = await (0, supertest_1.default)(src_1.default).get('/api/ai/earnings-prediction?offerId=foo&clicks=bar');
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.errors).toBeDefined();
    });
    (0, vitest_1.it)('rejects subscription request without plan_id', async () => {
        const res = await (0, supertest_1.default)(src_1.default).post('/api/subscriptions/subscribe').send({});
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.errors).toBeDefined();
    });
    (0, vitest_1.it)('rejects payments webhook with missing transactionId', async () => {
        const res = await (0, supertest_1.default)(src_1.default).post('/api/payments/webhook').send({ status: 'completed' });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.errors).toBeDefined();
    });
});
