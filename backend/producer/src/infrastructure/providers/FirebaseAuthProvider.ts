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
  
  constructor(private config: FirebaseConfig) {
    const app: FirebaseApp = initializeApp(config);
    this.auth = getAuth(app);
  }
  
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Firebase usa email, pero mapeamos username -> email
      const email = this.mapUsernameToEmail(credentials.username);
      
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        credentials.password
      );
      
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken();
      
      const user: User = {
        id: firebaseUser.uid,
        username: credentials.username, // Mantenemos consistencia
        role: await this.getUserRole(firebaseUser.uid)
      };
      
      return {
        success: true,
        user,
        token
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
  // Si no, mapear username -> email
  return `${username}@cyberguard.com`;
}
  
  private async getUserRole(uid: string): Promise<string> {
    // Por ahora hardcoded, después con Firestore
    return 'admin';
  }
}