import { AuthService } from '../../application/services/AuthService';
import { config } from '../config/env';
import { FirebaseAuthProvider } from '../providers/FirebaseAuthProvider';
import { JWTTokenService } from '../providers/JWTTokenService';

// Tomorrow: PostgreSQLAuthProvider
// import { PostgreSQLAuthProvider } from '../auth/PostgreSQLAuthProvider';

export function createAuthService(): AuthService {

  const authProvider = new FirebaseAuthProvider({
    apiKey: config.firebaseApiKey,
    authDomain: config.firebaseAuthDomain,
    projectId: config.firebaseProjectId
  });
  
  // Tomorrow: 
  // const authProvider = new PostgreSQLAuthProvider(database);
  
  const tokenService = new JWTTokenService();
  
  return new AuthService(authProvider, tokenService);
}