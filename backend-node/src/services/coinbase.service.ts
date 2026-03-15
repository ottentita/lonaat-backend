import axios from 'axios'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ChargeResult {
  hosted_url: string
  charge_id: string
}

/**
 * create a charge using Coinbase Commerce API
 * returns hosted_url where the user can complete payment
 */
export async function createCharge(userId: number, tokens: number, price: number): Promise<ChargeResult> {
  const body = {
    name: "AI Token Package",
    description: "Purchase AI tokens",
    pricing_type: "fixed_price",
    local_price: {
      amount: price,
      currency: "USD"
    },
    metadata: {
      userId,
      tokens
    }
  }

  const resp = await axios.post("https://api.commerce.coinbase.com/charges", body, {
    headers: {
      "Content-Type": "application/json",
      "X-CC-Api-Key": process.env.COINBASE_COMMERCE_API_KEY || "",
      "X-CC-Version": "2018-03-22"
    }
  })

  const data = resp.data?.data
  if (!data) {
    throw new Error('Invalid response from Coinbase Commerce')
  }

  return {
    hosted_url: data.hosted_url,
    charge_id: data.id
  }
}

// webhook handler can be exported if needed but we'll implement in route file
type WebhookEvent = any // keep loose

export function verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature || !process.env.COINBASE_COMMERCE_WEBHOOK_SECRET) return false
  const computed = require('crypto')
    .createHmac('sha256', process.env.COINBASE_COMMERCE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  return computed === signature
}
