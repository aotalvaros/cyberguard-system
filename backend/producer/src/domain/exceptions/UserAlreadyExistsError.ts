import { DomainError } from './DomainError';

export class UserAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(
      'El correo electrónico ya está en uso',
      'USER_ALREADY_EXISTS',
      { email }
    );
  }
}
