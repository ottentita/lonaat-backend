"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../src/index"));
const prisma_1 = __importDefault(require("../src/prisma"));
const vitest_1 = require("vitest");
const jwt_1 = require("../src/utils/jwt");
let server;
let adminToken;
(0, vitest_1.beforeAll)(async () => {
    await prisma_1.default.$connect();
    server = index_1.default.listen(0);
    const adminUser = await prisma_1.default.user.create({ data: { name: 'Admin', email: `admin+${Date.now()}@example.com`, password: 'x', role: 'admin' } });
    adminToken = (0, jwt_1.generateToken)({ id: adminUser.id, role: 'admin', email: adminUser.email, name: adminUser.name });
});
(0, vitest_1.afterAll)(async () => {
    server && server.close();
    await prisma_1.default.$disconnect();
});
(0, vitest_1.describe)('Admin affiliate events endpoint', () => {
    (0, vitest_1.it)('requires admin authorization', async () => {
        const res = await (0, supertest_1.default)(server).get('/api/admin/affiliate-events');
        (0, vitest_1.expect)(res.status).toBe(401); // no token
    });
    (0, vitest_1.it)('returns event list when admin', async () => {
        // insert a fake event when the model exists in the test schema
        let inserted = false;
        if (prisma_1.default.affiliateEvent) {
            await prisma_1.default.affiliateEvent.create({ data: { network: 'x', eventId: 'evt1', payloadHash: 'abc' } });
            inserted = true;
        }
        const res = await (0, supertest_1.default)(server)
            .get('/api/admin/affiliate-events')
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body.events)).toBe(true);
        if (inserted)
            (0, vitest_1.expect)(res.body.events.find((e) => e.eventId === 'evt1')).toBeTruthy();
    });
});
