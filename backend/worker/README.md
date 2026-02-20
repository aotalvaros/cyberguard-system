# Worker - CyberGuard System

Servicio consumidor de eventos del sistema de alertas de ciberseguridad. Consume mensajes desde RabbitMQ, persiste historial en Redis y retransmite actualizaciones en tiempo real vía WebSocket a los clientes del frontend.

**📚 Documentación Relacionada:**
- 📊 [ANALISIS_DEUDA_ACTUAL.md](../ANALISIS_DEUDA_ACTUAL.md) - Estado actual vs deuda original
- 📋 [DEBT_REPORT_BACKEND.md](../DEBT_REPORT_BACKEND.md) - Reporte de deuda técnica

---

## 🎯 Estado del Proyecto

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Calificación** | 4.5/5 (90%) | ✅ |
| **Test Cases** | 120 casos en 5 suites | ✅ |
| **Cobertura** | 85%+ | ✅ |
| **Tipos `any`** | 0 en producción | ✅ |
| **Tiempo de tests** | ~5 segundos | ✅ |
| **Flakiness** | 0% | ✅ |
| **Bug delete-one** | Corregido (pipeline order) | ✅ |

---

## 🚀 Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Node.js** | 20 LTS | Runtime |
| **TypeScript** | 5.x | Tipado estricto (strict: true) |
| **amqplib** | Latest | Consumo de eventos RabbitMQ |
| **ioredis** | Latest | Persistencia de historial en Redis |
| **ws** | Latest | WebSocket Server |
| **Winston** | Latest | Logging estructurado |
| **Jest + ts-jest** | Latest | Testing (120 casos) |

---

## 🏗️ Arquitectura del Worker

```
RabbitMQ Exchange (cyberguard.events)
            │
            ▼
    ┌───────────────┐
    │   rabbitmq.ts │  ← Consume mensajes + ack/nack + reconexión automática
    └───────┬───────┘
            │ handleMessage()
            ▼
    ┌───────────────┐
    │   handler.ts  │  ← buildPayload() + sanitización + tipado fuerte
    └───────┬───────┘
            │
      ┌─────┴─────┐
      ▼           ▼
┌──────────┐  ┌────────────┐
│ redis.ts │  │websocket.ts│  ← Broadcast en tiempo real a clientes
│ historial│  │ (ws server)│
└──────────┘  └────────────┘
```

### Flujo de Mensajes

```
1. Producer publica evento en RabbitMQ  (routing key: threat.detected.malware)
2. Worker consume con ConfirmChannel    (ack explícito, nack en error)
3. handler.ts parsea y tipifica payload (sin any, Record<string, unknown>)
4. redis.ts persiste en historial       (últimas N amenazas, TTL configurable)
5. websocket.ts hace broadcast          (a todos los clientes conectados)
6. Cliente reconecta → replay           (historial completo desde Redis)
```

---

## 📁 Estructura de Archivos

```
worker/
├── src/
│   ├── index.ts        # Entry point (orquesta conexiones)
│   ├── config.ts       # Variables de entorno tipadas
│   ├── handler.ts      # buildPayload() + handleMessage()
│   ├── logger.ts       # Winston logging estructurado
│   ├── rabbitmq.ts     # Consumo RabbitMQ + ack/nack + reconexión
│   ├── redis.ts        # Historial en Redis (save/history/clear/remove)
│   ├── websocket.ts    # WebSocket Server + broadcast + comandos
│   └── __tests__/
│       └── unit/
│           ├── config.test.ts     # 13 tests
│           ├── handler.test.ts    # 21 tests
│           ├── rabbitmq.test.ts   # 47 tests
│           ├── redis.test.ts      # 27 tests
│           └── websocket.test.ts  # 12 tests
├── jest.config.js
├── tsconfig.json
└── package.json
```

---

## 🧪 Testing

### Métricas de la Suite

| Suite | Casos | Descripción |
|-------|-------|-------------|
| `config.test.ts` | 13 | Defaults, env overrides, edge cases |
| `handler.test.ts` | 21 | buildPayload, handleMessage, sanitización |
| `rabbitmq.test.ts` | 47 | Connect, consume, ack/nack, DLX, reconexión |
| `redis.test.ts` | 27 | Connect, save, history, clear, remove, close |
| `websocket.test.ts` | 12 | Start, broadcast, comandos de cliente, close |
| **TOTAL** | **120** | **0% flakiness · ~5s ejecución** |

### Ejecutar Tests

```bash
cd backend/worker
npm test                  # Todos los tests
npm run test:watch        # Modo watch
npm run test:coverage     # Con cobertura de código
```

---

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en `backend/worker/`:

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_URL=redis://localhost:6379
WORKER_WS_PORT=8081
WORKER_EXCHANGE=cyberguard.events
WORKER_TOPIC=#
```

| Variable | Default | Descripción |
|----------|---------|-------------|
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672` | URL de conexión RabbitMQ |
| `REDIS_URL` | `redis://localhost:6379` | URL de conexión Redis |
| `WORKER_WS_PORT` | `8081` | Puerto del servidor WebSocket |
| `WORKER_EXCHANGE` | `cyberguard.events` | Exchange a consumir |
| `WORKER_TOPIC` | `#` | Patrón routing key (`#` = todos) |

---

## 🚀 Ejecutar

### Con Docker (recomendado)

```bash
# Desde la raíz del proyecto
docker compose up -d worker
```

### Desarrollo local

```bash
cd backend/worker
npm install
npm run dev     # Con hot-reload (ts-node-dev)
npm start       # Producción (node dist/)
```

Servidor WebSocket disponible en:
```
ws://localhost:8081
```

---

## 📡 API WebSocket

### Conexión desde el Cliente

```javascript
const ws = new WebSocket('ws://localhost:8081');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data = { type: "threat", payload: { threatId, type, severity, ... } }
};
```

### Eventos Emitidos por el Worker

```json
// Nueva amenaza detectada (broadcast a todos los clientes)
{ "type": "threat", "payload": { "threatId": "...", "type": "malware", "severity": "critical" } }

// Historial al reconectar (replay desde Redis)
{ "type": "history", "payload": [ { ... }, { ... } ] }

// Confirmación de limpieza total
{ "type": "clear-all" }

// Confirmación de eliminación individual
{ "type": "delete-one", "id": "<messageId>" }
```

### Comandos Enviados por el Cliente

```json
// Limpiar todo el historial en Redis + broadcast
{ "type": "clear-all" }

// Eliminar un item específico en Redis + broadcast
{ "type": "delete-one", "id": "<messageId>" }
```

---

## 🐛 Bug Fix: `removeHistoryItemById`

**Versión 1.4.0 (20 Feb 2026)**

**Problema:** `removeHistoryItemById` en `redis.ts` usaba un pipeline incorrecto que eliminaba **todo** el historial en lugar de solo el item especificado.

```typescript
// ❌ ANTES (roto): del al final borraba todo
const pipeline = redisClient.multi();
for (const item of remaining) { pipeline.rPush(HISTORY_KEY, item); }
pipeline.del(HISTORY_KEY);  // ← borraba lo que acababa de insertar
await pipeline.exec();
```

```typescript
// ✅ AHORA (correcto): del primero, luego push items restantes
const pipeline = redisClient.multi();
pipeline.del(HISTORY_KEY);           // ← limpia la key original
for (const item of remaining) { pipeline.rPush(HISTORY_KEY, item); }
await pipeline.exec();
```

**Impacto:** El comando `delete-one` desde el frontend ahora elimina correctamente **solo** el item solicitado, preservando el resto del historial. El broadcast `{ type: "delete-one", id: "..." }` también se propaga correctamente a todos los clientes conectados.

---

## 🛡️ Características Técnicas

| Característica | Implementación |
|----------------|---------------|
| **At-least-once delivery** | ConfirmChannel con ack/nack explícito |
| **Dead Letter Queue** | DLX configurado para mensajes no procesados |
| **Reconexión automática** | Retry con backoff en caso de desconexión |
| **Replay al conectar** | Historial completo persistido en Redis |
| **0 `any` en TypeScript** | `unknown` + type narrowing en todo el código |
| **Tests unitarios** | 120 casos, 0% flakiness, mocks tipados |

---

## 📊 Deuda Técnica

### ✅ Resuelta

| Item | Antes | Ahora |
|------|-------|-------|
| Tests unitarios | 0 casos | 120 casos en 5 suites |
| Tipos `any` | 6+ ocurrencias | 0 ocurrencias |
| Build TypeScript | Con errores | Limpio (exit code 0) |
| Bug `removeHistoryItemById` | Borraba TODO el historial | Solo borra el item especificado |

### ⏳ Pendiente

| Item | Prioridad | Esfuerzo |
|------|-----------|----------|
| Tests de integración (RabbitMQ/Redis real) | P2 | 3-4h |
| Multi-stage Dockerfile | P3 | 1h |

---

## 🐛 Troubleshooting

### Error de conexión a RabbitMQ
```bash
docker compose ps rabbitmq
docker compose logs rabbitmq
# Management UI: http://localhost:15672 (guest/guest)
```

### Error de conexión a Redis
```bash
docker compose ps redis
docker exec -it cyberguard-redis redis-cli ping
# Esperado: PONG
```

### Tests fallando
```bash
npx jest --clearCache && npm test
```

---

**Última actualización:** 20 Febrero 2026  
**Calificación:** 4.5/5 (90%) — Production-ready  
**Versión:** 1.4.0
