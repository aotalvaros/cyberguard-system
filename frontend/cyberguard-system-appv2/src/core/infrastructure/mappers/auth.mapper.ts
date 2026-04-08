import { LoginRequestDto, LoginResponseDto, UserDto } from '../dto/auth.dto';
import { LoginCredentials } from '../../domain/models/login-credentials.model';
import { AuthResponse } from '../../domain/models/auth-response.model';
import { User } from '../../domain/models/user.model';
import { UserRole } from '../../../environments/constants';

export const toLoginRequestDto = (credentials: LoginCredentials): LoginRequestDto => ({
  username: credentials.username,
  password: credentials.password
});

export const toUser = (dto: UserDto): User => ({
  username: dto.username,
  role: dto.role as UserRole
});

export const toAuthResponse = (dto: LoginResponseDto): AuthResponse => ({
  token: dto.token,
  user: toUser(dto.user)
});

export const AuthMapper = {
  toLoginRequestDto,
  toUser,
  toAuthResponse
} as const;
