# Arquitectura, Patrones de Diseño y Principios SOLID — CyberGuard System

## Índice

1. [Proceso de Implementación de la Épica](#1-proceso-de-implementación-de-la-épica)
2. [Trazabilidad Arquitectónica (Diseño a Código)](#2-trazabilidad-arquitectónica-diseño-a-código)
3. [Cohesión y Desacoplamiento (SOLID)](#3-cohesión-y-desacoplamiento-solid)
4. [Resolución de Complejidad (Patrones)](#4-resolución-de-complejidad-patrones)
5. [Refinamiento Sintáctico (Anti-Smells)](#5-refinamiento-sintáctico-anti-smells)
6. [Evidencia por Archivo](#6-evidencia-por-archivo)

---

## 1. Proceso de Implementación de la Épica

### 1.1 Flujo ASDD (Agent Spec Software Development)

La épica siguió un pipeline estructurado en fases secuenciales y paralelas:

```
        ┌─────────────────────────────┐
        │   FASE 1 — Especificación   │
        │   Spec Generator            │
        │   Requerimiento → Spec .md  │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────────────┐
        │  FASE 2 — Implementación    │
        │  (paralelo)                 │
        │  ┌────────────────────────┐ │
        │  │ Backend Developer      │ │
        │  │ Frontend Developer     │ │
        │  │ Database Agent         │ │
        │  └────────────────────────┘ │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────────────┐
        │  FASE 3 — Testing           │
        │  (paralelo)                 │
        │  ┌────────────────────────┐ │
        │  │ Test Engineer Backend  │ │
        │  │ Test Engineer Frontend │ │
        │  └────────────────────────┘ │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────────────┐
        │  FASE 4 — QA & Validación   │
        │  Gherkin, Riesgos, Perf.    │
        └─────────────────────────────┘
```

### 1.2 Specs Aprobadas (Fuente de Verdad)

Antes de escribir una sola línea de código, se generaron y aprobaron las especificaciones técnicas:

| ID | Feature | Ruta | Estado |
|----|---------|------|--------|
| SPEC-001 | Gestión de Usuarios | `.github/specs/user-management.spec.md` | **APPROVED** |
| SPEC-002 | Creación de Incidentes | `.github/specs/create-incident.spec.md` | **APPROVED** |

Cada spec define: historias de usuario, criterios de aceptación (Gherkin), modelo de datos, endpoints, reglas de negocio y casos edge. La implementación respeta fielmente lo documentado.

### 1.3 Del Documento al Código

```
Requirement (.github/requirements/)
    ↓
Spec Técnica (.github/specs/) — aprobada antes de implementar
    ↓
Domain Layer — entidades, puertos, value objects, excepciones
    ↓
Application Layer — use cases que orquestan la lógica de negocio
    ↓
Infrastructure Layer — adaptadores (PostgreSQL, Redis, RabbitMQ, Firebase)
    ↓
Presentation Layer — controllers (backend) / components (frontend)
```

---

## 2. Trazabilidad Arquitectónica (Diseño a Código)

### 2.1 Arquitectura Hexagonal — Backend

El backend sigue Hexagonal Architecture (Ports & Adapters) con separación estricta en 4 capas:

```
backend/producer/src/
├── domain/                         ← CORE: 100% aislado de frameworks
│   ├── entities/                   ← Threat, Incident, NotificationPreferences
│   ├── ports/                      ← Interfaces (contratos abstractos)
│   ├── services/                   ← ThreatClassifier, IncidentFactory
│   ├── value-objects/              ← IncidentStatus, UserRole
│   └── exceptions/                 ← DomainError y 10 excepciones específicas
│
├── application/                    ← Orquestación: depende SOLO de domain/ports
│   ├── use-cases/                  ← 13 use cases (uno por operación)
│   └── services/                   ← AuthService, ThreatService
│
├── infrastructure/                 ← Adaptadores: implementan los puertos
│   ├── persistence/                ← Postgres*, Redis* (implementan repositories)
│   ├── providers/                  ← Firebase, JWT, RabbitMQ
│   ├── factories/                  ← ServiceFactory (composition root)
│   ├── classification/             ← 5 estrategias de clasificación
│   ├── http/controllers/           ← Controladores Express
│   ├── http/middlewares/           ← Auth, brute-force, validation, error
│   └── config/                     ← Database, Redis, RabbitMQ, env, logger
│
└── types/                          ← Tipado TypeScript compartido
```

#### Aislamiento del Core Domain

El directorio `domain/` no contiene **ningún import** de:
- Express, Joi, PostgreSQL, Redis, RabbitMQ, Firebase
- Ninguna librería HTTP, ORM ni driver de base de datos

Los puertos (`domain/ports/`) son interfaces TypeScript puras que definen contratos sin conocer la tecnología que los implementa.

### 2.2 Arquitectura Hexagonal — Frontend

El frontend Angular replica la misma arquitectura hexagonal:

```
frontend/cyberguard-system-appv2/src/
├── core/
│   ├── domain/
│   │   ├── models/                ← 21 modelos de dominio (interfaces TS)
│   │   └── ports/                 ← 8 abstract classes (contratos)
│   ├── application/
│   │   └── use-cases/             ← 18 use cases
│   └── infrastructure/
│       ├── services/              ← 11 implementaciones (HttpClient, WebSocket)
│       ├── mappers/               ← DTO ↔ Domain transformations
│       └── handlers/              ← Global error handler
│
├── presentation/
│   └── components/                ← Componentes Angular (UI pura)
│
├── shared/
│   ├── factories/                 ← ThreatValidationFactory
│   └── strategies/                ← 5 estrategias de validación
│
└── environments/                  ← Configuración de entorno
```

#### Sin fugas de frameworks en el dominio

Los puertos del frontend usan `abstract class` (requerido por el DI de Angular) pero no importan `HttpClient`, `WebSocket` ni ningún servicio Angular. Solo exponen `Observable<T>` como tipo de retorno (RxJS es la primitiva reactiva del stack, no un framework HTTP).

### 2.3 Correspondencia Diseño → Código

| Concepto del Diseño | Artefacto en Código | Ubicación |
|---------------------|---------------------|-----------|
| Entidad de Dominio | `Threat`, `Incident` | `domain/entities/` |
| Puerto de Repositorio | `ThreatRepository`, `UserRepository` | `domain/ports/` |
| Puerto de Mensajería | `EventPublisher` | `domain/ports/` |
| Estrategia de Clasificación | `ThreatClassificationStrategy` | `domain/ports/` |
| Caso de Uso | `CreateIncidentUseCase`, etc. | `application/use-cases/` |
| Adaptador de Persistencia | `PostgresThreatRepository` | `infrastructure/persistence/` |
| Adaptador de Auth | `FirebaseAuthProvider` | `infrastructure/providers/` |
| Composition Root | `ServiceFactory` | `infrastructure/factories/` |
| Value Object | `IncidentStatus`, `UserRole` | `domain/value-objects/` |
| Excepción de Dominio | `DomainError` → 10 subclases | `domain/exceptions/` |

---

## 3. Cohesión y Desacoplamiento (SOLID)

### 3.1 S — Single Responsibility Principle (SRP)

**Cada clase tiene una única razón para cambiar.**

| Clase | Responsabilidad Única |
|-------|----------------------|
| `CreateIncidentUseCase` | Orquestar la creación de un incidente a partir de una amenaza |
| `PostgresThreatRepository` | Persistir y recuperar amenazas en PostgreSQL |
| `ThreatClassifier` | Delegar la clasificación al strategy correcto |
| `IncidentFactory` | Validar reglas de negocio y construir el record del incidente |
| `ThreatValidationFactory` | Instanciar la estrategia de validación según el tipo |

**Evidencia concreta — `CreateIncidentUseCase`:**

```typescript
// application/use-cases/CreateIncidentUseCase.ts
export class CreateIncidentUseCase {
  constructor(
    private readonly threatRepository: ThreatRepository,     // puerto
    private readonly incidentRepository: IncidentRepository, // puerto
    private readonly auditLogRepository: AuditLogRepository, // puerto
  ) {}

  async execute(input: CreateIncidentInput): Promise<CreateIncidentOutput> {
    // 1. Buscar amenaza
    const threat = await this.threatRepository.findById(input.threatId);
    if (!threat) throw new ThreatNotFoundForIncidentError(input.threatId);

    // 2. Validar severidad (regla de negocio del dominio)
    if (threat.severity !== 'high' && threat.severity !== 'critical')
      throw new InvalidIncidentCreationError(input.threatId, threat.severity);

    // 3. Verificar duplicados
    const existing = await this.incidentRepository.findActiveByThreatId(input.threatId);
    if (existing) throw new DuplicateIncidentError(input.threatId);

    // 4. Crear y persistir
    const incident = Incident.create({ /* ... */ });
    const saved = await this.incidentRepository.save(/* record */);

    // 5. Auditoría
    await this.auditLogRepository.log({ action: 'INCIDENT_CREATED', /* ... */ });

    return { incident: saved };
  }
}
```

Este use case **no sabe** si la base de datos es PostgreSQL, MongoDB o un mock en memoria. Solo habla con puertos.

### 3.2 O — Open/Closed Principle (OCP)

**Abierto para extensión, cerrado para modificación.**

El patrón Strategy implementado en `ThreatClassifier` permite agregar nuevos tipos de amenaza sin modificar código existente:

```
                    ┌─────────────────────────┐
                    │    ThreatClassifier      │
                    │  (Contexto Strategy)     │
                    │                         │
                    │  strategies: Map<Type>   │
                    │  classify(context) ──────┼──► delega al strategy correcto
                    └─────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼──────────┐
    │   Malware      │ │  Phishing    │ │  Ransomware     │
    │   Strategy     │ │  Strategy    │ │  Strategy       │
    └────────────────┘ └──────────────┘ └─────────────────┘
```

Para agregar un nuevo tipo (ej: `zero-day`):
1. Crear `ZeroDayClassificationStrategy` implementando `ThreatClassificationStrategy`
2. Registrarlo en `ServiceFactory.getThreatClassifier()`
3. **No se modifica** ni `ThreatClassifier` ni las estrategias existentes

### 3.3 L — Liskov Substitution Principle (LSP)

**Cualquier implementación es sustituible por su interfaz.**

Ejemplo concreto: `StatisticsMockRepositoryImpl` puede reemplazar transparentemente a `StatisticsRepositoryImpl` porque ambas extienden `StatisticsRepository`:

```typescript
// Puerto (abstracción)
export abstract class StatisticsRepository {
  abstract getStatistics(): Observable<ThreatStatistics>;
  abstract getStatisticsSafe(): Observable<ThreatStatistics>;
}

// Implementación real
@Injectable({ providedIn: 'root' })
export class StatisticsRepositoryImpl extends StatisticsRepository { /* HTTP */ }

// Implementación mock (sustituible)
@Injectable()
export class StatisticsMockRepositoryImpl extends StatisticsRepository { /* datos fijos */ }
```

En tests, se inyecta el mock sin cambiar el código del componente consumidor.

### 3.4 I — Interface Segregation Principle (ISP)

**Interfaces pequeñas y enfocadas, sin métodos innecesarios.**

| Puerto | Métodos | Propósito |
|--------|---------|-----------|
| `EventPublisher` | 1 (`publish`) | Solo publicar eventos |
| `AuditLogRepository` | 1 (`log`) | Solo registrar auditoría |
| `TokenService` | 2 (`generateToken`, `verifyToken`) | Solo gestión de JWT |
| `AuthProvider` | 1-2 (`authenticate`, `createUser?`) | Solo autenticación |
| `ThreatClassificationStrategy` | 1 (`analyze`) + 1 prop (`supportedType`) | Solo clasificar |

Ningún consumidor se ve obligado a depender de métodos que no usa. Compárese con una hipotética interfaz monolítica `ISecurityService` con 30 métodos — aquí cada puerto tiene entre 1 y 13 métodos, todos cohesivos.

### 3.5 D — Dependency Inversion Principle (DIP)

**Las capas superiores dependen de abstracciones, no de implementaciones.**

```
  ┌─────────────────────────────────────────────────────────┐
  │                    DOMAIN (centro)                      │
  │   Entities, Ports (interfaces), Value Objects           │
  │   ► NO depende de NADA externo                         │
  └────────────────────────┬────────────────────────────────┘
                           │ define contratos
  ┌────────────────────────▼────────────────────────────────┐
  │                   APPLICATION                           │
  │   Use Cases reciben puertos por constructor             │
  │   ► Depende SOLO de domain/ports                       │
  └────────────────────────┬────────────────────────────────┘
                           │ implementa contratos
  ┌────────────────────────▼────────────────────────────────┐
  │                  INFRASTRUCTURE                         │
  │   PostgresXxxRepository, FirebaseAuthProvider, etc.     │
  │   ServiceFactory (composition root) conecta todo        │
  │   ► Conoce las implementaciones concretas              │
  └─────────────────────────────────────────────────────────┘
```

**Evidencia — `ServiceFactory` como Composition Root:**

```typescript
// infrastructure/factories/ServiceFactory.ts
static getCreateIncidentUseCase(): CreateIncidentUseCase {
  return new CreateIncidentUseCase(
    this.getThreatRepository(),    // → retorna ThreatRepository (interfaz)
    this.getIncidentRepository(),  // → retorna IncidentRepository (interfaz)
    this.getAuditLogRepository(),  // → retorna AuditLogRepository (interfaz)
  );
}

// Internamente:
static getThreatRepository(): ThreatRepository {
  if (!this.threatRepository) {
    this.threatRepository = new PostgresThreatRepository(); // ← ÚNICO lugar que sabe de Postgres
  }
  return this.threatRepository; // ← Retorna la INTERFAZ, no la implementación
}
```

El `CreateIncidentUseCase` nunca ve `PostgresThreatRepository`. Solo ve `ThreatRepository`. Si mañana migramos a MongoDB, cambiamos UNA línea en `ServiceFactory` y el use case no se entera.

**Evidencia — Frontend Angular DI:**

```typescript
// app.config.ts — providers registran la relación abstract → concrete
providers: [
  { provide: ThreatRepository, useClass: ThreatRepositoryImpl },
  { provide: WebSocketRepository, useClass: WebSocketRepositoryImpl },
  { provide: AuthRepository, useClass: AuthRepositoryImpl },
]
```

Los componentes y use cases inyectan `ThreatRepository` (abstracta), Angular resuelve a `ThreatRepositoryImpl` en runtime.

---

## 4. Resolución de Complejidad (Patrones)

### 4.1 Strategy Pattern — Clasificación de Amenazas (Backend)

**Complejidad que resuelve**: Cada tipo de amenaza (malware, phishing, DDoS, ransomware, intrusion) tiene reglas de clasificación radicalmente diferentes: distintos umbrales de riesgo, distintas condiciones de auto-bloqueo, distintas escalaciones de severidad. Sin Strategy, esto sería un bloque monolítico de `if/else` de 200+ líneas.

#### Implementación en 3 capas:

**1. Puerto (contrato) — `domain/ports/ThreatClassificationStrategy.ts`:**

```typescript
export interface ThreatClassificationStrategy {
  readonly supportedType: ThreatType;
  analyze(context: ThreatContext): ThreatAnalysisResult;
}

export interface ThreatAnalysisResult {
  riskScore: number;              // 0-100
  recommendedSeverity: string;
  tags: string[];
  autoBlock: boolean;
}
```

**2. Contexto (orquestador) — `domain/services/ThreatClassifier.ts`:**

```typescript
export class ThreatClassifier {
  private readonly strategies: ReadonlyMap<ThreatType, ThreatClassificationStrategy>;

  constructor(strategies: readonly ThreatClassificationStrategy[]) {
    const strategyMap = new Map<ThreatType, ThreatClassificationStrategy>();
    for (const strategy of strategies) {
      strategyMap.set(strategy.supportedType, strategy);
    }
    this.strategies = strategyMap;
  }

  classify(context: ThreatContext): ThreatAnalysisResult {
    const strategy = this.strategies.get(context.type);
    if (!strategy) return this.defaultAnalysis(context);
    return strategy.analyze(context);
  }
}
```

**3. Estrategias concretas — `infrastructure/classification/ThreatClassificationStrategies.ts`:**

| Estrategia | Tipo | Auto-bloqueo | Escalación de Severidad |
|------------|------|--------------|------------------------|
| `MalwareClassificationStrategy` | malware | riskScore ≥ 90 | riskScore ≥ 80 → critical |
| `IntrusionClassificationStrategy` | intrusion | autoDetected o riskScore ≥ 85 | riskScore ≥ 75 → critical |
| `PhishingClassificationStrategy` | phishing | riskScore ≥ 80 | Preserva original |
| `DdosClassificationStrategy` | ddos | **Siempre** | riskScore ≥ 70 → critical |
| `RansomwareClassificationStrategy` | ransomware | **Siempre** | **Siempre** critical |

**¿Por qué es escalable?** Para agregar soporte para un nuevo tipo de amenaza `zero-day`:
1. Crear `ZeroDayClassificationStrategy` implementando `ThreatClassificationStrategy`
2. Agregarla al array en `ServiceFactory.getThreatClassifier()`
3. Las 5 estrategias existentes y `ThreatClassifier` quedan intactos (OCP)

### 4.2 Strategy + Factory Pattern — Validación de Amenazas (Frontend)

**Complejidad que resuelve**: La validación en el formulario de reporte de amenazas varía según el tipo seleccionado. Cada tipo tiene reglas específicas sobre campos requeridos, severidad mínima y contenido de la descripción.

**Factory Method — `ThreatValidationFactory`:**

```typescript
@Injectable({ providedIn: 'root' })
export class ThreatValidationFactory {
  createValidator(type: ThreatType): ThreatValidationStrategy {
    switch (type) {
      case ThreatType.MALWARE:     return new MalwareValidationStrategy();
      case ThreatType.PHISHING:    return new PhishingValidationStrategy();
      case ThreatType.DDOS:        return new DdosValidationStrategy();
      case ThreatType.RANSOMWARE:  return new RansomwareValidationStrategy();
      default:                     return new DefaultValidationStrategy();
    }
  }
}
```

**Estrategias de validación:**

| Estrategia | Reglas de Negocio |
|------------|-------------------|
| `MalwareValidationStrategy` | Descripción debe mencionar "malware" o "virus"; severidad ≥ medium |
| `PhishingValidationStrategy` | Descripción debe mencionar "phishing" o "email" |
| `DdosValidationStrategy` | Severidad debe ser high o critical |
| `RansomwareValidationStrategy` | Severidad debe ser critical siempre |
| `DefaultValidationStrategy` | Descripción ≥ 10 caracteres, formato de IP válido |

### 4.3 Factory Pattern — Creación de Entidades de Dominio

**Complejidad que resuelve**: Las entidades de dominio requieren validación y defaults consistentes al momento de la creación. El constructor está privatizado para forzar el uso del factory method.

```typescript
// domain/entities/Threat.ts
export class Threat {
  private constructor(/* readonly props */) {}

  static create(props: ThreatProps): Threat {
    return new Threat(
      props.threatId || uuidv4(),                         // ID auto-generado
      props.type,
      props.severity,
      props.sourceIp,
      props.description,
      props.targetIp,
      props.metadata,
      props.timestamp || new Date().toISOString()          // timestamp default
    );
  }

  // Comportamiento de dominio (no getters/setters vacíos)
  isHighSeverity(): boolean { return this.severity === 'high' || this.severity === 'critical'; }
  isCritical(): boolean { return this.severity === 'critical'; }
}
```

### 4.4 Factory Pattern — `IncidentFactory` con Reglas de Negocio

```typescript
// domain/services/IncidentFactory.ts
export class IncidentFactory {
  constructor(private readonly deps: IncidentFactoryDeps) {}

  async createFromThreat(threat: Threat, threatDbId: number): Promise<NewIncidentRecord> {
    // Regla 1: Solo amenazas de alta severidad generan incidentes
    if (!threat.isHighSeverity()) {
      throw new InvalidIncidentCreationError(threatDbId, threat.severity);
    }
    // Regla 2: No duplicar incidentes activos para la misma amenaza
    const alreadyExists = await this.deps.checkExistingIncident(threatDbId);
    if (alreadyExists) throw new DuplicateIncidentError(threatDbId);

    return { /* construye record validado */ };
  }
}
```

### 4.5 Repository Pattern — Abstracción de Persistencia

**Complejidad que resuelve**: Desacoplar la lógica de negocio de la tecnología de almacenamiento.

```
┌──────────────────┐         ┌───────────────────────┐
│   Use Case       │────────►│  ThreatRepository     │ (puerto/interfaz)
│  (application)   │         │   save()              │
└──────────────────┘         │   findAll()           │
                             │   findById()          │
                             │   delete()            │
                             └───────────┬───────────┘
                                         │ implementa
                             ┌───────────▼───────────┐
                             │ PostgresThreatRepo     │ (adaptador)
                             │  → SQL queries         │
                             │  → Connection pool     │
                             └───────────────────────┘
```

**Backend — 6 implementaciones de repositorio:**

| Puerto (Interfaz) | Adaptador (Implementación) | Storage |
|--------------------|-----------------------------|---------|
| `ThreatRepository` | `PostgresThreatRepository` | PostgreSQL |
| `UserRepository` | `PostgresUserRepository` | PostgreSQL |
| `IncidentRepository` | `PostgresIncidentRepository` | PostgreSQL |
| `AuditLogRepository` | `PostgresAuditLogRepository` | PostgreSQL |
| `ThreatStatisticsRepository` | `PostgresThreatStatisticsRepository` | PostgreSQL |
| `NotificationPreferencesRepository` | `RedisNotificationPreferencesRepository` | Redis |

**Frontend — 8 implementaciones:**

| Puerto (Abstract Class) | Adaptador | Medio |
|--------------------------|-----------|-------|
| `ThreatRepository` | `ThreatRepositoryImpl` | HTTP API |
| `AuthRepository` | `AuthRepositoryImpl` | HTTP + LocalStorage |
| `IncidentRepository` | `IncidentRepositoryImpl` | HTTP API |
| `StatisticsRepository` | `StatisticsRepositoryImpl` | HTTP API |
| `UserAdminRepository` | `UserAdminRepositoryImpl` | HTTP API |
| `WebSocketRepository` | `WebSocketRepositoryImpl` | WebSocket nativo |
| `AdminProfileRepository` | `AdminProfileRepositoryImpl` | HTTP API |
| `NotificationPreferencesRepository` | `NotificationPreferencesRepositoryImpl` | HTTP API |

### 4.6 Composition Root / Service Locator — `ServiceFactory`

**Complejidad que resuelve**: Centralizar el wiring de dependencias en un único punto. Sin un contenedor de DI externo (como NestJS), `ServiceFactory` actúa como Composition Root manual con lazy initialization y singleton caching.

Características clave:
- **Lazy Singleton**: cada dependencia se instancia una sola vez, bajo demanda
- **Tipo de retorno = puerto**: los métodos retornan la interfaz, no la clase concreta
- **`resetForTesting()`**: permite limpiar el estado para tests unitarios aislados

```typescript
// ÚNICO archivo que conoce implementaciones concretas
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
```

---

## 5. Refinamiento Sintáctico (Anti-Smells)

### 5.1 Nombrado Intencional

El código usa nombres descriptivos que comunican propósito, no implementación:

| Tipo | Ejemplo | Anti-patrón evitado |
|------|---------|---------------------|
| Variable | `recommendedSeverity` | ~~`data`~~, ~~`result`~~, ~~`value`~~ |
| Método | `isHighSeverity()` | ~~`checkSev()`~~, ~~`doCheck()`~~ |
| Clase | `MalwareClassificationStrategy` | ~~`Strategy1`~~, ~~`Handler`~~ |
| Use Case | `CreateIncidentUseCase` | ~~`IncidentManager`~~, ~~`IncidentHelper`~~ |
| Excepción | `DuplicateIncidentError` | ~~`CustomError`~~, ~~`AppError`~~ |
| Puerto | `ThreatClassificationStrategy` | ~~`IStrategy`~~, ~~`BaseStrategy`~~ |

### 5.2 Sin Código Muerto

- **Cero imports sin usar**: cada import se consume en el archivo
- **Cero bloques comentados**: no hay código comentado "por si acaso"
- **Cero variables sin referenciar**: revisado por el linter de TypeScript

### 5.3 Manejo de Errores Explícito

Las excepciones de dominio son tipadas y llevan contexto:

```typescript
// domain/exceptions/DomainError.ts — clase base con código estructurado
export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,                  // ejemplo: 'THREAT_NOT_FOUND'
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Uso específico
throw new ThreatNotFoundException(threatId);       // código: 'THREAT_NOT_FOUND'
throw new DuplicateIncidentError(threatId);        // mensaje descriptivo
throw new SelfModificationForbiddenError(userId);  // impide auto-desactivación
```

No hay `try/catch` vacíos ni errores genéricos `throw new Error("error")`.

### 5.4 Funciones Cortas y Cohesivas

Los métodos siguen la regla de una operación por función:

```typescript
// domain/entities/Threat.ts
isHighSeverity(): boolean {
  return this.severity === 'high' || this.severity === 'critical';
}

// domain/services/ThreatClassifier.ts
classify(context: ThreatContext): ThreatAnalysisResult {
  const strategy = this.strategies.get(context.type);
  if (!strategy) return this.defaultAnalysis(context);
  return strategy.analyze(context);
}
```

### 5.5 Constructores Privados + Factory Methods

Las entidades no exponen constructores públicos. Esto previene la creación de objetos en estado inválido:

```typescript
// ✅ Correcto — factory method con defaults
const threat = Threat.create({ type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: '...' });

// ❌ Imposible — constructor privado
const threat = new Threat(/* ... */); // Error: constructor is private
```

---

## 6. Evidencia por Archivo

### 6.1 Domain Layer (Cero dependencias de infraestructura)

| Archivo | Imports externos | Frameworks | Lógica de negocio |
|---------|------------------|------------|-------------------|
| `domain/entities/Threat.ts` | `uuid` | Ninguno | `isHighSeverity()`, `isCritical()`, factory `create()` |
| `domain/entities/Incident.ts` | `uuid` | Ninguno | `isActive()`, factory `create()` |
| `domain/ports/ThreatRepository.ts` | Ninguno | Ninguno | Contrato puro |
| `domain/ports/UserRepository.ts` | Ninguno | Ninguno | Contrato puro con 13 operaciones |
| `domain/ports/EventPublisher.ts` | Ninguno | Ninguno | Contrato con 1 método |
| `domain/services/ThreatClassifier.ts` | Ninguno | Ninguno | Strategy context + Map |
| `domain/services/IncidentFactory.ts` | Ninguno | Ninguno | Validación + construcción |
| `domain/exceptions/DomainError.ts` | Ninguno | Ninguno | Base abstracta con `code` |
| `domain/value-objects/IncidentStatus.ts` | Ninguno | Ninguno | Enum + lifecycle helpers |
| `domain/value-objects/UserRole.ts` | Ninguno | Ninguno | Enum + validation |

### 6.2 Application Layer (Solo depende de puertos)

| Archivo | Depende de | NO depende de |
|---------|-----------|---------------|
| `CreateIncidentUseCase` | `ThreatRepository`, `IncidentRepository`, `AuditLogRepository` | PostgreSQL, Express, Redis |
| `ListThreatsUseCase` | `ThreatRepository` | PostgreSQL, Express |
| `CreateUserUseCase` | `UserRepository`, `AuditLogRepository` | PostgreSQL, Firebase |
| `ToggleUserStatusUseCase` | `UserRepository`, `AuditLogRepository`, `IncidentRepository` | PostgreSQL |

### 6.3 Infrastructure Layer (Implementa puertos)

| Archivo | Implementa | Usa tecnología |
|---------|-----------|----------------|
| `PostgresThreatRepository` | `ThreatRepository` | PostgreSQL (pg) |
| `PostgresUserRepository` | `UserRepository` | PostgreSQL (pg) |
| `RedisNotificationPreferencesRepository` | `NotificationPreferencesRepository` | Redis (ioredis) |
| `RabbitMQPublisher` | `EventPublisher` | amqplib |
| `FirebaseAuthProvider` | `AuthProvider` | firebase-admin |
| `JWTTokenService` | `TokenService` | jsonwebtoken |
| `ServiceFactory` | Composition Root | Todas las concretas |

### 6.4 Resumen de Cobertura de Tests

| Suite | Archivos | Tests | Estado |
|-------|----------|-------|--------|
| Frontend (Vitest) | 57 | 550 | ✅ 100% passed |
| Backend Producer (Jest) | 48 | 911 | ✅ 100% passed |
| Backend Worker (Jest) | 10 | 151 | ✅ 100% passed |
| **Total** | **115** | **1,612** | **✅ All green** |

---

## Resumen de Patrones y Principios

| Patrón / Principio | Dónde se aplica | Problema que resuelve |
|--------------------|-----------------|-----------------------|
| **Hexagonal Architecture** | Todo el sistema (BE + FE) | Aislamiento del dominio de frameworks |
| **Strategy Pattern** | Clasificación de amenazas (BE), Validación (FE) | Eliminar `if/else` monolíticos; extensibilidad OCP |
| **Factory Method** | `ThreatValidationFactory`, `Threat.create()`, `Incident.create()` | Creación controlada de objetos con validación |
| **Repository Pattern** | 6 repos BE + 8 repos FE | Abstracción de persistencia/comunicación |
| **Composition Root** | `ServiceFactory` (BE), `app.config.ts` (FE) | Centralizar el wiring; DIP estricto |
| **Value Object** | `IncidentStatus`, `UserRole` | Encapsular estado válido del dominio |
| **Domain Exception Hierarchy** | `DomainError` → 10 subclases | Manejo de errores tipado y estructurado |
| **SRP** | 13 use cases, 10 puertos, 6 repos | Cada clase tiene una razón de cambio |
| **OCP** | Strategy pattern, Repository pattern | Extensible sin modificar código existente |
| **LSP** | Mock repos sustituyen reales en tests | Sustitución transparente de implementaciones |
| **ISP** | Puertos con 1-3 métodos promedio | Sin interfaces infladas |
| **DIP** | Use cases → puertos; Factory → concretas | High-level no depende de low-level |
