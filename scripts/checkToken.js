// use Docker PostgreSQL when running this check script
process.env.DATABASE_URL = 'postgresql://postgres:postgres@postgres:5432/lonaat';

const request = require('supertest');
const app = require('../src/index').default;
const prisma = require('../src/prisma').prisma;
(async () => {
  await prisma.$connect();
  // create user
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: `check+${Date.now()}@example.com`, password: 'pass1234' });
  const user = res.body.user;
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'pass1234' });
  const cookies = login.headers['set-cookie'];
  const bal = await request(app)
    .get('/me/token-balance')
    .set('Cookie', cookies);
  console.log('balance response:', bal.body);
  const flow = await request(app)
    .post('/internal/test-token-flow')
    .set('Cookie', cookies);
  console.log('flow response:', flow.body);
  const ledger = await prisma.tokenLedger.findMany({ orderBy: { createdAt: 'desc' } });
  console.log('recent ledger entries:', ledger.slice(0,4));
  process.exit(0);
})();