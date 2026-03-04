import { AppError } from './AppError'

export class InsufficientTokensError extends AppError {
  constructor() {
    super('Insufficient tokens', 400)
  }
}