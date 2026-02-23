import { ThreatService } from '../../application/services/threat.service';
import { AuthService } from '../../application/services/AuthService';
import { ListThreatsUseCase } from '../../application/use-cases/ListThreatsUseCase';
import { DeleteThreatUseCase } from '../../application/use-cases/DeleteThreatUseCase';
import { GetThreatStatisticsUseCase } from '../../application/use-cases/GetThreatStatisticsUseCase';
import { PostgresThreatStatisticsRepository } from '../persistence/PostgresThreatStatisticsRepository';
import { RabbitMQPublisher } from '../providers/RabbitMQPublisher';
import { FirebaseAuthProvider } from '../providers/FirebaseAuthProvider';
import { JWTTokenService } from '../providers/JWTTokenService';
import { PostgresThreatRepository } from '../persistence/PostgresThreatRepository';
import { PostgresUserRepository } from '../persistence/PostgresUserRepository';
import { PostgresAuditLogRepository } from '../persistence/PostgresAuditLogRepository';
import { ThreatRepository } from '../../domain/ports/ThreatRepository';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../domain/ports/AuditLogRepository';
import { ThreatClassifier } from '../../domain/services/ThreatClassifier';
import {
  MalwareClassificationStrategy,
  IntrusionClassificationStrategy,
  PhishingClassificationStrategy,
  DdosClassificationStrategy,
  RansomwareClassificationStrategy,
} from '../classification/ThreatClassificationStrategies';
import { config } from '../config/env';

export class ServiceFactory {
  private static threatRepository: ThreatRepository | null = null;
  private static threatService: ThreatService | null = null;
  private static listThreatsUseCase: ListThreatsUseCase | null = null;
  private static deleteThreatUseCase: DeleteThreatUseCase | null = null;
  private static authService: AuthService | null = null;
  private static userRepository: UserRepository | null = null;
  private static auditLogRepository: AuditLogRepository | null = null;
  private static threatClassifier: ThreatClassifier | null = null;

  /**
   * ✅ Obtener instancia del repositorio de amenazas
   * Implementa ThreatRepository (port)
   */
  static getThreatRepository(): ThreatRepository {
    if (!this.threatRepository) {
      this.threatRepository = new PostgresThreatRepository();
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
   * ✅ Obtener instancia del use case de eliminar amenaza
   * Inyecta: ThreatRepository (port)
   */
  static getDeleteThreatUseCase(): DeleteThreatUseCase {
    if (!this.deleteThreatUseCase) {
      this.deleteThreatUseCase = new DeleteThreatUseCase(this.getThreatRepository());
    }
    return this.deleteThreatUseCase;
  }

  /**
   * ✅ Obtener instancia del repositorio de usuarios
   * Implementa UserRepository (port)
   */
  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new PostgresUserRepository();
    }
    return this.userRepository;
  }

  /**
   * ✅ Obtener instancia del repositorio de auditoría
   * Implementa AuditLogRepository (port)
   */
  static getAuditLogRepository(): AuditLogRepository {
    if (!this.auditLogRepository) {
      this.auditLogRepository = new PostgresAuditLogRepository();
    }
    return this.auditLogRepository;
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
      this.authService = new AuthService(
        authProvider,
        tokenService,
        this.getUserRepository(),
        this.getAuditLogRepository()
      );
    }
    return this.authService;
  }

  /**
   * ✅ Obtener instancia del use case de estadísticas de amenazas
   * Inyecta: ThreatStatisticsRepository (port)
   * No se cachea — use case sin estado, creación ligera.
   */
  static getStatisticsUseCase(): GetThreatStatisticsUseCase {
    const repo = new PostgresThreatStatisticsRepository();
    return new GetThreatStatisticsUseCase(repo);
  }

  /**
   * ✅ Resetear todas las instancias (solo para testing)
   */
  static resetForTesting(): void {
    this.threatRepository = null;
    this.threatService = null;
    this.listThreatsUseCase = null;
    this.deleteThreatUseCase = null;
    this.authService = null;
    this.userRepository = null;
    this.auditLogRepository = null;
    this.threatClassifier = null;
  }

  /**
   * ✅ Obtener instancia del clasificador de amenazas
   * Strategy Pattern: Registra todas las estrategias de clasificación
   */
  static getThreatClassifier(): ThreatClassifier {
    if (!this.threatClassifier) {
      this.threatClassifier = new ThreatClassifier([
        new MalwareClassificationStrategy(),
        new IntrusionClassificationStrategy(),
        new PhishingClassificationStrategy(),
        new DdosClassificationStrategy(),
        new RansomwareClassificationStrategy(),
      ]);
    }
    return this.threatClassifier;
  }
}