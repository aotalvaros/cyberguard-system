export interface AuthProvider {
  authenticate(credentials: LoginCredentials): Promise<AuthResult>;
  createUser?(userData: CreateUserRequest): Promise<User>;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'admin' | 'analyst' | 'viewer';
}

export interface User {
  id: string;
  username: string;
  role: string;
}
