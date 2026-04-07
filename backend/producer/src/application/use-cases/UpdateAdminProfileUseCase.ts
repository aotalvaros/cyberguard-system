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

/**
 * Use Case: UpdateAdminProfileUseCase
 *
 * Actualiza los datos de perfil del administrador y registra la acción en auditoría.
 * SRP §3.1: única responsabilidad — mutación de perfil + auditoría.
 * DIP §3.5: depende de ports, no de implementaciones concretas.
 * OCP §3.2: la validación de role se hace en este use case sin modificar el repositorio.
 */
export class UpdateAdminProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  async execute({ username, data }: UpdateAdminProfileInput): Promise<AdminProfileResult> {
    // ⚠️ HUMAN CHECK: role excluido a nivel de tipo, pero se verifica en runtime
    // para proteger contra casts maliciosos desde el controller
    if ('role' in (data as Record<string, unknown>)) {
      throw new RoleModificationNotAllowedException();
    }

    logger.info('Executing UpdateAdminProfileUseCase', { username, fields: Object.keys(data) });

    const existing = await this.userRepository.findByUsername(username);
    if (!existing) {
      throw new ProfileNotFoundException(username);
    }

    // Verificar unicidad de email si se está intentando cambiar
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

    // ⚠️ HUMAN CHECK: campos sensibles excluidos de la respuesta (§6.1 #6)
    return {
      username:  updated.username,
      email:     updated.email,
      role:      updated.role,
      phone:     updated.phone,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
