import { DomainError } from './DomainError';

export class SelfModificationForbiddenError extends DomainError {
  constructor(action: 'role_change' | 'deactivation') {
    const messages: Record<typeof action, string> = {
      role_change:  'No puede modificar su propio rol',
      deactivation: 'No puede desactivar su propia cuenta',
    };
    super(messages[action], 'SELF_MODIFICATION_FORBIDDEN', { action });
  }
}
