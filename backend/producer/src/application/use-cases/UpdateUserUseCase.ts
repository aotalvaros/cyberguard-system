import { UserRepository, UserRecord } from '../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../domain/ports/AuditLogRepository';
import { UserNotFoundError } from '../../domain/exceptions/UserNotFoundError';
import { SelfModificationForbiddenError } from '../../domain/exceptions/SelfModificationForbiddenError';

export interface UpdateUserInput {
  readonly id: string;
  readonly fullName?: string;
  readonly role?: string;
  readonly requestedBy: string;
}

export interface UpdateUserOutput {
  readonly user: UserRecord;
}
export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditLogRepository,
  ) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    const user = await this.userRepository.findById(input.id);
    if (!user) {
      throw new UserNotFoundError(input.id);
    }

    if (input.role && input.id === input.requestedBy) {
      throw new SelfModificationForbiddenError('role_change');
    }

    const updatePayload: Partial<UserRecord> = {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.role     !== undefined ? { role:     input.role     } : {}),
      updatedAt: new Date(),
    };

    const updated = await this.userRepository.update(input.id, updatePayload);

    if (input.role !== undefined && input.role !== user.role) {
      await this.auditRepository.log({
        userId:  input.requestedBy,
        action:  'USER_ROLE_UPDATED',
        status:  'success',
        details: {
          targetUserId: input.id,
          previousRole: user.role,
          newRole:      input.role,
        },
      });
    } else {
      await this.auditRepository.log({
        userId:  input.requestedBy,
        action:  'USER_UPDATED',
        status:  'success',
        details: { targetUserId: input.id },
      });
    }

    return { user: updated };
  }
}
