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
// TODO [POST-BACKEND]: switch to StatisticsRepositoryImpl once GET /api/statistics is delivered.
// import { StatisticsRepositoryImpl } from '../core/infrastructure/services/statistics-repository.impl';
import { StatisticsMockRepository } from '../core/infrastructure/services/statistics-mock-repository.impl';

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
    // Uses mock while backend endpoint is pending — swap to StatisticsRepositoryImpl when ready
    { provide: StatisticsRepository, useClass: StatisticsMockRepository },
  ]
};
