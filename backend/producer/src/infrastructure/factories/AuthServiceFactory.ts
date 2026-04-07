import { AuthService } from '../../application/services/AuthService';
import { config } from '../config/env';
import { FirebaseAuthProvider } from '../providers/FirebaseAuthProvider';
import { JWTTokenService } from '../providers/JWTTokenService';
import { PostgresUserRepository } from '../persistence/PostgresUserRepository';
import { PostgresAuditLogRepository } from '../persistence/PostgresAuditLogRepository';

export function createAuthService(): AuthService {
  const authProvider = new FirebaseAuthProvider({
    apiKey: config.firebaseApiKey,
    authDomain: config.firebaseAuthDomain,
    projectId: config.firebaseProjectId
  });

  const tokenService = new JWTTokenService();
  const userRepository = new PostgresUserRepository();
  const auditLogRepository = new PostgresAuditLogRepository();

  return new AuthService(authProvider, tokenService, userRepository, auditLogRepository);
}
