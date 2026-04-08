# Spec: Real-Time Notifications
**Feature ID:** `real-time-notifications`
**Epic:** EP-02 — Notificaciones en tiempo real del sistema
**Versión:** 1.0.0
**Fecha:** 06 Abr 2026
**Estimación:** M
**Estado:** `ready`

---

## 1. Contexto

Cuando el administrador reporta una amenaza (o el sistema la detecta), el mensaje
recorre la cadena **Backend → RabbitMQ → Worker → WebSocket → Dashboard** y debe
aparecer en el panel de alertas del frontend **sin recargar la página**.

La infraestructura base existe (Worker + AlertsComponent + WebSocketRepository)
pero carece de spec formal con criterios de aceptación verificables. Este documento
formaliza los requisitos funcionales y no funcionales del canal de notificaciones
en tiempo real, y define los gaps que requieren implementación adicional.

### Cadena de datos

```
POST /api/threats (JWT)
  └─ BackendProducer → RabbitMQ (exchange: cyberguard.events)
       └─ Worker (consumer) → Redis (historial) → WebSocket :8081
            └─ WebSocketRepositoryImpl (Angular) → BehaviorSubject
                 └─ AlertsComponent → UI en tiempo real
```

---

## 2. Historias de Usuario

| ID | Historia | Estimación |
|----|----------|-----------|
| HU-03 | Como administrador quiero recibir notificaciones automáticas en el dashboard cuando se registre una nueva amenaza, para actuar rápidamente y priorizar mi respuesta según el nivel de riesgo. | M |

---

## 3. Requerimientos Funcionales

### 3.1 Worker (Backend)

| ID | Capa | Requerimiento |
|----|------|---------------|
| R-WK-01 | Infrastructure | El Worker SHALL consumir mensajes de RabbitMQ desde `cyberguard.events` con acknowledgment manual. |
| R-WK-02 | Infrastructure | El Worker SHALL persistir cada evento en Redis con TTL configurable antes de hacer broadcast. |
| R-WK-03 | Infrastructure | El Worker SHALL hacer broadcast a TODOS los clientes WebSocket conectados via `broadcast()`. |
| R-WK-04 | Infrastructure | El payload broadcast SHALL incluir: `eventId`, `routingKey`, `data.threatId`, `data.type`, `data.severity`, `data.sourceIp`, `data.description`, `receivedAt`. |
| R-WK-05 | Infrastructure | El Worker SHALL sanitizar strings de entrada (escape de `< > " ' &`) antes de procesar. |
| R-WK-06 | Infrastructure | El WebSocket server SHALL operar en el puerto configurado (default: `8081`). |

### 3.2 Frontend — Recepción y Visualización

| ID | Capa | Requerimiento |
|----|------|---------------|
| R-FE-01 | Infrastructure | `WebSocketRepositoryImpl` SHALL conectarse automáticamente al login del administrador. |
| R-FE-02 | Infrastructure | `WebSocketRepositoryImpl` SHALL desconectarse al hacer logout. |
| R-FE-03 | Infrastructure | `WebSocketRepositoryImpl` SHALL implementar reconexión con backoff exponencial: `min(1000 × 2^n, 30000)ms`, máximo 5 reintentos. |
| R-FE-04 | Infrastructure | Las alertas SHALL deduplicarse por `eventId` — un mismo evento no puede aparecer dos veces. |
| R-FE-05 | Infrastructure | Las alertas SHALL persistir en `localStorage` con clave `cg_ws_history`, máximo 200 mensajes. |
| R-FE-06 | Infrastructure | `WebSocketRepositoryImpl` SHALL restaurar el historial de `localStorage` al reconectar. |
| R-FE-07 | Presentation | `AlertsComponent` SHALL mostrar el estado de conexión visible: `CONNECTED` \| `DISCONNECTED` \| `CONNECTING` \| `ERROR`. |
| R-FE-08 | Presentation | Cada alerta SHALL mostrar: categoría (type), severidad, IP de origen, descripción y timestamp formateado. |
| R-FE-09 | Presentation | Las alertas SHALL codificarse con color según severidad: `critical`=rojo, `high`=naranja, `medium`=amarillo, `low`=verde. |
| R-FE-10 | Presentation | `AlertsComponent` SHALL soportar filtrado por término de búsqueda, tipo y severidad. |
| R-FE-11 | Presentation | `AlertsComponent` SHALL soportar paginación con `pageSize = 10`. |

### 3.3 Frontend — Gestión de Alertas

| ID | Capa | Requerimiento |
|----|------|---------------|
| R-FE-12 | Presentation | Solo el administrador SHALL ver los botones "Eliminar" y "Limpiar todo". |
| R-FE-13 | Application | `DELETE /api/threats/:id` SHALL invocarse al eliminar una alerta individual (persiste la eliminación en backend). |
| R-FE-14 | Infrastructure | El comando `clear-all` SHALL enviarse al Worker vía WebSocket para sincronizar Redis. |
| R-FE-15 | Application | El historial de `localStorage` SHALL sincronizarse con las operaciones de eliminación. |

---

## 4. Requerimientos No Funcionales

| ID | Requerimiento |
|----|---------------|
| R-NF-01 | La latencia WebSocket end-to-end (amenaza reportada → alerta visible) SHALL ser ≤ 50ms (per §7.2 constitución). |
| R-NF-02 | La reconexión con backoff exponencial SHALL respetar el patrón `min(1000 × 2^n, 30000)ms`. |
| R-NF-03 | El historial SHALL estar limitado a 200 mensajes en `localStorage` y en Redis. |
| R-NF-04 | El Worker SHALL ejecutar el ACK de RabbitMQ SOLO tras persistencia exitosa en Redis y broadcast completado. |
| R-NF-05 | La cobertura de tests SHALL ser ≥ 90% en `WebSocketRepositoryImpl` y `AlertsComponent`. |

---

## 5. Escenarios BDD

### Feature: Notificaciones en tiempo real (HU-03)

```gherkin
Scenario: Administrador recibe alerta al instante tras reporte de amenaza
  Given un administrador autenticado con el dashboard abierto
  And el estado de conexión WebSocket muestra "CONNECTED"
  When se reporta una amenaza de tipo "malware" con severidad "high"
  Then el dashboard muestra una nueva alerta en menos de 50ms
  And la alerta incluye la categoría "malware", la severidad "high" y la IP de origen
  And la alerta aparece con fondo naranja (color "high")

Scenario: Alerta no se duplica si el mismo evento llega dos veces
  Given una alerta con eventId "evt-001" ya visible en el dashboard
  When el WebSocket recibe de nuevo el mismo evento "evt-001"
  Then el dashboard sigue mostrando solo UNA alerta con ese eventId

Scenario: Historial persiste tras cerrar y reabrir el navegador
  Given un administrador con 15 alertas en el dashboard
  When cierra el navegador y vuelve a autenticarse
  Then el dashboard restaura las 15 alertas desde localStorage

Scenario: Reconexión automática al perder conexión WebSocket
  Given el WebSocket está conectado
  When el servidor WebSocket se cae o la red falla
  Then el indicador de estado cambia a "CONNECTING"
  And el sistema reintenta la conexión con backoff exponencial
  And al reconectarse el indicador cambia a "CONNECTED"

Scenario: Límite de 200 mensajes en historial
  Given el historial contiene 200 alertas
  When llega una nueva alerta
  Then el historial mantiene 200 mensajes (descarta el más antiguo)
  And localStorage no supera el límite definido

Scenario: Solo el administrador ve controles de gestión
  Given un usuario con rol "viewer" autenticado
  When navega al dashboard con alertas visibles
  Then NO ve el botón "Eliminar" en ninguna alerta
  And NO ve el botón "Limpiar todo"

Scenario: Eliminar alerta individual sincroniza con backend
  Given una alerta con threatId "threat-abc" visible en el dashboard
  When el administrador hace clic en "Eliminar"
  Then se invoca DELETE /api/threats/threat-abc
  And la alerta desaparece del dashboard
  And se encola el comando delete-one al Worker vía WebSocket

Scenario: Limpiar todo sincroniza con Redis vía WebSocket
  Given el dashboard tiene alertas visibles
  When el administrador hace clic en "Limpiar todo"
  Then se envía el comando clear-all al Worker vía WebSocket
  And el historial de localStorage queda vacío
  And el dashboard queda sin alertas
```

---

## 6. Estado Actual — Gap Analysis

| Componente | Estado | Nota |
|------------|--------|------|
| Worker: consume RabbitMQ + broadcast WS | ✅ Implementado | `index.ts`, `rabbitmq.ts`, `websocket.ts` |
| Worker: persistencia Redis | ✅ Implementado | `redis.ts`, `saveToRedis()` |
| Worker: sanitización XSS | ✅ Implementado | `handler.ts`, `sanitizeString()` |
| `WebSocketRepository` (port FE) | ✅ Implementado | `websocket.repository.ts` |
| `WebSocketRepositoryImpl` con reconnect | ✅ Implementado | backoff exponencial |
| `WebSocketService` Facade | ✅ Implementado | `websocket.service.ts` |
| `AlertsComponent` UI completo | ✅ Implementado | filtrado, paginación, colores |
| Deduplicación por `eventId` | ✅ Implementado | `WebSocketRepositoryImpl` |
| `localStorage` max 200 | ✅ Implementado | `LIMITS.MAX_WS_MESSAGES` |
| Indicador de estado de conexión | ⚠️ Parcial | `isConnected()` existe; verificar si UI muestra CONNECTING / ERROR |
| Test de reconexión con backoff | ⚠️ Sin test formal | falta test unitario del algoritmo |
| Test de límite 200 mensajes | ⚠️ Sin test formal | falta test de boundary |
| ACK RabbitMQ post-Redis | ⚠️ Verificar | confirmar que ACK es posterior al `saveToRedis()` |

---

## 7. Contratos de Mensajes

### Servidor → Cliente (broadcast)
```typescript
interface WebSocketAlertDto {
  eventId:    string;         // UUID único del evento
  routingKey: string;         // ej: "threat.reported"
  receivedAt: string;         // ISO 8601
  data: {
    threatId:    string;
    type:        string;      // malware | phishing | ddos | intrusion | ransomware
    severity:    string;      // low | medium | high | critical
    sourceIp:    string;      // IPv4
    description: string;
  };
}
```

### Cliente → Servidor (comandos)
```typescript
{ type: "clear-all" }
{ type: "delete-one", id: string }
```
