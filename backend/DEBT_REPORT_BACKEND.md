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

### 1.1 Estado Global Mutable en RabbitMQ

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

### 1.2 Publisher sin Confirmacion (Fire and Forget)

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

### 1.3 Acoplamiento Directo a Infraestructura

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

### 1.4 ThreatStore con Complejidad O(n log n) en Cada Lectura

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
| Autenticacion sin hashing | Critica | 1-2h | P0 |
| Publisher sin confirmacion | Critica | 1-2h | P0 |
| Enumeracion de usuarios | Media | 15min | P0 |
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

## 8. Estimacion Total

- **P0 (Blocker produccion):** 2-4 horas
- **P1 (Deuda critica):** 14-20 horas
- **P2 (Mejoras importantes):** 4-6 horas
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