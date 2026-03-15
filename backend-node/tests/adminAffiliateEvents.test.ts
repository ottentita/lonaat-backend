import request from 'supertest'
import app from '../src/index'
import prisma from '../src/prisma'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { generateToken } from '../src/utils/jwt'

let server: any
let adminToken: string

beforeAll(async () => {
  await prisma.$connect()
  server = app.listen(0)
  const adminUser = await prisma.user.create({ data: { name: 'Admin', email: `admin+${Date.now()}@example.com`, password: 'x', role: 'admin' } })
  adminToken = generateToken({ id: adminUser.id, role: 'admin', email: adminUser.email, name: adminUser.name })
})

afterAll(async () => {
  server && server.close()
  await prisma.$disconnect()
})

describe('Admin affiliate events endpoint', () => {
  it('requires admin authorization', async () => {
    const res = await request(server).get('/api/admin/affiliate-events')
    expect(res.status).toBe(401) // no token
  })

  it('returns event list when admin', async () => {
    // insert a fake event when the model exists in the test schema
    let inserted = false
    if ((prisma as any).affiliateEvent) {
      await (prisma as any).affiliateEvent.create({ data: { network: 'x', eventId: 'evt1', payloadHash: 'abc' } })
      inserted = true
    }

    const res = await request(server)
      .get('/api/admin/affiliate-events')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.events)).toBe(true)
    if (inserted) expect(res.body.events.find((e: any) => e.eventId === 'evt1')).toBeTruthy()
  })
})