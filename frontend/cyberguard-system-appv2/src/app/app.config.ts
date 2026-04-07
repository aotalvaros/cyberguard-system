import { ApplicationConfig, provideBrowserGlobalErrorListeners, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthRepository } from '../core/domain/ports/auth.repository';
import { AuthRepositoryImpl } from '../core/infrastructure/services/auth-repository.impl';
import { ThreatRepository } from '../core/domain/ports/threat.repository';
import { ThreatRepositoryImpl } from '../core/infrastructure/services/threat-repository.impl';
import { WebSocketRepository } from '../core/domain/ports/websocket.repository';
import { WebSocketRepositoryImpl } from '../core/infrastructure/services/websocket-repository.impl';
import { authInterceptor, retryInterceptor, errorInterceptor, loadingInterceptor } from '../core/infrastructure/interceptors';
import { GlobalErrorHandler } from '../core/infrastructure/handlers';
import { StatisticsRepository } from '../core/domain/ports/statistics.repository';
// Backend endpoint available — use real implementation
import { StatisticsRepositoryImpl } from '../core/infrastructure/services/statistics-repository.impl';
import { StatisticsMockRepository } from '../core/infrastructure/services/statistics-mock-repository.impl';
import { NotificationPreferencesRepository } from '../core/domain/ports/notification-preferences.repository';
import { NotificationPreferencesRepositoryImpl } from '../core/infrastructure/services/notification-preferences-repository.impl';
import { AdminProfileRepository } from '../core/domain/ports/admin-profile.repository';
import { AdminProfileHttpAdapter } from '../core/infrastructure/adapters/admin-profile-http.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      // Orden: loading → auth → retry → error
      withInterceptors([loadingInterceptor, authInterceptor, retryInterceptor, errorInterceptor])
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: AuthRepository, useClass: AuthRepositoryImpl },
    { provide: ThreatRepository, useClass: ThreatRepositoryImpl },
    { provide: WebSocketRepository, useClass: WebSocketRepositoryImpl },
    // Use real repository now that backend endpoint exists
    { provide: StatisticsRepository, useClass: StatisticsRepositoryImpl },
    { provide: NotificationPreferencesRepository, useClass: NotificationPreferencesRepositoryImpl },
    // ⚠️ HUMAN CHECK: Usar AdminProfileHttpAdapter en producción.
    // Para tests de integración, reemplazar con un mock.
    { provide: AdminProfileRepository, useClass: AdminProfileHttpAdapter },
  ]
};
