import rateLimit from 'express-rate-limit'

export const aiRateLimiter = rateLimit({
  windowMs: Number(process.env.AI_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.AI_RATE_MAX || 30),
  message: { error: 'Too many AI requests, please slow down' }
})

export default aiRateLimiter
