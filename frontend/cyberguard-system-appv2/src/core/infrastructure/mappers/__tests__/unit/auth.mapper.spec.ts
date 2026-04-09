// Tipo de prueba: Unitario
import { describe, it, expect } from 'vitest';
import { AuthMapper, toLoginRequestDto, toUser, toAuthResponse } from '../../auth.mapper';
import { LoginCredentials } from '../../../../domain/models/login-credentials.model';
import { LoginResponseDto, UserDto } from '../../../dto/auth.dto';

describe('AuthMapper', () => {
  describe('toLoginRequestDto', () => {
    it('should convert LoginCredentials to LoginRequestDto', () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'secret123'
      };

      const result = toLoginRequestDto(credentials);

      expect(result).toEqual({
        username: 'admin',
        password: 'secret123'
      });
    });

    it('should preserve readonly properties', () => {
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'testpass'
      };

      const result = toLoginRequestDto(credentials);

      expect(result.username).toBe('testuser');
      expect(result.password).toBe('testpass');
    });
  });

  describe('toUser', () => {
    it('should convert UserDto to User domain model', () => {
      const userDto: UserDto = {
        username: 'admin',
        role: 'admin'
      };

      const result = toUser(userDto);

      expect(result).toEqual({
        username: 'admin',
        role: 'admin'
      });
    });
  });

  describe('toAuthResponse', () => {
    it('should convert LoginResponseDto to AuthResponse domain model', () => {
      const responseDto: LoginResponseDto = {
        token: 'jwt-token-123',
        user: {
          username: 'admin',
          role: 'admin'
        }
      };

      const result = toAuthResponse(responseDto);

      expect(result.token).toBe('jwt-token-123');
      expect(result.user.username).toBe('admin');
      expect(result.user.role).toBe('admin');
    });

    it('should properly nest user object', () => {
      const responseDto: LoginResponseDto = {
        token: 'token',
        user: {
          username: 'testuser',
          role: 'user'
        }
      };

      const result = toAuthResponse(responseDto);

      expect(result.user).toBeDefined();
      expect(typeof result.user).toBe('object');
    });
  });

  describe('AuthMapper namespace', () => {
    it('should expose all mapper functions', () => {
      expect(AuthMapper.toLoginRequestDto).toBeDefined();
      expect(AuthMapper.toUser).toBeDefined();
      expect(AuthMapper.toAuthResponse).toBeDefined();
    });
  });
});
