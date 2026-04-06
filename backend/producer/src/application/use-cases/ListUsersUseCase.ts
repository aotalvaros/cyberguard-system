import { UserRepository, UserRecord } from '../../domain/ports/UserRepository';

export interface UserListItem {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly fullName: string | null;
  readonly role: string;
  readonly isActive: boolean;
  readonly isLocked: boolean;
  readonly lastLogin: Date | null;
  readonly createdAt: Date;
}

export interface ListUsersOutput {
  readonly users: UserListItem[];
  readonly total: number;
}

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<ListUsersOutput> {
    const records: UserRecord[] = await this.userRepository.findAll();

    const users: UserListItem[] = records.map(u => ({
      id:        u.id,
      username:  u.username,
      email:     u.email,
      fullName:  u.fullName,
      role:      u.role,
      isActive:  u.isActive,
      isLocked:  u.isLocked,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
    }));

    return { users, total: users.length };
  }
}
