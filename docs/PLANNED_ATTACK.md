# 🎯 Plan de Ataque: Reescritura Frontend CyberGuard

**Equipo:** Senior Angular Architects  
**Fecha:** Febrero 2026  
**Estrategia:** Greenfield Development + Strangler Pattern  
**Objetivo:** Construir frontend nuevo (9/10) mientras el legacy (4.5/10) sigue funcionando

---

## 🔄 Estrategia: Strangler Pattern

### Concepto:
```
┌─────────────────────────────────────────────┐
│  CÓDIGO LEGACY (Actual)                    │
│  - Sigue funcionando en producción         │
│  - NO se modifica (frozen)                 │
│  - Se elimina gradualmente                 │
└─────────────────────────────────────────────┘
              ↓ migración gradual
┌─────────────────────────────────────────────┐
│  CÓDIGO NUEVO (Greenfield)                 │
│  - Arquitectura Hexagonal desde día 1      │
│  - SOLID + Design Patterns                 │
│  - 85%+ test coverage                      │
│  - TypeScript estricto (0 any)             │
└─────────────────────────────────────────────┘
```

### Ventajas:
- ✅ Cero riesgo de romper funcionalidad actual
- ✅ Libertad total para diseñar correctamente
- ✅ Migración gradual feature por feature
- ✅ Rollback instantáneo si hay problemas
- ✅ Comparación A/B entre legacy y nuevo

---

## 📊 Estado Actual vs Objetivo

| Métrica | Legacy | Nuevo | Gap |
|---------|--------|-------|-----|
| **Calidad General** | 4.5/10 | 9/10 | +4.5 |
| **SOLID Compliance** | 2/10 | 9/10 | +7 |
| **Cohesión** | 5/10 | 9/10 | +4 |
| **Acoplamiento** | 3/10 | 9/10 | +6 |
| **Type Safety** | 2/10 | 10/10 | +8 |
| **Test Coverage** | 0% | 85% | +85% |
| **Arquitectura** | Ninguna | Hexagonal | ✅ |

---

## 🏗️ Estructura del Proyecto

```typescript
src/
├── app-legacy/              # ❌ FROZEN - No tocar
│   ├── services/
│   ├── components/
│   └── guards/
│
├── app/                     # ✅ NUEVO - Greenfield
│   ├── domain/              # Lógica de negocio pura
│   │   ├── models/
│   │   ├── ports/
│   │   └── services/
│   ├── infrastructure/      # Adaptadores
│   │   ├── http/
│   │   ├── websocket/
│   │   ├── storage/
│   │   └── state/
│   └── presentation/        # UI
│       ├── auth/
│       └── dashboard/
│
└── app-routing.ts           # Feature flags para migración
```

## 🚀 Estrategia de Desarrollo (4 Sprints)

### 🎯 Sprint 1: Setup + Auth Module (2 semanas)

#### Objetivos:
- ✅ Crear proyecto nuevo desde cero
- ✅ Implementar módulo de autenticación completo
- ✅ Feature flag para switch legacy ↔ nuevo
- ✅ CI/CD pipeline

#### Día 1-2: Setup Inicial

```bash
# Crear proyecto nuevo con Angular 17+
ng new cyberguard-v2 --standalone --routing --style=css --strict

# Configurar herramientas
npm install -D eslint prettier husky lint-staged
npm install -D @testing-library/angular jest cypress
npm install -D @ngrx/signals rxjs

# Estructura hexagonal
mkdir -p src/app/{domain,infrastructure,presentation}
mkdir -p src/app/domain/{models,ports/{inbound,outbound},services}
mkdir -p src/app/infrastructure/{http,websocket,storage,state}
mkdir -p src/app/presentation/{shared,auth,dashboard}

# Configuración estricta TypeScript
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### Día 3-5: Domain Layer (Auth)

```typescript
// domain/models/user.model.ts
export interface User {
  readonly id: string;
  readonly username: string;
  readonly role: UserRole;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

// domain/models/auth-session.model.ts
export interface AuthSession {
  readonly token: string;
  readonly user: User;
  readonly expiresAt: Date;
}

// domain/ports/outbound/auth.repository.ts
export abstract class AuthRepository {
  abstract login(username: string, password: string): Observable<AuthSession>;
  abstract logout(): Observable<void>;
  abstract refreshToken(token: string): Observable<AuthSession>;
}

// domain/ports/outbound/storage.port.ts
export abstract class StoragePort {
  abstract save<T>(key: string, value: T): void;
  abstract get<T>(key: string): T | null;
  abstract remove(key: string): void;
}

// domain/services/auth.use-case.service.ts
@Injectable({ providedIn: 'root' })
export class AuthUseCaseService implements AuthUseCase {
  private sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  session$ = this.sessionSubject.asObservable();

  constructor(
    private authRepo: AuthRepository,
    private storage: StoragePort,
    private eventBus: EventBusService
  ) {
    this.loadSessionFromStorage();
  }

  login(username: string, password: string): Observable<AuthSession> {
    return this.authRepo.login(username, password).pipe(
      tap(session => {
        this.saveSession(session);
        this.eventBus.emit({ type: 'USER_LOGGED_IN', payload: { user: session.user } });
      })
    );
  }
  
  // ... resto de la lógica
}
```

#### Día 6-8: Infrastructure Layer (Auth)

```typescript
// infrastructure/http/auth-http.repository.ts
@Injectable({ providedIn: 'root' })
export class AuthHttpRepository extends AuthRepository {
  private readonly apiUrl = `${environment.baseUrl}/auth`;

  constructor(private http: HttpClient) {
    super();
  }

  login(username: string, password: string): Observable<AuthSession> {
    return this.http.post<LoginResponseDTO>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        map(dto => this.mapToAuthSession(dto)),
        retry({ count: 3, delay: 1000 }),
        catchError(this.handleError)
      );
  }
  
  private mapToAuthSession(dto: LoginResponseDTO): AuthSession {
    return {
      token: dto.token,
      user: {
        id: dto.user.id || dto.user.username,
        username: dto.user.username,
        role: dto.user.role as UserRole
      },
      expiresAt: new Date(Date.now() + 3600000)
    };
  }
}

// infrastructure/storage/local-storage.adapter.ts
@Injectable({ providedIn: 'root' })
export class LocalStorageAdapter extends StoragePort {
  private readonly prefix = 'cgv2_';

  save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  }
  
  // ... resto
}
```

#### Día 9-10: Presentation Layer (Auth)

```typescript
// presentation/auth/facades/login.facade.ts
@Injectable()
export class LoginFacade {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  
  readonly vm$ = combineLatest([
    this.loadingSubject,
    this.errorSubject,
    this.authUseCase.session$
  ]).pipe(
    map(([loading, error, session]) => ({
      loading,
      error,
      isAuthenticated: !!session
    }))
  );

  constructor(private authUseCase: AuthUseCase) {}

  login(username: string, password: string): Observable<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    
    return this.authUseCase.login(username, password).pipe(
      tap(() => this.loadingSubject.next(false)),
      catchError(err => {
        this.errorSubject.next(err.message);
        this.loadingSubject.next(false);
        return throwError(() => err);
      }),
      map(() => void 0)
    );
  }
}

// presentation/auth/components/login.component.ts
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [LoginFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" *ngIf="vm$ | async as vm">
      <input formControlName="username" placeholder="Username" />
      <input formControlName="password" type="password" />
      <button type="submit" [disabled]="vm.loading">Login</button>
      <div *ngIf="vm.error" class="error">{{ vm.error }}</div>
    </form>
  `
})
export class LoginComponent {
  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });
  
  vm$ = this.facade.vm$;

  constructor(
    private fb: FormBuilder,
    private facade: LoginFacade,
    private router: Router
  ) {}

  onSubmit(): void {
    if (this.form.invalid) return;
    
    const { username, password } = this.form.getRawValue();
    this.facade.login(username, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {} // Manejado por facade
    });
  }
}
```

#### Día 11-12: Feature Flag + Routing

```typescript
// app-routing.ts
import { environment } from './environments/environment';

const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => environment.useNewAuth
      ? import('./app/presentation/auth/components/login.component').then(m => m.LoginComponent)
      : import('./app-legacy/autenticacion/autenticacion.component').then(m => m.AutenticacionComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => environment.useNewDashboard
      ? import('./app/presentation/dashboard/components/dashboard.component').then(m => m.DashboardComponent)
      : import('./app-legacy/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard]
  }
];

// environment.ts
export const environment = {
  production: false,
  useNewAuth: true,        // ✅ Feature flag
  useNewDashboard: false,  // ❌ Aún no migrado
  baseUrl: 'http://localhost:3000/api'
};
```

#### Día 13-14: Testing + CI/CD

```typescript
// auth.use-case.service.spec.ts
describe('AuthUseCaseService', () => {
  let service: AuthUseCaseService;
  let mockAuthRepo: jasmine.SpyObj<AuthRepository>;
  let mockStorage: jasmine.SpyObj<StoragePort>;
  let mockEventBus: jasmine.SpyObj<EventBusService>;

  beforeEach(() => {
    mockAuthRepo = jasmine.createSpyObj('AuthRepository', ['login']);
    mockStorage = jasmine.createSpyObj('StoragePort', ['save', 'get']);
    mockEventBus = jasmine.createSpyObj('EventBusService', ['emit']);

    service = new AuthUseCaseService(mockAuthRepo, mockStorage, mockEventBus);
  });

  it('should emit event when user logs in', (done) => {
    const session: AuthSession = {
      token: 'abc',
      user: { id: '1', username: 'admin', role: UserRole.ADMIN },
      expiresAt: new Date()
    };
    
    mockAuthRepo.login.and.returnValue(of(session));

    service.login('admin', 'pass').subscribe(() => {
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'USER_LOGGED_IN',
        payload: { user: session.user }
      });
      done();
    });
  });
});

// .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build
```

#### Entregables Sprint 1:
- [ ] Proyecto nuevo configurado
- [ ] Módulo Auth completo (Domain + Infrastructure + Presentation)
- [ ] Feature flag funcional
- [ ] 85%+ test coverage en Auth
- [ ] CI/CD pipeline
- [ ] Login nuevo funcionando en paralelo con legacy

---

### 🎯 Sprint 2: Adaptadores e Infraestructura (2 semanas)

#### Objetivos:
- ✅ Implementar TODOS los adaptadores
- ✅ Desacoplar servicios legacy
- ✅ Implementar patrones de diseño
- ✅ Event Bus para comunicación

#### Tareas Críticas:

**Semana 1: Adaptadores HTTP y Storage**

```typescript
// Día 1-2: HTTP Adapters
@Injectable({ providedIn: 'root' })
export class AuthHttpRepository extends AuthRepository {
  // ✅ Mapeo DTO → Domain
  // ✅ Manejo de errores centralizado
  // ✅ Retry logic con exponential backoff
}

@Injectable({ providedIn: 'root' })
export class ThreatHttpRepository extends ThreatRepository {
  // ✅ Interceptor para logging
  // ✅ Caching con TTL
}

// Día 3-4: Storage Adapters
@Injectable({ providedIn: 'root' })
export class LocalStorageAdapter extends StoragePort {
  // ✅ Serialización segura
  // ✅ Manejo de errores (storage full)
  // ✅ Prefijo para evitar colisiones
}

// Día 5: Logger Adapter
@Injectable({ providedIn: 'root' })
export class ConsoleLoggerAdapter extends LoggerPort {
  // ✅ Niveles: debug, info, warn, error
  // ✅ Contexto estructurado
  // ✅ Deshabilitado en producción
}
```

**Semana 2: WebSocket y Event Bus**

```typescript
// Día 1-3: WebSocket Adapter
@Injectable({ providedIn: 'root' })
export class WebSocketAdapter extends WebSocketPort {
  // ✅ Reconexión automática con backoff exponencial
  // ✅ Heartbeat para detectar conexión muerta
  // ✅ Queue de mensajes mientras desconectado
  // ✅ Estado observable (connecting, connected, error)
}

// Día 4-5: Event Bus (Desacoplamiento)
@Injectable({ providedIn: 'root' })
export class EventBusService {
  private events$ = new Subject<DomainEvent>();
  
  emit<T extends DomainEvent>(event: T): void {
    this.events$.next(event);
  }
  
  on<T extends DomainEvent>(type: EventType): Observable<T> {
    return this.events$.pipe(
      filter(e => e.type === type),
      map(e => e as T)
    );
  }
}

// Eventos de dominio
export enum EventType {
  USER_LOGGED_IN = 'USER_LOGGED_IN',
  USER_LOGGED_OUT = 'USER_LOGGED_OUT',
  THREAT_REPORTED = 'THREAT_REPORTED',
  NOTIFICATION_RECEIVED = 'NOTIFICATION_RECEIVED'
}
```

#### Entregables Sprint 2:
- [ ] 6+ adaptadores implementados
- [ ] Event Bus funcional
- [ ] AuthService legacy eliminado
- [ ] WsService legacy eliminado
- [ ] Dependency Injection configurado
- [ ] Desacoplamiento total (0 dependencias circulares)

---

### 🎯 Sprint 3: Presentation Layer y Patrones (2 semanas)

#### Objetivos:
- ✅ Implementar Facade Pattern
- ✅ Refactorizar componentes
- ✅ Implementar patrones de diseño
- ✅ Optimización de rendimiento

#### Tareas Críticas:

**Semana 1: Facades y Componentes**

```typescript
// Día 1-2: Login Facade
@Injectable()
export class LoginFacade {
  // ✅ Estado reactivo (loading$, error$, success$)
  // ✅ Validación de formulario
  // ✅ Manejo de errores
  // ✅ Navegación post-login
  
  readonly vm$ = combineLatest([
    this.loading$,
    this.error$,
    this.authUseCase.getCurrentSession()
  ]).pipe(
    map(([loading, error, session]) => ({
      loading,
      error,
      isAuthenticated: !!session
    }))
  );
}

// Día 3-4: Dashboard Facade
@Injectable()
export class DashboardFacade {
  // ✅ Gestión de threats
  // ✅ Gestión de notificaciones
  // ✅ Filtros y búsqueda
  // ✅ Paginación
  
  readonly vm$ = combineLatest([
    this.threatUseCase.getThreats(),
    this.notificationUseCase.getNotifications(),
    this.filters$
  ]).pipe(
    map(([threats, notifications, filters]) => ({
      threats: this.applyFilters(threats, filters),
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    }))
  );
}

// Día 5: Refactorizar componentes
// ✅ Componentes SOLO renderizan
// ✅ Lógica delegada a Facades
// ✅ OnPush ChangeDetection
// ✅ TrackBy functions
```

**Semana 2: Patrones de Diseño**

```typescript
// Día 1: Strategy Pattern (Message ID Generation)
interface MessageIdStrategy {
  canHandle(payload: any): boolean;
  getId(payload: any): string;
}

class MessageIdGenerator {
  private strategies = [
    new EventIdStrategy(),
    new ThreatIdStrategy(),
    new CompositeIdStrategy(),
    new HashStrategy()  // Fallback
  ];
}

// Día 2: Factory Pattern (Entity Creation)
export class ThreatFactory {
  static createFromForm(data: ThreatFormData): Threat { }
  static createFromDTO(dto: ThreatDTO): Threat { }
  static createEmpty(): Threat { }
}

// Día 3: Decorator Pattern (Repository Enhancement)
export class CachingRepositoryDecorator extends ThreatRepository {
  constructor(
    private wrapped: ThreatRepository,
    private cache: CacheService
  ) { super(); }
}

export class LoggingRepositoryDecorator extends ThreatRepository {
  constructor(
    private wrapped: ThreatRepository,
    private logger: LoggerPort
  ) { super(); }
}

// Día 4-5: State Management (NgRx Signals)
export const ThreatStore = signalStore(
  { providedIn: 'root' },
  withState<ThreatState>({
    threats: [],
    loading: false,
    error: null
  }),
  withMethods((store, threatUseCase = inject(ThreatUseCase)) => ({
    loadThreats: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() => threatUseCase.getThreats().pipe(
          tapResponse({
            next: (threats) => patchState(store, { threats, loading: false }),
            error: (error) => patchState(store, { error, loading: false })
          })
        ))
      )
    )
  }))
);
```

#### Entregables Sprint 3:
- [ ] 5+ Facades implementados
- [ ] Componentes refactorizados (<100 líneas)
- [ ] 4+ patrones de diseño implementados
- [ ] OnPush ChangeDetection en todos los componentes
- [ ] State management con Signals

---

### 🎯 Sprint 4: Testing, Optimización y Documentación (2 semanas)

#### Objetivos:
- ✅ 85%+ test coverage
- ✅ Performance optimization
- ✅ Documentación completa
- ✅ Code review y refactoring final

#### Tareas Críticas:

**Semana 1: Testing**

```typescript
// Día 1-2: Unit Tests (Use Cases)
describe('AuthUseCaseService', () => {
  // ✅ Mocks de interfaces (no implementaciones)
  // ✅ Casos felices y edge cases
  // ✅ Manejo de errores
  // ✅ Efectos secundarios (storage, websocket)
});

// Día 3: Integration Tests (Adapters)
describe('AuthHttpRepository', () => {
  // ✅ HttpTestingController
  // ✅ Mapeo DTO → Domain
  // ✅ Manejo de errores HTTP
});

// Día 4: Component Tests (Facades)
describe('LoginComponent', () => {
  // ✅ Mock de Facade
  // ✅ Interacción de usuario
  // ✅ Navegación
});

// Día 5: E2E Tests (Cypress)
describe('Login Flow', () => {
  it('should login and navigate to dashboard', () => {
    cy.visit('/login');
    cy.get('[data-cy=username]').type('admin');
    cy.get('[data-cy=password]').type('password');
    cy.get('[data-cy=submit]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

**Semana 2: Optimización y Documentación**

```typescript
// Día 1: Performance Optimization
// ✅ Lazy loading de módulos
// ✅ Virtual scrolling para listas largas
// ✅ Memoization con computed signals
// ✅ Debounce en búsquedas
// ✅ Image optimization

// Día 2: Bundle Analysis
// ✅ webpack-bundle-analyzer
// ✅ Eliminar dependencias no usadas
// ✅ Tree shaking
// ✅ Code splitting

// Día 3-4: Documentación
// ✅ README actualizado
// ✅ Arquitectura documentada (diagramas)
// ✅ ADRs (Architecture Decision Records)
// ✅ Guía de contribución
// ✅ Ejemplos de código

// Día 5: Code Review Final
// ✅ Checklist de calidad
// ✅ Refactoring de código duplicado
// ✅ Naming conventions
// ✅ Comentarios útiles (no obvios)
```

#### Entregables Sprint 4:
- [ ] 85%+ test coverage
- [ ] 0 vulnerabilidades de seguridad
- [ ] Bundle size <500KB
- [ ] Lighthouse score >90
- [ ] Documentación completa
- [ ] ADRs documentados

---

## 🛠️ Herramientas y Tecnologías

### Arquitectura y Patrones:
- ✅ **Arquitectura Hexagonal** (Ports & Adapters)
- ✅ **SOLID Principles**
- ✅ **Design Patterns**: Facade, Strategy, Factory, Decorator, Observer
- ✅ **DDD** (Domain-Driven Design) para modelos

### Angular Ecosystem:
- ✅ **Angular 17+** (Standalone Components)
- ✅ **Signals** para state management
- ✅ **RxJS** para programación reactiva
- ✅ **OnPush ChangeDetection** para performance

### Testing:
- ✅ **Jest** para unit tests
- ✅ **Testing Library** para component tests
- ✅ **Cypress** para E2E tests
- ✅ **MSW** (Mock Service Worker) para mocks

### Code Quality:
- ✅ **ESLint** con reglas estrictas
- ✅ **Prettier** para formateo
- ✅ **Husky** para pre-commit hooks
- ✅ **SonarQube** para análisis estático
- ✅ **Conventional Commits**

### Performance:
- ✅ **Lighthouse CI** en pipeline
- ✅ **webpack-bundle-analyzer**
- ✅ **Angular DevTools** para profiling

---

## 📏 Métricas de Éxito

### Calidad de Código:

| Métrica | Baseline | Target | Herramienta |
|---------|----------|--------|-------------|
| **Complejidad Ciclomática** | 8-12 | <5 | SonarQube |
| **Duplicación de Código** | 15% | <3% | SonarQube |
| **Deuda Técnica** | 30 días | <5 días | SonarQube |
| **Code Smells** | 50+ | <10 | SonarQube |
| **Líneas por Archivo** | 200+ | <150 | ESLint |

### Testing:

| Métrica | Baseline | Target |
|---------|----------|--------|
| **Unit Test Coverage** | 0% | 85% |
| **Integration Test Coverage** | 0% | 70% |
| **E2E Test Coverage** | 0% | 80% |
| **Mutation Score** | N/A | 75% |

### Performance:

| Métrica | Baseline | Target |
|---------|----------|--------|
| **Bundle Size** | N/A | <500KB |
| **First Contentful Paint** | N/A | <1.5s |
| **Time to Interactive** | N/A | <3s |
| **Lighthouse Score** | N/A | >90 |

### Mantenibilidad:

| Métrica | Baseline | Target |
|---------|----------|--------|
| **Tiempo para agregar feature** | 3 días | 1 día |
| **Tiempo para fix bug** | 1 día | 2 horas |
| **Onboarding de nuevo dev** | 2 semanas | 3 días |

---

## 🚨 Riesgos y Mitigación

### Riesgo 1: Refactorización rompe funcionalidad existente
**Probabilidad:** Alta  
**Impacto:** Crítico  
**Mitigación:**
- ✅ Tests E2E antes de refactorizar
- ✅ Feature flags para rollback rápido
- ✅ Refactorización gradual (Strangler Pattern)
- ✅ Code review obligatorio

### Riesgo 2: Equipo no familiarizado con Hexagonal
**Probabilidad:** Media  
**Impacto:** Alto  
**Mitigación:**
- ✅ Workshop de 2 días sobre Hexagonal
- ✅ Pair programming en primeras tareas
- ✅ Documentación exhaustiva con ejemplos
- ✅ Mentoring de seniors

### Riesgo 3: Deadline muy ajustado
**Probabilidad:** Media  
**Impacto:** Alto  
**Mitigación:**
- ✅ Priorizar tareas críticas (MoSCoW)
- ✅ Automatización de tareas repetitivas
- ✅ Buffer de 20% en estimaciones
- ✅ Daily standups para detectar blockers

### Riesgo 4: Resistencia al cambio
**Probabilidad:** Baja  
**Impacto:** Medio  
**Mitigación:**
- ✅ Demostrar beneficios con métricas
- ✅ Involucrar al equipo en decisiones
- ✅ Celebrar quick wins
- ✅ Retrospectivas cada sprint

---

## 📋 Checklist de Calidad (Definition of Done)

### Por Feature:
- [ ] Código sigue arquitectura hexagonal
- [ ] 0 usos de `any`
- [ ] Interfaces TypeScript definidas
- [ ] Unit tests (>85% coverage)
- [ ] Integration tests cuando aplique
- [ ] Documentación actualizada
- [ ] Code review aprobado por 2 seniors
- [ ] ESLint sin warnings
- [ ] SonarQube quality gate passed
- [ ] Performance budget respetado

### Por Sprint:
- [ ] Todos los entregables completados
- [ ] Demo exitoso con stakeholders
- [ ] Retrospectiva realizada
- [ ] Documentación de decisiones (ADRs)
- [ ] Métricas actualizadas
- [ ] Deuda técnica documentada

---

## 🎓 Capacitación del Equipo

### Semana 0 (Pre-Sprint 1):

**Día 1-2: Workshop Arquitectura Hexagonal**
- Teoría: Ports & Adapters
- Ejemplos prácticos
- Ejercicios hands-on

**Día 3: Workshop SOLID + Design Patterns**
- Repaso de SOLID
- Patrones aplicados a Angular
- Code katas

**Día 4: Workshop Testing**
- Testing pyramid
- Mocking strategies
- TDD basics

**Día 5: Setup de Herramientas**
- ESLint + Prettier
- Husky + Conventional Commits
- SonarQube local

---

## 📊 Dashboard de Progreso

### KPIs Semanales:
- ✅ Story points completados
- ✅ Test coverage %
- ✅ Code quality score
- ✅ Bugs encontrados/resueltos
- ✅ Velocity del equipo

### Reportes:
- **Daily:** Standup (15 min)
- **Semanal:** Métricas + blockers
- **Sprint:** Demo + retrospectiva
- **Mensual:** Stakeholder update

---

## 🏆 Resultado Esperado

### Post-Sprint 4:

```typescript
// ✅ Código limpio y mantenible
src/app/
├── domain/              // Lógica de negocio pura
│   ├── models/         // 15+ interfaces TypeScript
│   ├── ports/          // 10+ contratos
│   └── services/       // 5+ use cases
├── infrastructure/      // Adaptadores intercambiables
│   ├── http/
│   ├── websocket/
│   ├── storage/
│   └── state/
└── presentation/        // UI simple y reactiva
    ├── auth/
    │   ├── components/  // <100 líneas
    │   └── facades/     // Orquestación
    └── dashboard/
        ├── components/
        └── facades/
```

### Métricas Finales:
- ✅ **Calidad:** 9/10
- ✅ **SOLID:** 9/10
- ✅ **Test Coverage:** 85%+
- ✅ **Type Safety:** 10/10 (0 `any`)
- ✅ **Performance:** Lighthouse >90
- ✅ **Mantenibilidad:** 9/10

---

## 🚀 Próximos Pasos

1. **Aprobación de stakeholders** (1 día)
2. **Capacitación del equipo** (1 semana)
3. **Sprint 1 kickoff** (Día 1)
4. **Ejecución del plan** (8 semanas)
5. **Go-live** (Post-Sprint 4)

---

**Preparado por:** Senior Angular Architects Team  
**Aprobado por:** Tech Lead & Product Owner  
**Fecha de inicio:** [TBD]  
**Fecha de finalización estimada:** [TBD + 8 semanas]

---

> "La calidad no es un acto, es un hábito." - Aristóteles

🎯 **Let's build something great!**
