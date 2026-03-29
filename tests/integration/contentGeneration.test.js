"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../../src/index"));
const vitest_1 = require("vitest");
const prisma_1 = __importDefault(require("../../src/prisma"));
const jwt_1 = require("../../src/utils/jwt");
(0, vitest_1.describe)('SaaS Content Generation', () => {
    let userId;
    let authToken;
    let offerId;
    (0, vitest_1.beforeAll)(async () => {
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
        await prisma_1.default.$connect();
        // Create test user and ad token wallet with balance
        const user = await prisma_1.default.user.create({ data: { email: `content-test-${Date.now()}@example.com`, password: 'hashedpass' } });
        userId = user.id;
        await prisma_1.default.adTokenWallet.create({ data: { userId: userId, balance: 50 } });
        authToken = (0, jwt_1.generateToken)({ id: userId, role: 'user', email: user.email, name: user.email });
        // Create test offer
        const offer = await prisma_1.default.offer.create({
            data: {
                name: 'Test Product for Content',
                title: 'Test Product',
                slug: `test-content-${Date.now()}`,
                url: 'https://example.com',
                network: 'test'
            }
        });
        offerId = offer.id;
    });
    (0, vitest_1.afterAll)(async () => {
        await prisma_1.default.$disconnect();
    });
    (0, vitest_1.it)('should generate content successfully and deduct tokens', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/ai/generate-content')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            offerId,
            affiliateLink: 'https://aff.example.com/product',
            description: 'Amazing product that solves your problem',
            audience: 'entrepreneurs'
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.draftId).toBeDefined();
        (0, vitest_1.expect)(res.body.content).toBeDefined();
        (0, vitest_1.expect)(res.body.content.script).toBeTruthy();
        (0, vitest_1.expect)(res.body.content.caption).toBeTruthy();
        (0, vitest_1.expect)(res.body.remainingTokens).toBe(49);
    });
    (0, vitest_1.it)('should reject if no tokens available', async () => {
        // Create user with 0 tokens (adTokenWallet balance 0)
        const noTokenUser = await prisma_1.default.user.create({ data: { email: `no-tokens-${Date.now()}@example.com`, password: 'hashedpass' } });
        await prisma_1.default.adTokenWallet.create({ data: { userId: noTokenUser.id, balance: 0 } });
        const token = (0, jwt_1.generateToken)({
            id: noTokenUser.id,
            role: 'user',
            email: noTokenUser.email,
            name: noTokenUser.email
        });
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/ai/generate-content')
            .set('Authorization', `Bearer ${token}`)
            .send({ offerId, description: 'Test' });
        (0, vitest_1.expect)(res.status).toBe(402);
        (0, vitest_1.expect)(res.body.error).toContain('Insufficient tokens');
    });
    (0, vitest_1.it)('should retrieve all content drafts for user', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .get('/api/ai/my-content')
            .set('Authorization', `Bearer ${authToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(Array.isArray(res.body.drafts)).toBe(true);
        (0, vitest_1.expect)(res.body.count).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(res.body.drafts[0]).toHaveProperty('id');
        (0, vitest_1.expect)(res.body.drafts[0]).toHaveProperty('caption');
    });
    (0, vitest_1.it)('should return 401 if not authenticated', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/ai/generate-content')
            .send({ offerId });
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('should return 400 if offerId missing', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/ai/generate-content')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ description: 'No offer id' });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toContain('offerId');
    });
});
