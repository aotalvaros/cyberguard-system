import { DomainError } from './DomainError';

export class RoleModificationNotAllowedException extends DomainError {
  constructor() {
    super(
      'Role modification is not allowed through this endpoint',
      'ROLE_MODIFICATION_NOT_ALLOWED'
    );
  }
}
