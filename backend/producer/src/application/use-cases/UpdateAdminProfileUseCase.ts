import { UserRepository, ProfileUpdateData } from '../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../domain/ports/AuditLogRepository';
import { ProfileNotFoundException } from '../../domain/exceptions/ProfileNotFoundException';
import { EmailAlreadyExistsException } from '../../domain/exceptions/EmailAlreadyExistsException';
import { RoleModificationNotAllowedException } from '../../domain/exceptions/RoleModificationNotAllowedException';
import { AdminProfileResult } from './GetAdminProfileUseCase';
import { logger } from '../../infrastructure/config/logger';

export interface UpdateAdminProfileInput {
  readonly username: string;
  readonly data: ProfileUpdateData;
}

export class UpdateAdminProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  async execute({ username, data }: UpdateAdminProfileInput): Promise<AdminProfileResult> {

    if ('role' in (data as Record<string, unknown>)) {
      throw new RoleModificationNotAllowedException();
    }

    logger.info('Executing UpdateAdminProfileUseCase', { username, fields: Object.keys(data) });

    const existing = await this.userRepository.findByUsername(username);
    if (!existing) {
      throw new ProfileNotFoundException(username);
    }

    if (data.email && data.email !== existing.email) {
      const emailOwner = await this.userRepository.findByEmail(data.email);
      if (emailOwner && emailOwner.id !== existing.id) {
        throw new EmailAlreadyExistsException(data.email);
      }
    }

    const updated = await this.userRepository.updateProfile(existing.id, data);

    await this.auditLogRepository.log({
      userId: existing.id,
      action: 'PROFILE_UPDATED',
      status: 'success',
      details: { changes: Object.keys(data) },
    });

    return {
      username:  updated.username,
      email:     updated.email,
      role:      updated.role,
      phone:     updated.phone ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
