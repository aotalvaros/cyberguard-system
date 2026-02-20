import { LoginCredentials } from '../../../../domain/ports/AuthProvider';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';


const mockGetIdToken = jest.fn<() => Promise<string>>();
const mockSignInWithEmailAndPassword = jest.fn();
const mockGetAuth = jest.fn();
const mockInitializeApp = jest.fn();

const createMockFirebaseUser = (uid: string, email: string) => ({
  uid,
  email,
  getIdToken: mockGetIdToken
});

jest.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword
}));

jest.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp
}));

import { FirebaseAuthProvider } from '../../../../infrastructure/providers/FirebaseAuthProvider';

describe('FirebaseAuthProvider', () => {
  let firebaseAuthProvider: FirebaseAuthProvider;
  let mockAuth: any;
  let mockApp: any;

  const mockConfig = {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock de Firebase App
    mockApp = { name: 'test-app' };
    mockInitializeApp.mockReturnValue(mockApp);

    // Mock de Firebase Auth
    mockAuth = { currentUser: null };
    mockGetAuth.mockReturnValue(mockAuth);

    // Crear instancia del provider
    firebaseAuthProvider = new FirebaseAuthProvider(mockConfig);
  });

  // ==========================================================================
  // INICIALIZACIÓN
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize Firebase app with provided config', () => {
      expect(mockInitializeApp).toHaveBeenCalledWith(mockConfig);
    });

    it('should get Firebase auth instance', () => {
      expect(mockGetAuth).toHaveBeenCalledWith(mockApp);
    });

    it('should be instantiable', () => {
      expect(firebaseAuthProvider).toBeInstanceOf(FirebaseAuthProvider);
    });

    it('should initialize with different configs', () => {
      const customConfig = {
        apiKey: 'custom-key',
        authDomain: 'custom.firebaseapp.com',
        projectId: 'custom-project'
      };

      const customProvider = new FirebaseAuthProvider(customConfig);

      expect(mockInitializeApp).toHaveBeenCalledWith(customConfig);
      expect(customProvider).toBeInstanceOf(FirebaseAuthProvider);
    });
  });

  // ==========================================================================
  // AUTENTICACIÓN EXITOSA
  // ==========================================================================

  describe('Successful Authentication', () => {
    it('should return success with user and token for valid credentials', async () => {
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'password123'
      };

      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'testuser@cyberguard.com');
      const mockToken = 'firebase-id-token-abc123';

      mockGetIdToken.mockResolvedValue(mockToken);
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      const result = await firebaseAuthProvider.authenticate(credentials);

      expect(result).toEqual({
        success: true,
        user: {
          id: 'uid-123',
          username: 'testuser',
          role: 'admin'
        },
        token: mockToken
      });
    });

    it('should call signInWithEmailAndPassword with correct email and password', async () => {
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'securepass123'
      };

      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'testuser@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      await firebaseAuthProvider.authenticate(credentials);

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'testuser@cyberguard.com',
        'securepass123'
      );
    });

    it('should get ID token from Firebase user', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(mockGetIdToken).toHaveBeenCalledTimes(1);
    });

    it('should return Firebase token in result', async () => {
      const expectedToken = 'firebase-specific-token-xyz';
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user@cyberguard.com');

      mockGetIdToken.mockResolvedValue(expectedToken);
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result.token).toBe(expectedToken);
    });

    it('should maintain username consistency in result', async () => {
      const originalUsername = 'john.doe';
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'john.doe@cyberguard.com');

      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      const result = await firebaseAuthProvider.authenticate({
        username: originalUsername,
        password: 'pass'
      });

      // El username original debe preservarse, no el email
      expect(result.user?.username).toBe(originalUsername);
    });

    it('should include Firebase UID in user result', async () => {
      const expectedUid = 'firebase-uid-xyz789';
      const mockFirebaseUser = createMockFirebaseUser(expectedUid, 'user@cyberguard.com');

      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result.user?.id).toBe(expectedUid);
    });
  });

  // ==========================================================================
  // MAPEO DE USERNAME A EMAIL
  // ==========================================================================

  describe('Username to Email Mapping', () => {
    it('should map simple username to @cyberguard.com email', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'admin@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      await firebaseAuthProvider.authenticate({
        username: 'admin',
        password: 'pass'
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'admin@cyberguard.com',
        'pass'
      );
    });

    it('should use email as-is when username already contains @', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user@example.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      await firebaseAuthProvider.authenticate({
        username: 'user@example.com',
        password: 'pass'
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'user@example.com',
        'pass'
      );
    });

    it('should handle username with dots', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'john.doe@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      await firebaseAuthProvider.authenticate({
        username: 'john.doe',
        password: 'pass'
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'john.doe@cyberguard.com',
        'pass'
      );
    });

    it('should handle username with numbers', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user123@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never as never);

      await firebaseAuthProvider.authenticate({
        username: 'user123',
        password: 'pass'
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'user123@cyberguard.com',
        'pass'
      );
    });

    it('should handle email from different domain', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'admin@company.org');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      await firebaseAuthProvider.authenticate({
        username: 'admin@company.org',
        password: 'pass'
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'admin@company.org',
        'pass'
      );
    });
  });

  // ==========================================================================
  // ROLES DE USUARIO
  // ==========================================================================

  describe('User Roles', () => {
    it('should return admin role (hardcoded for now)', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result.user?.role).toBe('admin');
    });

    it('should call getUserRole with Firebase UID', async () => {
      const expectedUid = 'firebase-uid-xyz';
      const mockFirebaseUser = createMockFirebaseUser(expectedUid, 'user@cyberguard.com');

      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      // Por ahora siempre retorna 'admin', pero verifica que el UID se use
      expect(result.user?.id).toBe(expectedUid);
      expect(result.user?.role).toBe('admin');
    });
  });

  // ==========================================================================
  // AUTENTICACIÓN FALLIDA
  // ==========================================================================

  describe('Failed Authentication', () => {
    it('should return failure when Firebase throws auth error', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(
        new Error('auth/wrong-password') as never
      );

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'wrong-password'
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials'
      });
    });

    it('should return generic error message for security', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(
        new Error('auth/user-not-found') as never
      );

      const result = await firebaseAuthProvider.authenticate({
        username: 'nonexistent',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      // No debe exponer detalles como "user-not-found"
    });

    it('should handle network errors', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(
        new Error('Network request failed') as never
      ); 

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle Firebase auth/invalid-email error', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(
        new Error('auth/invalid-email') as never
      ); 

      const result = await firebaseAuthProvider.authenticate({
        username: 'invalid-email-format',
        password: 'pass'
      });

      expect(result.success).toBe(false);
    });

    it('should handle Firebase auth/user-disabled error', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(
        new Error('auth/user-disabled') as never
      ); 

      const result = await firebaseAuthProvider.authenticate({
        username: 'disabled-user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should not include user or token in failed result', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(
        new Error('auth/wrong-password') as never
      );

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'wrong'
      });

      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });
  });

  // ==========================================================================
  // MANEJO DE ERRORES
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle when getIdToken throws error', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user@cyberguard.com');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);
      mockGetIdToken.mockRejectedValue(new Error('Token generation failed'));
      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle non-Error exceptions', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue('String error' as never);

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle null error', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(null as never);

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
    });

    it('should handle undefined error', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(undefined as never);

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty username', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', '@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      await firebaseAuthProvider.authenticate({
        username: '',
        password: 'pass'
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        '@cyberguard.com',
        'pass'
      );
    });

    it('should handle empty password', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      await firebaseAuthProvider.authenticate({
        username: 'user',
        password: ''
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'user@cyberguard.com',
        ''
      );
    });

    it('should handle very long username', async () => {
      const longUsername = 'a'.repeat(100);
      const mockFirebaseUser = createMockFirebaseUser('uid-123', `${longUsername}@cyberguard.com`);
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      const result = await firebaseAuthProvider.authenticate({
        username: longUsername,
        password: 'pass'
      });

      expect(result.success).toBe(true);
      expect(result.user?.username).toBe(longUsername);
    });

    it('should handle username with special characters', async () => {
      const specialUsername = 'user+test';
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user+test@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      await firebaseAuthProvider.authenticate({
        username: specialUsername,
        password: 'pass'
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'user+test@cyberguard.com',
        'pass'
      );
    });

    it('should handle username with multiple @ symbols', async () => {
      const weirdEmail = 'user@@example.com';
      const mockFirebaseUser = createMockFirebaseUser('uid-123', weirdEmail);
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      await firebaseAuthProvider.authenticate({
        username: weirdEmail,
        password: 'pass'
      });

      // Debe usar el email tal cual (ya contiene @)
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        weirdEmail,
        'pass'
      );
    });

    it('should handle unicode characters in username', async () => {
      const unicodeUsername = '用户名';
      const mockFirebaseUser = createMockFirebaseUser('uid-123', '用户名@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      const result = await firebaseAuthProvider.authenticate({
        username: unicodeUsername,
        password: 'pass'
      });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // IMPLEMENTACIÓN DE AUTHPROVIDER INTERFACE
  // ==========================================================================

  describe('AuthProvider Interface Implementation', () => {
    it('should implement authenticate method', () => {
      expect(typeof firebaseAuthProvider.authenticate).toBe('function');
    });

    it('should return AuthResult on success', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should return AuthResult on failure', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(new Error('Failed') as never);

      const result  = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'wrong'
      });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    it('should return User with required fields on success', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      const result = await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('username');
      expect(result.user).toHaveProperty('role');
    });
  });

  // ==========================================================================
  // INTEGRATION WITH FIREBASE SDK
  // ==========================================================================

  describe('Firebase SDK Integration', () => {
    it('should use Firebase Auth instance', async () => {
      const mockFirebaseUser = createMockFirebaseUser('uid-123', 'user@cyberguard.com');
      mockGetIdToken.mockResolvedValue('token');
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockFirebaseUser
      } as never);

      await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        expect.any(String),
        expect.any(String)
      );
    });

    it('should call Firebase methods in correct order', async () => {
      const callOrder: string[] = [];

      mockSignInWithEmailAndPassword.mockImplementation(async () => {
        callOrder.push('signIn');
        return {
          user: createMockFirebaseUser('uid-123', 'user@cyberguard.com')
        };
      });

      mockGetIdToken.mockImplementation(async () => {
        callOrder.push('getIdToken');
        return 'token';
      });

      await firebaseAuthProvider.authenticate({
        username: 'user',
        password: 'pass'
      });

      expect(callOrder).toEqual(['signIn', 'getIdToken']);
    });
  });

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  describe('Configuration', () => {
    it('should accept different API keys', () => {
      const config1 = { apiKey: 'key1', authDomain: 'test.com', projectId: 'proj1' };
      const config2 = { apiKey: 'key2', authDomain: 'test.com', projectId: 'proj2' };

      const provider1 = new FirebaseAuthProvider(config1);
      const provider2 = new FirebaseAuthProvider(config2);

      expect(provider1).toBeInstanceOf(FirebaseAuthProvider);
      expect(provider2).toBeInstanceOf(FirebaseAuthProvider);
      expect(mockInitializeApp).toHaveBeenCalledWith(config1);
      expect(mockInitializeApp).toHaveBeenCalledWith(config2);
    });

    it('should handle minimal config', () => {
      const minimalConfig = {
        apiKey: 'key',
        authDomain: 'domain',
        projectId: 'project'
      };

      const provider = new FirebaseAuthProvider(minimalConfig);

      expect(provider).toBeInstanceOf(FirebaseAuthProvider);
      expect(mockInitializeApp).toHaveBeenCalledWith(minimalConfig);
    });
  });
});