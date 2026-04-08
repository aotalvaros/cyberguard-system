import { ThreatService } from '../../application/services/threat.service';
import { AuthService } from '../../application/services/AuthService';
import { ListThreatsUseCase } from '../../application/use-cases/ListThreatsUseCase';
import { DeleteThreatUseCase } from '../../application/use-cases/DeleteThreatUseCase';
import { GetThreatStatisticsUseCase } from '../../application/use-cases/GetThreatStatisticsUseCase';
import { GetNotificationPreferencesUseCase } from '../../application/use-cases/GetNotificationPreferencesUseCase';
import { SaveNotificationPreferencesUseCase } from '../../application/use-cases/SaveNotificationPreferencesUseCase';
import { GetAdminProfileUseCase } from '../../application/use-cases/GetAdminProfileUseCase';
import { UpdateAdminProfileUseCase } from '../../application/use-cases/UpdateAdminProfileUseCase';
import { CreateUserUseCase } from '../../application/use-cases/CreateUserUseCase';
import { UpdateUserUseCase } from '../../application/use-cases/UpdateUserUseCase';
import { ToggleUserStatusUseCase } from '../../application/use-cases/ToggleUserStatusUseCase';
import { ListUsersUseCase } from '../../application/use-cases/ListUsersUseCase';
import { CreateIncidentUseCase } from '../../application/use-cases/CreateIncidentUseCase';
import { ListIncidentsUseCase } from '../../application/use-cases/ListIncidentsUseCase';
import { PostgresThreatStatisticsRepository } from '../persistence/PostgresThreatStatisticsRepository';
import { RabbitMQPublisher } from '../providers/RabbitMQPublisher';
import { FirebaseAuthProvider } from '../providers/FirebaseAuthProvider';
import { JWTTokenService } from '../providers/JWTTokenService';
import { PostgresThreatRepository } from '../persistence/PostgresThreatRepository';
import { PostgresUserRepository } from '../persistence/PostgresUserRepository';
import { PostgresAuditLogRepository } from '../persistence/PostgresAuditLogRepository';
import { PostgresIncidentRepository } from '../persistence/PostgresIncidentRepository';
import { RedisNotificationPreferencesRepository } from '../persistence/RedisNotificationPreferencesRepository';
import { ThreatRepository } from '../../domain/ports/ThreatRepository';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../domain/ports/AuditLogRepository';
import { IncidentRepository } from '../../domain/ports/IncidentRepository';
import { NotificationPreferencesRepository } from '../../domain/ports/NotificationPreferencesRepository';
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
  private static incidentRepository: IncidentRepository | null = null;
  private static threatClassifier: ThreatClassifier | null = null;
  private static createUserUseCase: CreateUserUseCase | null = null;
  private static createIncidentUseCase: CreateIncidentUseCase | null = null;
  private static listIncidentsUseCase: ListIncidentsUseCase | null = null;
  private static updateUserUseCase: UpdateUserUseCase | null = null;
  private static toggleUserStatusUseCase: ToggleUserStatusUseCase | null = null;
  private static listUsersUseCase: ListUsersUseCase | null = null;
  private static notifPrefsRepository: NotificationPreferencesRepository | null = null;
  private static getNotifPrefsUseCase: GetNotificationPreferencesUseCase | null = null;
  private static saveNotifPrefsUseCase: SaveNotificationPreferencesUseCase | null = null;
  private static getAdminProfileUseCase: GetAdminProfileUseCase | null = null;
  private static updateAdminProfileUseCase: UpdateAdminProfileUseCase | null = null;

  static getThreatRepository(): ThreatRepository {
    if (!this.threatRepository) {
      this.threatRepository = new PostgresThreatRepository();
    }
    return this.threatRepository;
  }

  static getThreatService(): ThreatService {
    if (!this.threatService) {
      const eventPublisher = new RabbitMQPublisher();
      this.threatService = new ThreatService(eventPublisher, this.getThreatRepository());
    }
    return this.threatService;
  }

  static getListThreatsUseCase(): ListThreatsUseCase {
    if (!this.listThreatsUseCase) {
      this.listThreatsUseCase = new ListThreatsUseCase(this.getThreatRepository());
    }
    return this.listThreatsUseCase;
  }

  static getDeleteThreatUseCase(): DeleteThreatUseCase {
    if (!this.deleteThreatUseCase) {
      this.deleteThreatUseCase = new DeleteThreatUseCase(this.getThreatRepository());
    }
    return this.deleteThreatUseCase;
  }

  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new PostgresUserRepository();
    }
    return this.userRepository;
  }

  static getAuditLogRepository(): AuditLogRepository {
    if (!this.auditLogRepository) {
      this.auditLogRepository = new PostgresAuditLogRepository();
    }
    return this.auditLogRepository;
  }

  static getIncidentRepository(): IncidentRepository {
    if (!this.incidentRepository) {
      this.incidentRepository = new PostgresIncidentRepository();
    }
    return this.incidentRepository;
  }

  static getCreateUserUseCase(): CreateUserUseCase {
    if (!this.createUserUseCase) {
      this.createUserUseCase = new CreateUserUseCase(
        this.getUserRepository(),
        this.getAuditLogRepository(),
      );
    }
    return this.createUserUseCase;
  }

  static getUpdateUserUseCase(): UpdateUserUseCase {
    if (!this.updateUserUseCase) {
      this.updateUserUseCase = new UpdateUserUseCase(
        this.getUserRepository(),
        this.getAuditLogRepository(),
      );
    }
    return this.updateUserUseCase;
  }

  static getToggleUserStatusUseCase(): ToggleUserStatusUseCase {
    if (!this.toggleUserStatusUseCase) {
      this.toggleUserStatusUseCase = new ToggleUserStatusUseCase(
        this.getUserRepository(),
        this.getAuditLogRepository(),
        this.getIncidentRepository(),
      );
    }
    return this.toggleUserStatusUseCase;
  }

  static getListUsersUseCase(): ListUsersUseCase {
    if (!this.listUsersUseCase) {
      this.listUsersUseCase = new ListUsersUseCase(this.getUserRepository());
    }
    return this.listUsersUseCase;
  }

  static getCreateIncidentUseCase(): CreateIncidentUseCase {
    if (!this.createIncidentUseCase) {
      this.createIncidentUseCase = new CreateIncidentUseCase(
        this.getThreatRepository(),
        this.getIncidentRepository(),
        this.getAuditLogRepository(),
      );
    }
    return this.createIncidentUseCase;
  }

  static getListIncidentsUseCase(): ListIncidentsUseCase {
    if (!this.listIncidentsUseCase) {
      this.listIncidentsUseCase = new ListIncidentsUseCase(this.getIncidentRepository());
    }
    return this.listIncidentsUseCase;
  }

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

  static getStatisticsUseCase(): GetThreatStatisticsUseCase {
    const repo = new PostgresThreatStatisticsRepository();
    return new GetThreatStatisticsUseCase(repo);
  }

  static getNotifPrefsRepository(): NotificationPreferencesRepository {
    if (!this.notifPrefsRepository) {
      this.notifPrefsRepository = new RedisNotificationPreferencesRepository();
    }
    return this.notifPrefsRepository;
  }

  static getGetNotifPrefsUseCase(): GetNotificationPreferencesUseCase {
    if (!this.getNotifPrefsUseCase) {
      this.getNotifPrefsUseCase = new GetNotificationPreferencesUseCase(this.getNotifPrefsRepository());
    }
    return this.getNotifPrefsUseCase;
  }

  static getSaveNotifPrefsUseCase(): SaveNotificationPreferencesUseCase {
    if (!this.saveNotifPrefsUseCase) {
      this.saveNotifPrefsUseCase = new SaveNotificationPreferencesUseCase(this.getNotifPrefsRepository());
    }
    return this.saveNotifPrefsUseCase;
  }

  static getGetAdminProfileUseCase(): GetAdminProfileUseCase {
    if (!this.getAdminProfileUseCase) {
      this.getAdminProfileUseCase = new GetAdminProfileUseCase(this.getUserRepository());
    }
    return this.getAdminProfileUseCase;
  }

  static getUpdateAdminProfileUseCase(): UpdateAdminProfileUseCase {
    if (!this.updateAdminProfileUseCase) {
      this.updateAdminProfileUseCase = new UpdateAdminProfileUseCase(
        this.getUserRepository(),
        this.getAuditLogRepository()
      );
    }
    return this.updateAdminProfileUseCase;
  }

  static resetForTesting(): void {
    this.threatRepository = null;
    this.threatService = null;
    this.listThreatsUseCase = null;
    this.deleteThreatUseCase = null;
    this.authService = null;
    this.userRepository = null;
    this.auditLogRepository = null;
    this.incidentRepository = null;
    this.threatClassifier = null;
    this.createUserUseCase = null;
    this.updateUserUseCase = null;
    this.toggleUserStatusUseCase = null;
    this.listUsersUseCase = null;
    this.createIncidentUseCase = null;
    this.listIncidentsUseCase = null;
    this.notifPrefsRepository = null;
    this.getNotifPrefsUseCase = null;
    this.saveNotifPrefsUseCase = null;
    this.getAdminProfileUseCase = null;
    this.updateAdminProfileUseCase = null;
  }

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