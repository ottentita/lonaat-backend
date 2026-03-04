import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export function validate(schema: ZodSchema<any>, location: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = (req as any)[location]
    const result = schema.safeParse(data)
    if (!result.success) {
      const issues = (result.error && (result.error as ZodError).issues) || []
      const errors = issues.map((e: any) => ({ path: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''), message: e.message }))
      return res.status(400).json({ errors })
    }
    ;(req as any).validated = result.data
    return next()
  }
}

export default validate
