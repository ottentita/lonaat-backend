import { AppError } from './AppError'

export class DuplicateClickError extends AppError {
  constructor() {
    super('Duplicate click detected', 409)
  }
}