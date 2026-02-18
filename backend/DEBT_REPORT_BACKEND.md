# Reporte de Deuda Tecnica - Backend CyberGuard System

**Fecha:** Febrero 2026  
**Auditor:** Backend Senior  
**Alcance:** Producer API + Worker  
**Calificacion General:** 4/5 - Funcional para MVP con testing robusto, requiere refactorizacion arquitectonica para produccion


---

## Resumen Ejecutivo

El backend cumple los requisitos funcionales del MVP y cuenta con suite de testing completa (85%+ cobertura). Sin embargo, persiste deuda tecnica en:


1. **Arquitectura:** Acoplamiento directo a infraestructura (RabbitMQ) desde la logica de negocio
2. **Codigo Limpio:** Uso extensivo de tipos `any`, estado global mutable, logica dispersa
3. **Seguridad:** Implementacion no sigue las guidelines documentadas (SECURITY_GUIDELINES.md)
4. **Testing:** Tests unitarios implementados, faltan tests de integracion

El patron actual es **Transaction Script** con dependencias directas. Se recomienda migrar a **Arquitectura Hexagonal** para desacoplar dominio de infraestructura.

**¿Por qué se usó?:**

✅ MVP rápido: Implementación directa sin capas complejas
✅ Equipo pequeño: Solo 2 desarrolladores
✅ Funcionalidad simple: CRUD básico + mensajería
❌ Pero genera deuda técnica: Acoplamiento directo a infraestructura

**Mejoras Recientes (Febrero 2026):**
- ✅ Suite completa de tests unitarios (120+ casos)
- ✅ Cobertura de codigo: 40% → 85%+
- ✅ Mock infrastructure eliminando dependencias de Docker en tests
- ✅ Estructura organizada por capas en `__tests__/unit/`
- ✅ Tiempo de ejecucion: 30s → <5s (-83%)
- ✅ Flakiness: 10% → 0% (-100%)

---

## 1. Errores de Arquitectura

### 1.1 Estructura de Carpetas NO sigue Arquitectura Hexagonal

**Problema:** La estructura actual organiza código por tipo técnico (controllers, services, config) en lugar de por capas arquitectónicas (domain, application, infrastructure).

**Estructura ACTUAL (Transaction Script):**
```
backend/producer/src/
├── config/           # ❌ Infraestructura mezclada
├── controllers/      # ❌ HTTP + Lógica de negocio fuera de infrastructure
├── services/         # ❌ Dominio + Infraestructura mezclados
├── middlewares/      # ❌ Fuera de infrastructure/http
├── domain/
│   └── ports/        # ✅ Interfaces (parcialmente implementado)
├── infrastructure/
│   ├── auth/         # ✅ Adaptadores de autenticación
│   ├── event-publishers/ # ✅ Adaptadores de eventos
│   └── factories/    # ✅ Composición de dependencias
└── types/
```

**Estructura PROPUESTA (Hexagonal Architecture):**
```
backend/producer/src/
├── domain/                    # ✅ CORE - Sin dependencias externas
│   ├── entities/
│   │   ├── Threat.ts
│   │   └── User.ts
│   ├── value-objects/
│   │   ├── ThreatType.ts
│   │   └── Severity.ts
│   ├── repositories/          # Ports (Interfaces) para persistencia
│   │   ├── ThreatRepository.ts
│   │   └── UserRepository.ts
│   └── services/              # Lógica de dominio pura
│       └── ThreatValidator.ts
│
├── application/               # ✅ Casos de Uso (Orquestación)
│   └── use-cases/
│       ├── auth/
│       │   ├── LoginUseCase.ts
│       │   └── RefreshTokenUseCase.ts
│       └── threats/
│           ├── ReportThreatUseCase.ts
│           └── ListThreatsUseCase.ts
│
├── infrastructure/            # ✅ ADAPTADORES (Implementaciones)
│   ├── http/                  # Adaptadores de ENTRADA
│   │   ├── controllers/
│   │   │   ├── AuthController.ts
│   │   │   └── ThreatController.ts
│   │   ├── middlewares/
│   │   │   ├── AuthMiddleware.ts
│   │   │   └── BruteForceMiddleware.ts
│   │   └── routes/
│   │       └── index.ts
│   │
│   ├── persistence/           # Adaptadores de SALIDA (Repositorios)
│   │   ├── InMemoryThreatRepository.ts
│   │   ├── PostgresUserRepository.ts
│   │   └── mappers/
│   │
│   ├── providers/             # Adaptadores de SALIDA (Servicios externos)
│   │   ├── RabbitMQEventPublisher.ts
│   │   ├── BcryptHashProvider.ts
│   │   ├── JWTTokenProvider.ts
│   │   └── RedisRateLimitStore.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── database.ts
│   │
│   └── factories/
│       └── ServiceFactory.ts  # Composition Root
│
└── server.ts                  # Entry Point
```

**Flujo de una Petición HTTP:**
```
[HTTP Request POST /api/threats] 
    ↓
[infrastructure/http/controllers/ThreatController.ts]  # Adaptador de entrada
    ↓
[application/use-cases/ReportThreatUseCase.ts]         # Caso de uso
    ↓
[domain/entities/Threat.ts]                            # Lógica de negocio pura
    ↓
[domain/repositories/ThreatRepository.ts]              # Port (Interface)
    ↓
[infrastructure/persistence/InMemoryThreatRepository.ts] # Adaptador de salida
```

**Beneficios de la Refactorización:**
- ✅ **Dominio independiente**: Sin imports de bibliotecas externas (Express, RabbitMQ, etc.)
- ✅ **Testabilidad**: Mockear interfaces (ports) en lugar de módulos concretos
- ✅ **Flexibilidad**: Cambiar RabbitMQ → Kafka solo modificando `infrastructure/providers/`
- ✅ **Claridad**: Código organizado por responsabilidad arquitectónica
- ✅ **Ports & Adapters**: Clara separación entre interfaces y implementaciones

**Ejemplo Práctico:**
```typescript
// ❌ ANTES - Acoplamiento directo
// services/threat.service.ts
import { publishEvent } from '../config/rabbitmq';

export class ThreatService {
  async reportThreat(data: ThreatRequest) {
    const event = this.buildEvent(data);
    await publishEvent('threat.detected', event); // Dependencia directa a RabbitMQ
  }
}

// ✅ DESPUÉS - Inversión de Dependencias
// domain/repositories/EventPublisher.ts (Port)
export interface EventPublisher {
  publish(topic: string, event: DomainEvent): Promise<void>;
}

// application/use-cases/ReportThreatUseCase.ts
export class ReportThreatUseCase {
  constructor(
    private eventPublisher: EventPublisher,  // ✅ Depende de abstracción
    private threatRepository: ThreatRepository
  ) {}

  async execute(data: ThreatRequest): Promise<Threat> {
    const threat = Threat.create(data);
    await this.threatRepository.save(threat);
    await this.eventPublisher.publish('threat.detected', threat.toEvent());
    return threat;
  }
}

// infrastructure/providers/RabbitMQEventPublisher.ts (Adapter)
export class RabbitMQEventPublisher implements EventPublisher {
  async publish(topic: string, event: DomainEvent): Promise<void> {
    await publishEvent(topic, event);
  }
}
```

**Impacto:** Alto - Mejora mantenibilidad, testabilidad y escalabilidad  
**Esfuerzo:** 8-10 horas (Refactorización completa de estructura + migración de archivos)  
**Prioridad:** P1

---

### 1.2 Usuario Hardcodeado con Contraseña en Texto Plano

**Archivo:** `backend/producer/src/config/env.ts`

**Problema:** El sistema depende de un único usuario administrador definido en variables de entorno, con la contraseña almacenada en texto plano accessible desde la configuración.

```typescript
// ACTUAL - Usuario hardcodeado en .env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123  // ❌ Texto plano en archivo de configuración

// Cargado en memoria
export const config = {
  adminUsername: process.env.ADMIN_USERNAME!,
  adminPassword: process.env.ADMIN_PASSWORD!,  // ❌ Expuesto en objeto config
  // ...
};
```

**Limitaciones Críticas:**
1. ❌ **Sin soporte multiusuario**: Solo 1 administrador puede acceder al sistema
2. ❌ **Sin hashing**: Contraseña en texto plano en `.env` y memoria del proceso
3. ❌ **Sin auditoría**: No hay registro de quién accedió, cuándo ni desde dónde
4. ❌ **Sin bloqueo persistente**: El `bruteforce.middleware.ts` usa `Map` en memoria (se pierde al reiniciar)
5. ❌ **Sin rotación de credenciales**: Cambiar contraseña requiere reiniciar la aplicación
6. ❌ **Violación OWASP A02:2021**: Fallas Criptográficas
7. ❌ **Violación PCI DSS 8.2.1**: Contraseñas deben estar hasheadas con algoritmo fuerte

**Riesgo Real:**
- Si un atacante obtiene acceso al archivo `.env` (via Git leak, backup expuesto, etc.), puede leer la contraseña directamente
- Un proceso malicioso con acceso a la memoria puede leer `config.adminPassword`
- Logs accidentales pueden exponer las credenciales

**Solución Propuesta:**
Migrar a base de datos PostgreSQL con bcrypt (ver sección 6 del reporte para implementación completa).

```typescript
// PROPUESTO - Con base de datos y hashing
interface User {
  id: string;
  username: string;
  passwordHash: string;  // ✅ Bcrypt hash (ej: $2b$10$N9qo8uL...)
  role: string;
  isLocked: boolean;
  failedAttempts: number;
  lastLogin: Date;
  createdAt: Date;
}

// application/use-cases/LoginUseCase.ts
export class LoginUseCase {
  constructor(
    private userRepository: UserRepository,
    private hashProvider: HashProvider,
    private tokenProvider: TokenProvider
  ) {}

  async execute(credentials: LoginRequest): Promise<AuthResult> {
    const user = await this.userRepository.findByUsername(credentials.username);
    
    if (!user) {
      // ✅ Mismo mensaje para prevenir enumeración de usuarios
      return { success: false, error: 'Invalid credentials' };
    }

    if (user.isLocked) {
      return { success: false, error: 'Account locked. Contact administrator.' };
    }

    // ✅ Comparación de tiempo constante con bcrypt
    const isValid = await this.hashProvider.compare(
      credentials.password, 
      user.passwordHash
    );
    
    if (!isValid) {
      await this.userRepository.incrementFailedAttempts(user.id);
      return { success: false, error: 'Invalid credentials' };
    }

    // Resetear intentos fallidos
    await this.userRepository.resetFailedAttempts(user.id);
    
    // Generar token JWT
    const token = this.tokenProvider.generate({ 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    });
    
    return { success: true, token, user };
  }
}
```

**Impacto:** Crítico - Bloquea producción según estándares OWASP y PCI DSS  
**Esfuerzo:** 6-8 horas (Incluye migración a PostgreSQL completa)  
**Prioridad:** P0 (Blocker)

---

### 1.3 BruteForceMiddleware Instancia ThreatService Sin Dependencias

**Archivo:** `backend/producer/src/middlewares/bruteforce.middleware.ts`

**Problema:** El middleware intenta instanciar `ThreatService` directamente sin pasar el argumento `EventPublisher` requerido por el constructor refactorizado.

```typescript
// ACTUAL - Instanciación incorrecta tras refactorización
const threatService = new ThreatService();  // ❌ Falta argumento EventPublisher

async function trackFailedAttempt(ip: string, username?: string) {
  if (attempt.count >= MAX_ATTEMPTS && !attempt.reported) {
    await threatService.reportThreat({
      type: 'intrusion',
      severity: 'high',
      sourceIp: ip,
      description: `Brute force attack detected: ${attempt.count} failed login attempts`
    });
  }
}
```

**Error en Tiempo de Ejecución:**
```
TypeError: Cannot read property 'publish' of undefined
    at ThreatService.reportThreat (threat.service.ts:15)
```

**Causa Raíz:**
Tras implementar Dependency Injection en `ThreatService`, el constructor ahora requiere un `EventPublisher`:

```typescript
// services/threat.service.ts (refactorizado)
export class ThreatService {
  constructor(private eventPublisher: EventPublisher) {}  // ✅ DI aplicada
  
  async reportThreat(data: ThreatRequest): Promise<string> {
    // ...
    await this.eventPublisher.publish(routingKey, event);  // Requiere eventPublisher
  }
}
```

**Solución:** Usar `ServiceFactory` para obtener instancia con dependencias inyectadas.

```typescript
// PROPUESTO - Usar Factory Pattern
import { ServiceFactory } from '../infrastructure/factories/ServiceFactory';

let threatService: ThreatService;

function getThreatService(): ThreatService {
  if (!threatService) {
    threatService = ServiceFactory.getThreatService();  // ✅ Obtiene instancia con DI
  }
  return threatService;
}

async function trackFailedAttempt(ip: string, username?: string) {
  if (attempt.count >= MAX_ATTEMPTS && !attempt.reported) {
    const service = getThreatService();  // ✅ Lazy initialization
    await service.reportThreat({
      type: 'intrusion',
      severity: 'high',
      sourceIp: ip,
      description: `Brute force attack detected: ${attempt.count} failed login attempts`
    });
  }
}
```

**Beneficio Adicional:**
- ✅ **Singleton reutilizado**: Una sola instancia de `ThreatService` para todo el middleware
- ✅ **Lazy initialization**: Solo se crea cuando se detecta un ataque de fuerza bruta
- ✅ **Consistencia**: Usa el mismo patrón que los controllers

**Impacto:** Alto - Rompe funcionalidad de detección de ataques de fuerza bruta  
**Esfuerzo:** 15 minutos  
**Prioridad:** P0 (Blocker - Bug en producción)

---

### 1.4 Estado Global Mutable en RabbitMQ

**Archivo:** `backend/producer/src/config/rabbitmq.ts`

**Problema:** Variables globales mutables dificultan testing, causan race conditions y previenen escalado horizontal.

```typescript
// ACTUAL - Estado global mutable
let connection: any = null;
let channel: any = null;

export async function connectRabbitMQ(): Promise<void> {
  connection = await amqp.connect(url);
  channel = await connection.createChannel();
}
```

**Solucion:** Encapsular en clase singleton con estado privado.

```typescript
// PROPUESTO - Singleton encapsulado
class RabbitMQProvider {
  private static instance: RabbitMQProvider;
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  
  static getInstance(): RabbitMQProvider {
    if (!this.instance) this.instance = new RabbitMQProvider();
    return this.instance;
  }
}
```

**Impacto:** Alto  
**Esfuerzo:** 2-3 horas

---

### 1.5 Publisher sin Confirmacion (Fire and Forget)

**Archivo:** `backend/producer/src/config/rabbitmq.ts`

**Problema:** Los mensajes se publican sin esperar confirmacion de RabbitMQ. Una amenaza critica podria perderse silenciosamente.

```typescript
// ACTUAL - Sin confirmacion
channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(event)));
// El codigo continua sin saber si RabbitMQ recibio el mensaje
```

**Solucion:** Usar Confirm Channel con callback de confirmacion.

```typescript
// PROPUESTO - Con confirmacion
const channel = await connection.createConfirmChannel();
await new Promise((resolve, reject) => {
  channel.publish(exchange, key, buffer, { persistent: true }, 
    (err) => err ? reject(err) : resolve(true));
});
```

**Impacto:** Critico para sistema de ciberseguridad  
**Esfuerzo:** 1-2 horas

---

### 1.6 Acoplamiento Directo a Infraestructura

**Archivos:** `threat.service.ts`, `bruteforce.middleware.ts`

**Problema:** Los servicios importan directamente `publishEvent` de RabbitMQ. Si el CTO decide cambiar a Kafka o AWS SQS, habria que modificar la logica de negocio.

```typescript
// ACTUAL - Import directo de infraestructura
import { publishEvent } from '../config/rabbitmq';

export class ThreatService {
  async createThreat(data: ThreatRequest): Promise<ThreatDetectedEvent> {
    const event = this.buildEvent(data);
    await publishEvent(routingKey, event);  // Acoplado a RabbitMQ
    return event;
  }
}
```

**Solucion:** Aplicar Inversion de Dependencias con interfaz abstracta.

```typescript
// PROPUESTO - Interfaz de puerto
interface EventPublisher {
  publish(topic: string, event: DomainEvent): Promise<void>;
}

class ThreatService {
  constructor(private publisher: EventPublisher) {}
  
  async createThreat(data: ThreatRequest): Promise<ThreatDetectedEvent> {
    const event = this.buildEvent(data);
    await this.publisher.publish('threat.detected', event);
    return event;
  }
}
```

**Impacto:** Alto - Afecta mantenibilidad a largo plazo  
**Esfuerzo:** 4-6 horas

---

### 1.7 ThreatStore con Complejidad O(n log n) en Cada Lectura

**Archivo:** `backend/producer/src/services/threat.store.ts`

**Problema:** El metodo `getAll()` ordena el array completo en cada llamada.

```typescript
// ACTUAL - Ordenamiento en cada GET
getAll(): ThreatDetectedEvent[] {
  return [...this.threats].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
```

**Solucion:** Mantener insercion ordenada O(log n) o usar estructura de datos ordenada.

**Impacto:** Medio - Degradacion de performance con volumen  
**Esfuerzo:** 2-3 horas

---

## 2. Errores de Codigo Limpio

### 2.1 Uso Extensivo de Tipo any

**Archivos:** `rabbitmq.ts`, `handler.ts`, componentes varios

**Cantidad:** 12+ ocurrencias detectadas

```typescript
// ACTUAL
let connection: any = null;
let channel: any = null;
function handleMessage(data: any) { ... }
```

**Solucion:** Definir interfaces especificas.

```typescript
// PROPUESTO
import * as amqp from 'amqplib';
let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

interface ThreatMessage {
  eventId: string;
  type: ThreatType;
  severity: SeverityLevel;
  timestamp: string;
}
```

**Impacto:** Medio - Reduce type safety y dificulta refactorizacion  
**Esfuerzo:** 1-2 horas

---

### 2.2 Logica de Negocio en Controladores

**Archivo:** `backend/producer/src/controllers/auth.controller.ts`

**Problema:** El controlador contiene validacion de credenciales, generacion de tokens y manejo de refresh tokens. Deberia solo orquestar la peticion HTTP.

```typescript
// ACTUAL - Logica en controlador
router.post('/login', (req, res) => {
  if (username !== ADMIN_USER.username) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (password !== ADMIN_USER.password) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = jwt.sign({ username, role }, secret, { expiresIn: '8h' });
  res.json({ token });
});
```

**Solucion:** Extraer a AuthService.

```typescript
// PROPUESTO - Controlador delega a servicio
router.post('/login', async (req, res) => {
  const result = await authService.authenticate(req.body);
  res.status(result.status).json(result.data);
});
```

**Impacto:** Medio - Dificulta testing y reutilizacion  
**Esfuerzo:** 2-3 horas

---

### 2.3 Rate Limiting en Memoria Local

**Archivo:** `backend/producer/src/middlewares/bruteforce.middleware.ts`

**Problema:** El Map de intentos es local a cada instancia. Con multiples replicas, un atacante puede multiplicar sus intentos.

```typescript
// ACTUAL - Almacenamiento local
const loginAttempts = new Map<string, AttemptInfo>();
```

**Solucion:** Mover a Redis compartido.

**Impacto:** Alto en produccion con escalado horizontal  
**Esfuerzo:** 2-3 horas

---

## 3. Errores de Seguridad

### 3.1 Autenticacion sin Hashing

**Archivo:** `backend/producer/src/controllers/auth.controller.ts` linea 42

**Problema:** Comparacion directa de contrasenas en texto plano. El documento SECURITY_GUIDELINES.md especifica usar bcrypt, pero no esta implementado.

```typescript
// ACTUAL - Texto plano
if (password !== ADMIN_USER.password) { ... }
```

**Solucion:** Implementar bcrypt.

```typescript
// PROPUESTO
const isValid = await bcrypt.compare(password, user.passwordHash);
```

**Impacto:** Critico  
**Esfuerzo:** 1-2 horas

---

### 3.2 Enumeracion de Usuarios

**Archivo:** `backend/producer/src/controllers/auth.controller.ts`

**Problema:** Mensajes de error diferentes para usuario invalido vs contrasena invalida permiten enumerar usuarios existentes.

```typescript
// ACTUAL - Mensajes distintos
if (username !== ADMIN_USER.username) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
if (password !== ADMIN_USER.password) {
  return res.status(401).json({ error: 'Invalid password' });  // Diferente
}
```

**Solucion:** Unificar mensaje de error.

```typescript
// PROPUESTO - Mensaje unico
return res.status(401).json({ error: 'Invalid credentials' });
```

**Impacto:** Medio  
**Esfuerzo:** 15 minutos

---

### 3.3 Vulnerable a Timing Attacks

**Archivo:** `backend/producer/src/controllers/auth.controller.ts`

**Problema:** Respuesta inmediata en validacion permite medir tiempos y deducir existencia de usuarios.

**Solucion:** Usar comparacion de tiempo constante y delay artificial.

**Impacto:** Medio  
**Esfuerzo:** 1 hora

---

## 4. Problemas en Testing

### 4.1 Tests Dependientes de Variables de Entorno

**Archivos:** `backend/producer/src/__tests__/*.test.ts`

**Problema:** Los tests importan `config` que requiere variables de entorno reales. Resultado: 2/5 suites pasan sin configuracion.

**Solucion:** Mockear modulo de configuracion.

```typescript
jest.mock('../config/env', () => ({
  config: { jwtSecret: 'test-secret', port: 3000 }
}));
```

**Impacto:** Medio - Tests no ejecutables en CI limpio  
**Esfuerzo:** 1 hora

---

### 4.2 Sin Tests de Integracion Real

**Problema:** Todos los tests mockean `publishEvent`. No hay validacion de conexion real a RabbitMQ, formato de mensajes en cola, ni reconexion ante fallos.

**Solucion:** Agregar tests con Testcontainers.

**Impacto:** Medio  
**Esfuerzo:** 4-6 horas

---

## 5. Patron de Diseno

### Patron Actual: Transaction Script + Module Pattern

El codigo actual usa funciones que ejecutan transacciones completas con imports directos de dependencias. Simple pero con alto acoplamiento.

### Patron Recomendado: Arquitectura Hexagonal (Ports and Adapters)

Separar en tres capas:
- **Dominio:** Logica de negocio pura sin dependencias externas
- **Puertos:** Interfaces abstractas para infraestructura
- **Adaptadores:** Implementaciones concretas (RabbitMQ, Kafka, HTTP)

Beneficios:
- Cambiar broker de mensajeria sin tocar logica de negocio
- Tests de dominio sin mocks de infraestructura
- Clara separacion de responsabilidades

---

## 6. Persistencia de Usuarios - Migracion a PostgreSQL

### Problema Actual: Usuario Hardcodeado

**Archivo:** `backend/producer/src/controllers/auth.controller.ts`

El sistema tiene un unico usuario administrador definido en variables de entorno:

```typescript
const ADMIN_USER = {
  username: config.adminUsername,  // desde .env
  password: config.adminPassword,  // texto plano
  role: 'admin'
};
```

Esto presenta limitaciones criticas:
- No soporta multiples usuarios
- Sin historial de cambios de credenciales
- Sin bloqueo persistente de cuentas
- Contrasena en texto plano en memoria

### Base de Datos Recomendada: PostgreSQL

**Por que PostgreSQL y no MongoDB:**

| Factor | PostgreSQL | MongoDB |
|--------|------------|---------|
| Modelo de datos | Usuarios/roles son relacionales | Documentos sin relaciones claras |
| Consistencia | ACID nativo | Eventual consistency por defecto |
| Validacion | Constraints en schema | Validacion solo en aplicacion |
| Payloads flexibles | JSONB nativo | BSON nativo |
| Ecosistema Node.js | Prisma maduro | Mongoose tiene quirks conocidos |

**PostgreSQL con JSONB** permite almacenar tanto datos relacionales (usuarios, roles) como payloads de amenazas con estructura variable, todo en una sola base de datos con consistencia ACID.

### Estructura Propuesta

```sql
-- Usuarios con autenticacion segura
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'analyst',
  is_locked BOOLEAN DEFAULT FALSE,
  failed_attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Amenazas con payload flexible (JSONB)
CREATE TABLE threats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  source_ip INET NOT NULL,
  reported_by UUID REFERENCES users(id),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice GIN para busquedas dentro del payload
CREATE INDEX idx_threats_payload ON threats USING GIN (payload);
```

### Ventaja de JSONB para Payloads

Permite queries que combinan datos relacionales y documentos en un solo query:

```sql
SELECT 
  t.type,
  t.payload->>'attack_vector' as vector,
  u.username as reporter
FROM threats t
JOIN users u ON t.reported_by = u.id
WHERE t.severity = 'critical';
```

### Complejidad de Migracion

| Aspecto | Complejidad | Tiempo |
|---------|-------------|--------|
| Agregar servicio Docker | Baja | 30 min |
| Configurar Prisma + schema | Media | 1-2h |
| Crear UserRepository | Media | 2h |
| Refactorizar AuthController | Media | 2h |
| Script de seed admin | Baja | 30 min |
| Actualizar tests | Media | 1-2h |

**Tiempo total estimado:** 6-8 horas

**Impacto:** Alto - Resuelve problemas de seguridad y escalabilidad  
**Prioridad:** P1

---

## 7. Matriz de Priorizacion

| Item | Severidad | Esfuerzo | Prioridad |
|------|-----------|----------|-----------|
| BruteForceMiddleware sin DI | Critica | 15min | P0 |
| Usuario hardcodeado con texto plano | Critica | 6-8h | P0 |
| Autenticacion sin hashing | Critica | 1-2h | P0 |
| Publisher sin confirmacion | Critica | 1-2h | P0 |
| Enumeracion de usuarios | Media | 15min | P0 |
| Estructura NO Hexagonal | Alta | 8-10h | P1 |
| Estado global RabbitMQ | Alta | 2-3h | P1 |
| Inversion de dependencias | Alta | 4-6h | P1 |
| Rate limiting a Redis | Alta | 2-3h | P1 |
| Migracion a PostgreSQL | Alta | 6-8h | P1 |
| Tipos any | Media | 1-2h | P2 |
| Logica en controladores | Media | 2-3h | P2 |
| Tests independientes de env | Media | 1h | P2 |
| ThreatStore O(n log n) | Media | 2-3h | P3 |
| Tests de integracion | Media | 4-6h | P3 |

---
9-13 horas
  - BruteForceMiddleware sin DI: 15 min
  - Usuario hardcodeado: 6-8h
  - Auth sin hashing: 1-2h  
  - Publisher sin confirmación: 1-2h
  - Enumeración de usuarios: 15 min
  
- **P1 (Deuda critica):** 22-31 horas
  - Estructura NO Hexagonal: 8-10h
  - Estado global RabbitMQ: 2-3h
  - Inversión de dependencias: 4-6h
  - Rate limiting a Redis: 2-3h
  - Migración a PostgreSQL: 6-8h
  
- **P2 (Mejoras importantes):** 4-6 horas
- **P3 (Nice to have):** 6-9 horas

**Total:** 41-5 importantes):** 4-6 horas
- **P3 (Nice to have):** 6-9 horas

**Total:** 26-39 horas de trabajo para resolver deuda tecnica completa


---

## 9. Análisis del Worker - Deuda Técnica Crítica 

### Estado Actual
**Cobertura de Tests:** 0% (vs 85%+ del Producer)  
**Calificación:** 2/5 - Funcional en desarrollo, NO listo para producción

### 9.1 Errores de Arquitectura - Worker

#### 9.1.1 NACK sin Requeue - Pérdida de Mensajes Críticos

**Archivo:** `backend/worker/src/rabbitmq.ts` línea 29

**Problema:** Cuando falla el procesamiento de un mensaje, se descarta permanentemente sin reintento ni Dead Letter Exchange.

```typescript
// ACTUAL - Mensaje se pierde
await ch.consume(q.queue, async (msg) => {
  try {
    await onMessage(data, msg.fields.routingKey, msg);
    ch.ack(msg);
  } catch (err) {
    ch.nack(msg, false, false); // ❌ NO requeue, NO DLX
  }
});