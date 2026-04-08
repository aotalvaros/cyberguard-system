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

export class GetAdminProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute({ username }: GetAdminProfileInput): Promise<AdminProfileResult> {
    logger.info('Executing GetAdminProfileUseCase', { username });

    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      throw new ProfileNotFoundException(username);
    }

    return {
      username:  user.username,
      email:     user.email,
      role:      user.role,
      phone:     user.phone ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
