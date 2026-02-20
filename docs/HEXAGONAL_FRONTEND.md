# 🏛️ Arquitectura Hexagonal en Frontend Angular - CyberGuard

**Autor:** Senior Angular Developer  
**Fecha:** Febrero 2026  
**Objetivo:** Refactorizar frontend de CyberGuard aplicando Arquitectura Hexagonal

---

## 📚 Índice

1. [¿Qué es Arquitectura Hexagonal?](#qué-es)
2. [¿Por qué en Frontend?](#por-qué)
3. [Estructura de Carpetas](#estructura)
4. [Capas y Responsabilidades](#capas)
5. [Implementación Paso a Paso](#implementación)
6. [Ejemplos Completos](#ejemplos)
7. [Testing](#testing)
8. [Migración Gradual](#migración)

---

## 🎯 ¿Qué es Arquitectura Hexagonal? {#qué-es}

También conocida como **Ports & Adapters**, separa la aplicación en 3 capas:

```
┌─────────────────────────────────────────────┐
│         PRESENTATION (UI)                   │
│  Components, Facades, ViewModels            │
└──────────────┬──────────────────────────────┘
               │ usa
┌──────────────▼──────────────────────────────┐
│         DOMAIN (Núcleo)                     │
│  Use Cases, Entities, Business Logic        │
│  ┌────────────────────────────────────┐    │
│  │  Ports (Interfaces/Contratos)      │    │
│  │  - Inbound: lo que ofrece          │    │
│  │  - Outbound: lo que necesita       │    │
│  └────────────────────────────────────┘    │
└──────────────┬──────────────────────────────┘
               │ implementado por
┌──────────────▼──────────────────────────────┐
│      INFRASTRUCTURE (Adaptadores)           │
│  HTTP, WebSocket, Storage, State            │
└─────────────────────────────────────────────┘
```

### Principios Clave:

1. **Dependencias apuntan hacia adentro** (hacia el dominio)
2. **Dominio NO conoce infraestructura**
3. **Interfaces (Ports) definen contratos**
4. **Adaptadores implementan interfaces**

---

## 💡 ¿Por qué en Frontend? {#por-qué}

### ✅ Ventajas para CyberGuard:

| Problema Actual | Solución Hexagonal |
|-----------------|-------------------|
| AuthService acoplado a WsService | Dominio independiente |
| Difícil testear servicios | Mocks de interfaces |
| Cambio de API rompe todo | Solo cambias adaptador |
| Lógica en componentes | Lógica en Use Cases |
| localStorage hardcodeado | Adaptador intercambiable |

### 🎯 Casos de Uso Ideales:

- ✅ Múltiples fuentes de datos (HTTP, WS, Storage)
- ✅ Lógica de negocio compleja
- ✅ Testing crítico
- ✅ APIs que cambian frecuentemente
- ✅ Aplicaciones grandes (>10 componentes)

---

## 📁 Estructura de Carpetas {#estructura}

```typescript
src/app/
├── domain/                          # ⬡ NÚCLEO
│   ├── models/                      # Entidades de negocio
│   │   ├── user.model.ts
│   │   ├── threat-alert.model.ts
│   │   └── auth-session.model.ts
│   │
│   ├── ports/                       # Contratos (Interfaces)
│   │   ├── inbound/                 # Lo que el dominio OFRECE
│   │   │   ├── auth.use-case.ts
│   │   │   ├── threat.use-case.ts
│   │   │   └── notification.use-case.ts
│   │   │
│   │   └── outbound/                # Lo que el dominio NECESITA
│   │       ├── auth.repository.ts
│   │       ├── threat.repository.ts
│   │       ├── storage.repository.ts
│   │       └── websocket.gateway.ts
│   │
│   └── services/                    # Implementación de Use Cases
│       ├── auth.use-case.service.ts
│       ├── threat.use-case.service.ts
│       └── notification.use-case.service.ts
│
├── infrastructure/                  # ⬡ ADAPTADORES
│   ├── http/                        # Adaptador HTTP
│   │   ├── auth-http.repository.ts
│   │   └── threat-http.repository.ts
│   │
│   ├── websocket/                   # Adaptador WebSocket
│   │   └── websocket.gateway.impl.ts
│   │
│   ├── storage/                     # Adaptador Storage
│   │   ├── local-storage.repository.ts
│   │   └── session-storage.repository.ts
│   │
│   └── state/                       # Adaptador Estado
│       └── threat-alert.state.ts
│
└── presentation/                    # ⬡ UI
    ├── shared/                      # Componentes compartidos
    │   ├── components/
    │   └── directives/
    │
    ├── auth/                        # Feature: Autenticación
    │   ├── components/
    │   │   └── login.component.ts
    │   └── facades/
    │       └── login.facade.ts
    │
    └── dashboard/                   # Feature: Dashboard
        ├── components/
        │   └── dashboard.component.ts
        └── facades/
            └── dashboard.facade.ts
```

---

## 🔷 Capas y Responsabilidades {#capas}

### 1️⃣ DOMAIN (Núcleo)

**Responsabilidad:** Lógica de negocio pura, sin dependencias externas

#### Models (Entidades)
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

// domain/models/threat-alert.model.ts
export interface ThreatAlert {
  readonly id: string;
  readonly type: ThreatType;
  readonly severity: Severity;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly timestamp: Date;
}

export enum ThreatType {
  MALWARE = 'malware',
  INTRUSION = 'intrusion',
  PHISHING = 'phishing',
  DDOS = 'ddos',
  RANSOMWARE = 'ransomware'
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

#### Ports Outbound (Lo que necesita)
```typescript
// domain/ports/outbound/auth.repository.ts
export abstract class AuthRepository {
  abstract login(username: string, password: string): Observable<AuthSession>;
  abstract logout(): Observable<void>;
  abstract refreshToken(token: string): Observable<AuthSession>;
}

// domain/ports/outbound/storage.repository.ts
export abstract class StorageRepository {
  abstract save<T>(key: string, value: T): void;
  abstract get<T>(key: string): T | null;
  abstract remove(key: string): void;
  abstract clear(): void;
}

// domain/ports/outbound/websocket.gateway.ts
export abstract class WebSocketGateway {
  abstract connect(): void;
  abstract disconnect(): void;
  abstract send(message: any): void;
  abstract messages$: Observable<any>;
  abstract connectionStatus$: Observable<ConnectionStatus>;
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error'
}

// domain/ports/outbound/threat.repository.ts
export abstract class ThreatRepository {
  abstract reportThreat(threat: Partial<ThreatAlert>): Observable<ThreatAlert>;
  abstract getThreats(): Observable<ThreatAlert[]>;
  abstract getThreatById(id: string): Observable<ThreatAlert>;
}
```

#### Ports Inbound (Lo que ofrece)
```typescript
// domain/ports/inbound/auth.use-case.ts
export abstract class AuthUseCase {
  abstract login(username: string, password: string): Observable<AuthSession>;
  abstract logout(): void;
  abstract getCurrentSession(): Observable<AuthSession | null>;
  abstract isAuthenticated(): Observable<boolean>;
  abstract isAdmin(): boolean;
}

// domain/ports/inbound/threat.use-case.ts
export abstract class ThreatUseCase {
  abstract reportThreat(threat: Partial<ThreatAlert>): Observable<ThreatAlert>;
  abstract getThreats(): Observable<ThreatAlert[]>;
}

// domain/ports/inbound/notification.use-case.ts
export abstract class NotificationUseCase {
  abstract getNotifications(): Observable<ThreatAlert[]>;
  abstract markAsRead(id: string): void;
  abstract clearAll(): void;
}
```

#### Use Case Services (Implementación)
```typescript
// domain/services/auth.use-case.service.ts
@Injectable({ providedIn: 'root' })
export class AuthUseCaseService implements AuthUseCase {
  private sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  private session$ = this.sessionSubject.asObservable();

  constructor(
    private authRepo: AuthRepository,
    private storageRepo: StorageRepository,
    private wsGateway: WebSocketGateway
  ) {
    this.loadSessionFromStorage();
  }

  login(username: string, password: string): Observable<AuthSession> {
    return this.authRepo.login(username, password).pipe(
      tap(session => {
        this.saveSession(session);
        if (this.isAdminUser(session.user)) {
          this.wsGateway.connect();
        }
      })
    );
  }

  logout(): void {
    this.wsGateway.disconnect();
    this.storageRepo.remove('session');
    this.sessionSubject.next(null);
  }

  getCurrentSession(): Observable<AuthSession | null> {
    return this.session$;
  }

  isAuthenticated(): Observable<boolean> {
    return this.session$.pipe(
      map(session => !!session && !this.isExpired(session))
    );
  }

  isAdmin(): boolean {
    const session = this.sessionSubject.value;
    return !!session && this.isAdminUser(session.user);
  }

  private saveSession(session: AuthSession): void {
    this.storageRepo.save('session', session);
    this.sessionSubject.next(session);
  }

  private loadSessionFromStorage(): void {
    const session = this.storageRepo.get<AuthSession>('session');
    if (session && !this.isExpired(session)) {
      this.sessionSubject.next(session);
      if (this.isAdminUser(session.user)) {
        this.wsGateway.connect();
      }
    }
  }

  private isAdminUser(user: User): boolean {
    return user.role === UserRole.ADMIN;
  }

  private isExpired(session: AuthSession): boolean {
    return new Date() > session.expiresAt;
  }
}
```

---

### 2️⃣ INFRASTRUCTURE (Adaptadores)

**Responsabilidad:** Implementar interfaces del dominio

#### HTTP Adapter
```typescript
// infrastructure/http/auth-http.repository.ts
@Injectable({ providedIn: 'root' })
export class AuthHttpRepository extends AuthRepository {
  private readonly apiUrl = `${environment.baseUrl}/auth`;

  constructor(private http: HttpClient) {
    super();
  }

  login(username: string, password: string): Observable<AuthSession> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        map(res => this.mapToAuthSession(res)),
        catchError(err => throwError(() => new Error(this.extractError(err))))
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {});
  }

  refreshToken(token: string): Observable<AuthSession> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, { token })
      .pipe(map(res => this.mapToAuthSession(res)));
  }

  private mapToAuthSession(res: LoginResponse): AuthSession {
    return {
      token: res.token,
      user: {
        id: res.user.id || res.user.username,
        username: res.user.username,
        role: res.user.role as UserRole
      },
      expiresAt: new Date(Date.now() + 3600000) // 1 hora
    };
  }

  private extractError(err: any): string {
    return err?.error?.message || err?.message || 'Authentication failed';
  }
}

interface LoginResponse {
  token: string;
  user: {
    id?: string;
    username: string;
    role: string;
  };
}
```

#### Storage Adapter
```typescript
// infrastructure/storage/local-storage.repository.ts
@Injectable({ providedIn: 'root' })
export class LocalStorageRepository extends StorageRepository {
  private readonly prefix = 'cg_';

  save<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(this.getKey(key), serialized);
    } catch (error) {
      console.error('Storage save error:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }
}
```

#### WebSocket Adapter
```typescript
// infrastructure/websocket/websocket.gateway.impl.ts
@Injectable({ providedIn: 'root' })
export class WebSocketGatewayImpl extends WebSocketGateway {
  private socket: WebSocket | null = null;
  private messagesSubject = new Subject<any>();
  private statusSubject = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.DISCONNECTED);

  messages$ = this.messagesSubject.asObservable();
  connectionStatus$ = this.statusSubject.asObservable();

  private readonly url = environment.wsUrl || 'ws://localhost:8081';
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.statusSubject.next(ConnectionStatus.CONNECTING);

    try {
      this.socket = new WebSocket(this.url);
      this.setupSocketHandlers();
    } catch (error) {
      this.handleError(error);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.statusSubject.next(ConnectionStatus.DISCONNECTED);
    }
  }

  send(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.statusSubject.next(ConnectionStatus.CONNECTED);
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messagesSubject.next(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.socket.onclose = () => {
      this.statusSubject.next(ConnectionStatus.DISCONNECTED);
      this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      this.handleError(error);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
    }
  }

  private handleError(error: any): void {
    console.error('WebSocket error:', error);
    this.statusSubject.next(ConnectionStatus.ERROR);
  }
}
```

---

### 3️⃣ PRESENTATION (UI)

**Responsabilidad:** Renderizar UI y delegar a Facades

#### Facade Pattern
```typescript
// presentation/auth/facades/login.facade.ts
@Injectable()
export class LoginFacade {
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);
  success$ = new BehaviorSubject<boolean>(false);

  constructor(private authUseCase: AuthUseCase) {}

  login(username: string, password: string): Observable<void> {
    this.loading$.next(true);
    this.error$.next(null);
    this.success$.next(false);

    return this.authUseCase.login(username, password).pipe(
      tap(() => {
        this.success$.next(true);
        this.loading$.next(false);
      }),
      catchError(err => {
        this.error$.next(this.extractError(err));
        this.loading$.next(false);
        return throwError(() => err);
      }),
      map(() => void 0)
    );
  }

  private extractError(err: any): string {
    return err?.message || 'Login failed';
  }
}
```

#### Component
```typescript
// presentation/auth/components/login.component.ts
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [LoginFacade],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="username" placeholder="Username" />
      <input formControlName="password" type="password" placeholder="Password" />
      
      <button type="submit" [disabled]="facade.loading$ | async">
        {{ (facade.loading$ | async) ? 'Loading...' : 'Login' }}
      </button>
      
      <div *ngIf="facade.error$ | async as error" class="error">
        {{ error }}
      </div>
    </form>
  `
})
export class LoginComponent {
  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  constructor(
    private fb: FormBuilder,
    public facade: LoginFacade,
    private router: Router
  ) {}

  onSubmit(): void {
    if (this.form.invalid) return;

    const { username, password } = this.form.value;
    this.facade.login(username!, password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {} // Error manejado por facade
    });
  }
}
```

---

## 🔧 Dependency Injection {#di}

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    // Bindings: Ports → Adapters
    { provide: AuthRepository, useClass: AuthHttpRepository },
    { provide: ThreatRepository, useClass: ThreatHttpRepository },
    { provide: StorageRepository, useClass: LocalStorageRepository },
    { provide: WebSocketGateway, useClass: WebSocketGatewayImpl },
    
    // Use Cases
    { provide: AuthUseCase, useClass: AuthUseCaseService },
    { provide: ThreatUseCase, useClass: ThreatUseCaseService },
    { provide: NotificationUseCase, useClass: NotificationUseCaseService },
    
    // Angular providers
    provideRouter(routes),
    provideHttpClient()
  ]
};
```

---

## 🧪 Testing {#testing}

### Test de Use Case (Dominio)
```typescript
describe('AuthUseCaseService', () => {
  let service: AuthUseCaseService;
  let mockAuthRepo: jasmine.SpyObj<AuthRepository>;
  let mockStorageRepo: jasmine.SpyObj<StorageRepository>;
  let mockWsGateway: jasmine.SpyObj<WebSocketGateway>;

  beforeEach(() => {
    mockAuthRepo = jasmine.createSpyObj('AuthRepository', ['login', 'logout']);
    mockStorageRepo = jasmine.createSpyObj('StorageRepository', ['save', 'get', 'remove']);
    mockWsGateway = jasmine.createSpyObj('WebSocketGateway', ['connect', 'disconnect']);

    service = new AuthUseCaseService(mockAuthRepo, mockStorageRepo, mockWsGateway);
  });

  it('should connect WebSocket when admin logs in', (done) => {
    const session: AuthSession = {
      token: 'abc123',
      user: { id: '1', username: 'admin', role: UserRole.ADMIN },
      expiresAt: new Date(Date.now() + 3600000)
    };

    mockAuthRepo.login.and.returnValue(of(session));

    service.login('admin', 'password').subscribe(() => {
      expect(mockWsGateway.connect).toHaveBeenCalled();
      expect(mockStorageRepo.save).toHaveBeenCalledWith('session', session);
      done();
    });
  });

  it('should NOT connect WebSocket when regular user logs in', (done) => {
    const session: AuthSession = {
      token: 'abc123',
      user: { id: '2', username: 'user', role: UserRole.USER },
      expiresAt: new Date(Date.now() + 3600000)
    };

    mockAuthRepo.login.and.returnValue(of(session));

    service.login('user', 'password').subscribe(() => {
      expect(mockWsGateway.connect).not.toHaveBeenCalled();
      done();
    });
  });
});
```

---

## 🔄 Migración Gradual {#migración}

### Fase 1: Crear Estructura (Sprint 1)
```bash
# Crear carpetas
mkdir -p src/app/domain/{models,ports/{inbound,outbound},services}
mkdir -p src/app/infrastructure/{http,websocket,storage,state}
mkdir -p src/app/presentation/{shared,auth,dashboard}
```

### Fase 2: Migrar AuthService (Sprint 1-2)

**Paso 1:** Crear modelos
```typescript
// domain/models/user.model.ts
// domain/models/auth-session.model.ts
```

**Paso 2:** Crear ports
```typescript
// domain/ports/outbound/auth.repository.ts
// domain/ports/outbound/storage.repository.ts
// domain/ports/inbound/auth.use-case.ts
```

**Paso 3:** Implementar Use Case
```typescript
// domain/services/auth.use-case.service.ts
```

**Paso 4:** Implementar Adaptadores
```typescript
// infrastructure/http/auth-http.repository.ts
// infrastructure/storage/local-storage.repository.ts
```

**Paso 5:** Crear Facade
```typescript
// presentation/auth/facades/login.facade.ts
```

**Paso 6:** Actualizar Componente
```typescript
// presentation/auth/components/login.component.ts
```

**Paso 7:** Configurar DI
```typescript
// app.config.ts
```

**Paso 8:** Eliminar AuthService viejo ✅

### Fase 3: Migrar WsService (Sprint 2-3)
### Fase 4: Migrar ThreatService (Sprint 3)
### Fase 5: Testing (Sprint 4)

---

## 📊 Checklist de Migración

- [ ] Crear estructura de carpetas
- [ ] Definir todos los modelos
- [ ] Definir todos los ports (interfaces)
- [ ] Implementar Use Cases
- [ ] Implementar Adaptadores HTTP
- [ ] Implementar Adaptadores Storage
- [ ] Implementar Adaptadores WebSocket
- [ ] Crear Facades
- [ ] Actualizar Componentes
- [ ] Configurar DI en app.config.ts
- [ ] Escribir tests unitarios (>80% coverage)
- [ ] Eliminar código legacy
- [ ] Code review
- [ ] Documentar cambios

---

## 🎯 Resultado Final

### Antes:
```typescript
// ❌ Todo acoplado
AuthService → WsService
AuthService → localStorage
Component → AuthService
```

### Después:
```typescript
// ✅ Desacoplado
Component → Facade → UseCase → Repository (interface)
                              ↓
                         HttpRepository (implementation)
```

---

**Próximos pasos:** Iniciar Fase 1 en Sprint 1


---

## 🎨 Patrones de Diseño Recomendados

### 1. **Facade Pattern** ✅ CRÍTICO

Simplifica la interacción entre componentes y casos de uso.

```typescript
// presentation/dashboard/facades/dashboard.facade.ts
@Injectable()
export class DashboardFacade {
  loading$ = new BehaviorSubject<boolean>(false);
  threats$ = this.threatUseCase.getThreats();
  
  constructor(
    private threatUseCase: ThreatUseCase,
    private notificationUseCase: NotificationUseCase
  ) {}
  
  submitThreat(data: ThreatFormData): Observable<void> {
    this.loading$.next(true);
    return this.threatUseCase.reportThreat(data).pipe(
      tap(() => this.loading$.next(false)),
      map(() => void 0)
    );
  }
}
```

---

### 2. **Strategy Pattern** ✅ ALTA PRIORIDAD

Para lógica con múltiples variantes (ej: generación de IDs).

```typescript
interface MessageIdStrategy {
  canHandle(payload: any): boolean;
  getId(payload: any): string;
}

class EventIdStrategy implements MessageIdStrategy {
  canHandle(payload: any): boolean {
    return !!payload.eventId;
  }
  getId(payload: any): string {
    return payload.eventId;
  }
}

class MessageIdGenerator {
  private strategies: MessageIdStrategy[] = [
    new EventIdStrategy(),
    new ThreatIdStrategy(),
    new HashStrategy()
  ];
  
  generate(payload: any): string {
    const strategy = this.strategies.find(s => s.canHandle(payload));
    return strategy!.getId(payload);
  }
}
```

---

### 3. **Decorator Pattern** ✅ MEDIA PRIORIDAD

Para agregar funcionalidad (logging, caching, retry).

```typescript
export class LoggingRepositoryDecorator extends ThreatRepository {
  constructor(
    private wrapped: ThreatRepository,
    private logger: LoggerService
  ) { super(); }
  
  save(threat: Threat): Observable<Threat> {
    this.logger.info('Saving threat', { id: threat.id });
    return this.wrapped.save(threat).pipe(
      tap(() => this.logger.info('Threat saved')),
      catchError(err => {
        this.logger.error('Failed to save threat', err);
        return throwError(() => err);
      })
    );
  }
}
```

---

### 4. **Factory Pattern** ✅ ALTA PRIORIDAD

Centraliza creación de objetos complejos.

```typescript
export class ThreatFactory {
  static createFromForm(formData: ThreatFormData): Threat {
    return new Threat(
      this.generateId(),
      formData.type as ThreatType,
      formData.severity as Severity,
      formData.sourceIp,
      formData.targetIp,
      formData.description,
      new Date()
    );
  }
  
  private static generateId(): string {
    return `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

**Próximos pasos:** Implementar estos patrones durante la refactorización
