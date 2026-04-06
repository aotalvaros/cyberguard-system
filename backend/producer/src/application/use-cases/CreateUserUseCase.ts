import { v4 as uuidv4 } from 'uuid';
import { UserRepository, UserRecord } from '../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../domain/ports/AuditLogRepository';
import { UserAlreadyExistsError } from '../../domain/exceptions/UserAlreadyExistsError';
import { UserRole, isValidRole } from '../../domain/value-objects/UserRole';

export interface CreateUserInput {
  readonly email: string;
  readonly fullName: string;
  readonly role: string;
  readonly username: string;
}

export interface CreateUserOutput {
  readonly user: UserRecord;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditLogRepository,
  ) {}

  async execute(input: CreateUserInput, requestedBy: string): Promise<CreateUserOutput> {
    if (!input.fullName || input.fullName.trim() === '') {
      throw new Error('fullName is required and cannot be empty');
    }

    if (!isValidRole(input.role)) {
      throw new Error(`Invalid role '${input.role}'. Valid roles: ${Object.values(UserRole).join(', ')}`);
    }

    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new UserAlreadyExistsError(input.email);
    }

    const now = new Date();
    const newUser: UserRecord = {
      id:             uuidv4(),
      username:       input.username,
      email:          input.email,
      fullName:       input.fullName.trim(),
      role:           input.role as UserRole,
      isActive:       true,
      isLocked:       false,
      failedAttempts: 0,
      lastLogin:      null,
      createdAt:      now,
      updatedAt:      now,
    };

    const saved = await this.userRepository.save(newUser);

    await this.auditRepository.log({
      userId:  requestedBy,
      action:  'USER_CREATED',
      status:  'success',
      details: {
        targetUserId: saved.id,
        email:        saved.email,
        role:         saved.role,
      },
    });

    return { user: saved };
  }
}
