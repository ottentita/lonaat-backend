import morgan from 'morgan'

const isTest = process.env.NODE_ENV === 'test'

// In tests we disable verbose logging to keep output clean and fast.
export const logger = isTest
  ? (req: any, res: any, next: any) => next()
  : morgan(':method :url :status :response-time ms')

export default logger
