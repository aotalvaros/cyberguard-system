/**
 * Mappers para convertir entre DTOs de autenticación y modelos de dominio.
 * 
 * Los mappers proporcionan una capa de abstracción entre la API y el dominio,
 * permitiendo que cambios en la API no afecten directamente al dominio.
 */

import { LoginRequestDto, LoginResponseDto, UserDto } from '../dto/auth.dto';
import { LoginCredentials } from '../../domain/models/login-credentials.model';
import { AuthResponse } from '../../domain/models/auth-response.model';
import { User } from '../../domain/models/user.model';
import { UserRole } from '../../../environments/constants';

/**
 * Convierte credenciales de dominio a DTO de petición
 */
export const toLoginRequestDto = (credentials: LoginCredentials): LoginRequestDto => ({
  username: credentials.username,
  password: credentials.password
});

/**
 * Convierte DTO de usuario a modelo de dominio
 */
export const toUser = (dto: UserDto): User => ({
  username: dto.username,
  role: dto.role as UserRole
});

/**
 * Convierte DTO de respuesta de login a modelo de dominio
 */
export const toAuthResponse = (dto: LoginResponseDto): AuthResponse => ({
  token: dto.token,
  user: toUser(dto.user)
});

/**
 * Namespace para agrupar mappers de auth
 */
export const AuthMapper = {
  toLoginRequestDto,
  toUser,
  toAuthResponse
} as const;
