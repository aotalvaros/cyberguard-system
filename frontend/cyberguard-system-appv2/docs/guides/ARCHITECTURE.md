# Dashboard Architecture - CyberGuard System

## Arquitectura Hexagonal

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           DashboardComponent (UI)                        │  │
│  │  - Formulario de amenazas                                │  │
│  │  - Integración de AlertsComponent                        │  │
│  │  - Header con user info                                  │  │
│  │  - Responsive design                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓ ↑                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Guards (adminGuard)                         │  │
│  │  - Protección de rutas                                   │  │
│  │  - Validación de JWT                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Use Cases                               │  │
│  │  - LoginUseCase                                          │  │
│  │  - LogoutUseCase                                         │  │
│  │  - GetCurrentUserUseCase                                 │  │
│  │  - ReportThreatUseCase                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                       DOMAIN LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Domain Models                           │  │
│  │  - User, LoginCredentials, AuthResponse                  │  │
│  │  - ThreatRequest, ThreatResponse                         │  │
│  │  - ThreatType, ThreatSeverity (enums)                    │  │
│  │  - AlertMessage, WebSocketCommand                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Ports (Interfaces)                          │  │
│  │  - AuthRepository                                        │  │
│  │  - ThreatRepository                                      │  │
│  │  - WebSocketRepository                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Services (Facades)                          │  │
│  │  - AuthService                                           │  │
│  │  - ThreatService                                         │  │
│  │  - WebSocketService                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Repository Implementations                     │  │
│  │  - AuthRepositoryImpl (HttpClient)                       │  │
│  │  - ThreatRepositoryImpl (HttpClient + JWT)              │  │
│  │  - WebSocketRepositoryImpl (WebSocket)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Adapters                                │  │
│  │  - LocalStorageAdapter                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  - REST API (localhost:3000)                                    │
│  - WebSocket Server (localhost:8081)                            │
│  - LocalStorage (Browser)                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### 1. Autenticación y Acceso al Dashboard
```
Usuario → Login Form → AuthService.login()
    ↓
LoginUseCase.execute()
    ↓
AuthRepositoryImpl.login() → API POST /auth/login
    ↓
JWT Token → LocalStorageAdapter.save()
    ↓
Router.navigate('/dashboard')
    ↓
adminGuard.canActivate() → Valida JWT
    ↓
DashboardComponent cargado
    ↓
AuthService.connectWebSocket() → WebSocket conectado
```

### 2. Reporte de Amenaza
```
Usuario → Threat Form → DashboardComponent.onSubmit()
    ↓
ThreatService.reportThreat()
    ↓
ReportThreatUseCase.execute()
    ↓
ThreatRepositoryImpl.report() → API POST /threats (JWT header)
    ↓
Backend procesa → Publica en RabbitMQ
    ↓
WebSocket Worker → Envía notificación
    ↓
WebSocketRepositoryImpl.messages$ → Emite nuevo mensaje
    ↓
AlertsComponent → Actualiza UI en tiempo real
```

### 3. Alertas en Tiempo Real
```
WebSocket Server → Envía mensaje
    ↓
WebSocketRepositoryImpl.onMessage()
    ↓
Deduplicación (eventId, threatId)
    ↓
LocalStorage persistencia (max 200)
    ↓
BehaviorSubject.next(messages)
    ↓
AlertsComponent.messages$ → Subscribe
    ↓
ChangeDetectorRef.detectChanges()
    ↓
UI actualizada con nueva alerta
```

## Patrones de Diseño Aplicados

### 1. Facade Pattern
```typescript
// AuthService actúa como fachada
class AuthService {
  login() { return this.loginUseCase.execute(); }
  logout() { return this.logoutUseCase.execute(); }
  getCurrentUser() { return this.getCurrentUserUseCase.execute(); }
}
```

### 2. Repository Pattern
```typescript
// Abstracción del acceso a datos
abstract class AuthRepository {
  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract logout(): Observable<void>;
}

// Implementación concreta
class AuthRepositoryImpl implements AuthRepository {
  constructor(private http: HttpClient) {}
  login(credentials: LoginCredentials) {
    return this.http.post<AuthResponse>(`${apiUrl}/auth/login`, credentials);
  }
}
```

### 3. Use Case Pattern
```typescript
// Lógica de negocio encapsulada
class LoginUseCase {
  constructor(private authRepository: AuthRepository) {}
  execute(credentials: LoginCredentials) {
    return this.authRepository.login(credentials);
  }
}
```

### 4. Observer Pattern
```typescript
// Estado reactivo con RxJS
class WebSocketService {
  private messagesSubject = new BehaviorSubject<AlertMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();
  
  addMessage(message: AlertMessage) {
    this.messagesSubject.next([...this.messages, message]);
  }
}
```

### 5. Dependency Inversion
```typescript
// Componente depende de abstracción, no implementación
class DashboardComponent {
  constructor(
    private authService: AuthService,  // Facade
    private threatService: ThreatService  // Facade
  ) {}
}

// Configuración en app.config.ts
providers: [
  { provide: AuthRepository, useClass: AuthRepositoryImpl },
  { provide: ThreatRepository, useClass: ThreatRepositoryImpl }
]
```

## Principios SOLID

### Single Responsibility
- `LoginUseCase`: Solo maneja login
- `ReportThreatUseCase`: Solo maneja reporte de amenazas
- `AlertsComponent`: Solo muestra alertas

### Open/Closed
- Nuevos repositorios sin modificar existentes
- Nuevos use cases sin cambiar infraestructura

### Liskov Substitution
- Cualquier implementación de `AuthRepository` es intercambiable
- Mock repositories en tests

### Interface Segregation
- `AuthRepository`: Solo métodos de autenticación
- `ThreatRepository`: Solo métodos de amenazas
- `WebSocketRepository`: Solo métodos de WebSocket

### Dependency Inversion
- Componentes dependen de abstracciones (Services)
- Services dependen de abstracciones (Repositories)
- Repositories son abstracciones (abstract classes)

## Testing Strategy

```
Unit Tests (13 passing)
├── Use Cases (5 tests)
│   ├── LoginUseCase
│   ├── LogoutUseCase
│   ├── GetCurrentUserUseCase
│   └── ReportThreatUseCase
├── Services (4 tests)
│   ├── AuthService
│   └── ThreatService
├── Guards (2 tests)
│   └── adminGuard
└── App (1 test)
    └── AppComponent

Integration Tests (Future)
├── Login → Dashboard flow
├── Report Threat → WebSocket notification
└── Logout → Cleanup
```

## Responsive Breakpoints

```css
/* Mobile First */
.dashboard-container {
  display: grid;
  gap: clamp(1rem, 2vw, 2rem);
}

/* Mobile: < 768px */
@media (max-width: 767px) {
  .dashboard-main { grid-template-columns: 1fr; }
  .form-row { flex-direction: column; }
}

/* Tablet: 768px - 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  .dashboard-main { grid-template-columns: 1fr 1fr; }
}

/* Desktop: > 1024px */
@media (min-width: 1025px) {
  .dashboard-main { grid-template-columns: 1fr 2fr; }
}
```

## Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:8081'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.cyberguard.com',
  wsUrl: 'wss://ws.cyberguard.com'
};
```

## Security Considerations

1. **JWT Authentication**: Token en localStorage, enviado en headers
2. **Route Guards**: adminGuard protege rutas privadas
3. **Input Validation**: Validadores en formularios reactivos
4. **XSS Prevention**: Angular sanitization automática
5. **CORS**: Configurado en backend
6. **WebSocket Security**: Validación de mensajes, deduplicación

## Performance Optimizations

1. **Lazy Loading**: Componentes cargados bajo demanda
2. **Change Detection**: OnPush strategy donde sea posible
3. **WebSocket Reconnection**: Lógica de reconexión automática
4. **LocalStorage Limit**: Máximo 200 mensajes en historial
5. **Pagination**: 10 items por página en alertas
6. **Debounce**: En búsqueda de alertas (futuro)
