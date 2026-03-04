import { z } from 'zod'

// Click tracking payload
export const clickSchema = z.object({
  offerId: z.coerce.number().int().positive(),
  clickId: z.string().min(1),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  externalSubId: z.string().optional(),
})

// Conversion tracking payload - requires either offerId or clickToken
export const conversionSchema = z.object({
  offerId: z.coerce.number().int().positive().optional(),
  clickId: z.string().optional(),
  clickToken: z.string().optional(),
  amount: z.coerce.number().nonnegative().optional(),
  status: z.string().optional(),
}).refine((data) => !!data.offerId || !!data.clickToken, {
  message: 'either offerId or clickToken is required',
  path: ['offerId', 'clickToken'],
})

// Earnings prediction uses query parameters
export const earningsPredictionSchema = z.object({
  offerId: z.coerce.number().int().positive(),
  clicks: z.coerce.number().int().positive(),
})

// Subscription request payload
export const subscriptionSchema = z.object({
  plan_id: z.coerce.number().int().positive(),
})

// Generic payments webhook body schema
export const webhookSchema = z.object({
  transactionId: z.string().min(1),
  status: z.string().optional(),
  amount: z.coerce.number().optional(),
  currency: z.string().optional(),
  userId: z.coerce.number().optional(),
})

export type ClickSchema = z.infer<typeof clickSchema>
export type ConversionSchema = z.infer<typeof conversionSchema>

