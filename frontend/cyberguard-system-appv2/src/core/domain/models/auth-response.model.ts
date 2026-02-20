import { User } from './user.model';

export interface AuthResponse {
  readonly token: string;
  readonly user: User;
}
