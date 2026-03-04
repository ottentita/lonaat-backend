import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
// prisma client is provided by src/prisma now
// const prisma = new PrismaClient();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
});

export default app;
