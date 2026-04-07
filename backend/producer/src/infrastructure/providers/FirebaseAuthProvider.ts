import { getAuth, signInWithEmailAndPassword, Auth } from 'firebase/auth';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { AuthProvider, AuthResult, LoginCredentials, User } from '../../domain/ports/AuthProvider';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

export class FirebaseAuthProvider implements AuthProvider {
  private auth: Auth;

  constructor(config: FirebaseConfig) {
    const app: FirebaseApp = initializeApp(config);
    this.auth = getAuth(app);
  }

  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    try {

      const email = this.mapUsernameToEmail(credentials.username);

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        credentials.password
      );

      const firebaseUser = userCredential.user;

      const idToken = await firebaseUser.getIdToken(true);
      const decodedToken = await firebaseUser.getIdTokenResult(true);

      const role = this.extractRoleFromClaims(decodedToken.claims);

      const user: User = {
        id: firebaseUser.uid,
        username: credentials.username,
        role
      };

      return {
        success: true,
        user,
        token: idToken
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }
  }

  private mapUsernameToEmail(username: string): string {
    if (username.includes('@')) {
      return username;
    }
    return `${username}@cyberguard.com`;
  }

  private extractRoleFromClaims(claims: Record<string, unknown>): string {
    const validRoles = ['admin', 'analyst', 'viewer'];
    const claimRole = claims['role'];
    if (typeof claimRole === 'string' && validRoles.includes(claimRole)) {
      return claimRole;
    }

    return 'viewer';
  }
}
