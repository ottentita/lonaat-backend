"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../src/index"));
const prisma_1 = __importDefault(require("../src/prisma"));
const vitest_1 = require("vitest");
let server;
let user;
(0, vitest_1.beforeAll)(async () => {
    await prisma_1.default.$connect();
    server = index_1.default.listen(0);
    // create a test user with token account via registration route
    const res = await (0, supertest_1.default)(server)
        .post('/api/auth/register')
        .send({ email: `tokenuser+${Date.now()}@example.com`, password: 'password' });
    user = res.body?.user;
    if (!user) {
        // fallback: create user directly so teardown can run
        const created = await prisma_1.default.user.create({ data: { name: 'token-fallback', email: `tokenuser+fallback${Date.now()}@example.com`, password: 'x' } });
        user = { id: created.id, email: created.email };
    }
});
(0, vitest_1.afterAll)(async () => {
    server && server.close();
    if (user && user.id) {
        await prisma_1.default.user.delete({ where: { id: user.id } }).catch(() => { });
    }
    await prisma_1.default.$disconnect();
});
(0, vitest_1.describe)('Token endpoints', () => {
    (0, vitest_1.it)('GET /me/token-balance should return free plan data', async () => {
        // login to get cookie
        const login = await (0, supertest_1.default)(server)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'password' });
        const cookies = login.headers['set-cookie'];
        const bal = await (0, supertest_1.default)(server)
            .get('/me/token-balance')
            .set('Cookie', cookies);
        (0, vitest_1.expect)(bal.status).toBe(200);
        (0, vitest_1.expect)(bal.body.plan).toBe('FREE');
        (0, vitest_1.expect)(bal.body.balance).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(bal.body.available).toBe(bal.body.balance - bal.body.reserved);
    });
    (0, vitest_1.it)('POST /internal/test-token-flow does full cycle', async () => {
        const login = await (0, supertest_1.default)(server)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'password' });
        const cookies = login.headers['set-cookie'];
        const flow = await (0, supertest_1.default)(server)
            .post('/internal/test-token-flow')
            .set('Cookie', cookies);
        (0, vitest_1.expect)(flow.status).toBe(200);
        (0, vitest_1.expect)(flow.body.message).toMatch(/completed/);
        (0, vitest_1.expect)(flow.body.balance).toBeDefined();
    });
});
