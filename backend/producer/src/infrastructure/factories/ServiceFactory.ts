import { ThreatService } from '../../application/services/threat.service';
import { AuthService } from '../../application/services/AuthService';
import { ListThreatsUseCase } from '../../application/use-cases/ListThreatsUseCase';
import { RabbitMQPublisher } from '../providers/RabbitMQPublisher';
import { FirebaseAuthProvider } from '../providers/FirebaseAuthProvider';
import { JWTTokenService } from '../providers/JWTTokenService';
import { SortedThreatRepository } from '../persistence/SortedThreatRepository';
import { ThreatRepository } from '../../domain/ports/ThreatRepository';
import { config } from '../config/env';

/**
 * 🏭 SERVICE FACTORY - Composición de Dependencias
 * 
 * Patrón: Singleton
 * Responsabilidad: Crear e inyectar dependencias en toda la aplicación
 * 
 * Beneficios:
 * ✅ Un único punto de composición
 * ✅ Reutilización de instancias (singleton)
 * ✅ Fácil para mocking en tests
 * ✅ Desacoplamiento entre capas
 */
export class ServiceFactory {
  // ✅ Singletons
  private static threatRepository: ThreatRepository | null = null;
  private static threatService: ThreatService | null = null;
  private static listThreatsUseCase: ListThreatsUseCase | null = null;
  private static authService: AuthService | null = null;

  /**
   * ✅ Obtener instancia del repositorio de amenazas
   * Implementa ThreatRepository (port)
   */
  static getThreatRepository(): ThreatRepository {
    if (!this.threatRepository) {
      this.threatRepository = new SortedThreatRepository();
    }
    return this.threatRepository;
  }

  /**
   * ✅ Obtener instancia del servicio de amenazas
   * Inyecta: EventPublisher (port), ThreatRepository (port)
   */
  static getThreatService(): ThreatService {
    if (!this.threatService) {
      const eventPublisher = new RabbitMQPublisher();
      this.threatService = new ThreatService(eventPublisher, this.getThreatRepository());
    }
    return this.threatService;
  }

  /**
   * ✅ Obtener instancia del use case de listar amenazas
   * Inyecta: ThreatRepository (port)
   */
  static getListThreatsUseCase(): ListThreatsUseCase {
    if (!this.listThreatsUseCase) {
      this.listThreatsUseCase = new ListThreatsUseCase(this.getThreatRepository());
    }
    return this.listThreatsUseCase;
  }

  /**
   * ✅ Obtener instancia del servicio de autenticación
   * Inyecta: AuthProvider (port), TokenService (port)
   */
  static getAuthService(): AuthService {
    if (!this.authService) {
      const firebaseConfig = {
        apiKey: config.firebaseApiKey,
        authDomain: config.firebaseAuthDomain,
        projectId: config.firebaseProjectId
      };
      const authProvider = new FirebaseAuthProvider(firebaseConfig);
      const tokenService = new JWTTokenService();
      this.authService = new AuthService(authProvider, tokenService);
    }
    return this.authService;
  }

  /**
   * ✅ Resetear todas las instancias (solo para testing)
   */
  static resetForTesting(): void {
    this.threatRepository = null;
    this.threatService = null;
    this.listThreatsUseCase = null;
    this.authService = null;
  }
}