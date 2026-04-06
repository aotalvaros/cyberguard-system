import { DomainError } from './DomainError';

export class UserNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(
      `User '${identifier}' not found`,
      'USER_NOT_FOUND',
      { identifier }
    );
  }
}
