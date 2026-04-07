import { UserRepository } from '../../domain/ports/UserRepository';
import { ProfileNotFoundException } from '../../domain/exceptions/ProfileNotFoundException';
import { logger } from '../../infrastructure/config/logger';

export interface AdminProfileResult {
  readonly username: string;
  readonly email: string;
  readonly role: string;
  readonly phone: string | null;
  readonly createdAt: string;
}

export interface GetAdminProfileInput {
  readonly username: string;
}

/**
 * Use Case: GetAdminProfileUseCase
 *
 * Retorna los datos de perfil del administrador excluye campos sensibles.
 * SRP §3.1: única responsabilidad — consulta de perfil.
 * DIP §3.5: depende del port UserRepository, no de PostgresUserRepository.
 */
export class GetAdminProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute({ username }: GetAdminProfileInput): Promise<AdminProfileResult> {
    logger.info('Executing GetAdminProfileUseCase', { username });

    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      throw new ProfileNotFoundException(username);
    }

    // ⚠️ HUMAN CHECK: campos sensibles (isLocked, failedAttempts, lastLogin) excluidos explícitamente
    return {
      username:  user.username,
      email:     user.email,
      role:      user.role,
      phone:     user.phone,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
