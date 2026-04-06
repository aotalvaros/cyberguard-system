import { UserRole } from '../../../environments/constants';

export interface User {
  readonly username:  string;
  readonly email:     string;
  readonly role:      UserRole;
  readonly phone:     string | null;
  readonly createdAt?: string;
}
