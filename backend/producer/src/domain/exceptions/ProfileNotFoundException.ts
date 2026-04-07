import { DomainError } from './DomainError';

export class ProfileNotFoundException extends DomainError {
  constructor(userId: string) {
    super(
      `Profile for user ${userId} not found`,
      'PROFILE_NOT_FOUND',
      { userId }
    );
  }
}
