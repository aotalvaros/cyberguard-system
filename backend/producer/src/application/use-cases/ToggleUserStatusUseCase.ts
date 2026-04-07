import { UserRepository, UserRecord } from '../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../domain/ports/AuditLogRepository';
import { IncidentRepository } from '../../domain/ports/IncidentRepository';
import { UserNotFoundError } from '../../domain/exceptions/UserNotFoundError';
import { SelfModificationForbiddenError } from '../../domain/exceptions/SelfModificationForbiddenError';

export interface ToggleUserStatusInput {
  readonly id: string;
  readonly isActive: boolean;
  readonly requestedBy: string;
}

export interface ToggleUserStatusOutput {
  readonly user: UserRecord;
  readonly reassignedIncidents: number;
}

export class ToggleUserStatusUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditLogRepository,
    private readonly incidentRepository: IncidentRepository,
  ) {}

  async execute(input: ToggleUserStatusInput): Promise<ToggleUserStatusOutput> {
    const user = await this.userRepository.findById(input.id);
    if (!user) {
      throw new UserNotFoundError(input.id);
    }

    if (!input.isActive && input.id === input.requestedBy) {
      throw new SelfModificationForbiddenError('deactivation');
    }

    let reassignedIncidents = 0;

    if (!input.isActive) {
      reassignedIncidents = await this.incidentRepository.unassignByUserId(input.id);
    }

    const updated = await this.userRepository.update(input.id, {
      isActive:  input.isActive,
      updatedAt: new Date(),
    });

    const action = input.isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED';
    await this.auditRepository.log({
      userId:  input.requestedBy,
      action,
      status:  'success',
      details: {
        targetUserId:        input.id,
        reassignedIncidents: reassignedIncidents,
      },
    });

    return { user: updated, reassignedIncidents };
  }
}
