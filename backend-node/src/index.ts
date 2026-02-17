import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import prisma from './prisma'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/offers', require('./routes/offers').default)
app.use('/api/track', require('./routes/track').default)

app.get('/', (req, res) => {
  res.json({ ok: true })
})

const port = Number(process.env.PORT || 4000)

async function start() {
  try {
    await prisma.$connect()
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`))
  } catch (err) {
    console.error('Failed to start server', err)
    process.exit(1)
  }
}

start()
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import productRoutes from "./routes/products";
import campaignRoutes from "./routes/campaigns";
import adminRoutes from "./routes/admin";
import trackRoutes from "./routes/track";
import commissionRoutes from "./routes/commissions";
import paymentRoutes from "./routes/payments";
import subscriptionRoutes from "./routes/subscriptions";
import walletRoutes from "./routes/wallet";
import webhookRoutes from "./routes/webhooks";

import propertyRoutes from "./routes/properties";
