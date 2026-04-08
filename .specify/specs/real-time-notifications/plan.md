# Plan: Real-Time Notifications
**Feature ID:** `real-time-notifications`
**Spec:** `.specify/specs/real-time-notifications/spec.md`
**Versión:** 1.0.0
**Fecha:** 06 Abr 2026

---

## 1. Estado Actual — Arqueología de Código

### ✅ YA IMPLEMENTADO (no tocar)

| Componente | Archivo | Estado |
|------------|---------|--------|
| Worker RabbitMQ consumer + ACK manual | `backend/worker/src/rabbitmq.ts` | ✅ ACK después de `saveToRedis` + `broadcast` |
| Worker Redis persistence | `backend/worker/src/redis.ts` | ✅ `saveToRedis`, `getHistoryFromRedis`, `clearHistoryFromRedis`, `removeHistoryItemById` |
| Worker WebSocket server + broadcast | `backend/worker/src/websocket.ts` | ✅ Incluye envío de historial al conectar, comandos `clear-all` / `delete-one` |
| Worker sanitización XSS | `backend/worker/src/handler.ts` | ✅ `sanitizeString()` escapa `< > " ' &` |
| `WebSocketRepository` (port) | `src/core/domain/ports/websocket.repository.ts` | ✅ `connect`, `disconnect`, `sendCommand`, `getMessages$`, `isConnected` |
| `WebSocketRepositoryImpl` base | `src/core/infrastructure/services/websocket-repository.impl.ts` | ✅ Connect, disconnect, deduplicación, localStorage, `addMessage`, `sendCommand` |
| Integración login/logout con WS | `src/core/infrastructure/services/auth.service.ts` | ✅ Connect on login, disconnect on logout |
| `AlertsComponent` UI base | `src/presentation/components/alerts/` | ✅ Filtrado, paginación, exportación, colores por severidad, botones de gestión por rol |
| Tests existentes `wsRepo.impl.spec.ts` | 574 líneas | ✅ Connect, disconnect, deduplicación, storage, sendCommand |

### ❌ GAPS — Lo que falta implementar

| ID | Gap | Archivo afectado |
|----|-----|-----------------|
| GAP-01 | `scheduleReconnect()` usa `setInterval(2000)` fijo — NO es backoff exponencial (`min(1000×2^n, 30000)`, máx 5 reintentos) | `websocket-repository.impl.ts` |
| GAP-02 | Estado de conexión solo `CONNECTED`/`DISCONNECTED` — falta `CONNECTING` y `ERROR` | `websocket-repository.impl.ts` + `alerts.component.ts` + `alerts.component.html` |
| GAP-03 | Sin test para boundary de 200 mensajes | `websocket-repository.impl.spec.ts` |
| GAP-04 | Sin test para algoritmo de backoff exponencial | `websocket-repository.impl.spec.ts` (nuevo) |

---

## 2. Decisiones de Diseño

### 2.1 Backoff exponencial (GAP-01)

**Decisión:** Reemplazar `setInterval` por `setTimeout` con contador de intentos.
**Algoritmo:** `min(1000 × 2^attempt, 30000)ms`, máximo 5 reintentos, luego detener.

```typescript
// ANTES (fijo, infinito)
private reconnectInterval: ReturnType<typeof setInterval> | null = null;
this.reconnectInterval = setInterval(() => this.connect(), 2000);

// DESPUÉS (exponencial, con límite)
private reconnectAttempt = 0;
private readonly MAX_RECONNECT_ATTEMPTS = 5;
private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

protected scheduleReconnect(): void {
  if (this.reconnectAttempt >= this.MAX_RECONNECT_ATTEMPTS) {
    this.connectionStatus$.next('ERROR');
    return;
  }
  const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30000);
  this.reconnectAttempt++;
  this.connectionStatus$.next('CONNECTING');
  this.reconnectTimeout = setTimeout(() => this.connect(), delay);
}

protected clearReconnect(): void {
  if (this.reconnectTimeout) {
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }
  this.reconnectAttempt = 0;           // reset en conexión exitosa
}
```

**Impacto en `connect()`:**
- `onopen` → llama `this.clearReconnect()` + `this.connectionStatus$.next('CONNECTED')`
- `onclose` → llama `this.scheduleReconnect()`
- `onerror` → (solo log, `onclose` se dispara automáticamente tras `onerror`)

**Impacto en `disconnect()`:** llama `this.clearReconnect()` + `this.connectionStatus$.next('DISCONNECTED')`

---

### 2.2 Estado de conexión (GAP-02)

**Decisión:** Añadir `connectionStatus$: BehaviorSubject<ConnectionStatus>` al repositorio.
**Motivo:** `isConnected()` es síncrono y no permite que la UI reaccione reactivamente a CONNECTING/ERROR.
**Cambios mínimos:** No rompe el contrato del port `WebSocketRepository` — se añade en la implementación, no en el puerto abstracto.

```typescript
// En websocket-repository.impl.ts
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';

connectionStatus$ = new BehaviorSubject<ConnectionStatus>('DISCONNECTED');
```

```typescript
// En alerts.component.ts — reemplaza `connected: boolean`
connectionStatus: ConnectionStatus = 'DISCONNECTED';

ngOnInit(): void {
  // ...existing messages$ subscription...
  this.wsService.getConnectionStatus$().subscribe(status => {
    this.connectionStatus = status;
    this.cdr.detectChanges();
  });
}
```

```typescript
// En websocket.service.ts — añadir método fachada
getConnectionStatus$(): Observable<ConnectionStatus> {
  return this.wsRepository.getConnectionStatus$();
}
```

```typescript
// En websocket.repository.ts — añadir al puerto abstracto
abstract getConnectionStatus$(): Observable<ConnectionStatus>;
```

```html
<!-- En alerts.component.html — reemplaza el span binario -->
<span class="connection-status" [class]="'status-' + connectionStatus.toLowerCase()">
  {{ statusLabel[connectionStatus] }}
</span>
```

**Labels:**
- `CONNECTED` → `● Conectado`
- `DISCONNECTED` → `○ Desconectado`
- `CONNECTING` → `◌ Reconectando...`
- `ERROR` → `✕ Sin conexión`

---

### 2.3 Tests de boundary (GAP-03) y backoff (GAP-04)

Se añaden al archivo existente `websocket-repository.impl.spec.ts`:

**GAP-03 — boundary 200:**
```typescript
it('should cap messages at MAX_MESSAGES (200)', async () => {
  for (let i = 0; i < 201; i++) {
    repository.testAddMessage({ eventId: `evt-${i}`, timestamp: i,
      data: { threatId: `t-${i}`, type: 'malware', severity: 'low',
              sourceIp: '1.2.3.4', description: 'x' } });
  }
  const messages = await firstValueFrom(repository.getMessages$());
  expect(messages).toHaveLength(200);       // nunca supera 200
  expect(messages[0].eventId).toBe('evt-200'); // el más reciente arriba
});
```

**GAP-04 — backoff exponencial:**
```typescript
it('should use exponential backoff: attempt 0 → 1000ms, attempt 1 → 2000ms, attempt 2 → 4000ms', () => {
  repository.connect();
  mockWs.simulateOpen();

  // 3 cierres consecutivos
  mockWs.simulateClose();                   // attempt 0 → delay 1000ms
  vi.advanceTimersByTime(1000);
  newMockWs.simulateClose();                // attempt 1 → delay 2000ms
  vi.advanceTimersByTime(2000);
  newMockWs.simulateClose();                // attempt 2 → delay 4000ms
  vi.advanceTimersByTime(4000);

  expect(wsFactory).toHaveBeenCalledTimes(4); // 1 inicial + 3 reintentos
});

it('should stop reconnecting after MAX_RECONNECT_ATTEMPTS (5)', () => {
  repository.connect();
  mockWs.simulateOpen();

  for (let i = 0; i < 6; i++) {
    mockWs.simulateClose();
    vi.advanceTimersByTime(30000); // skip cualquier delay
  }

  expect(wsFactory).toHaveBeenCalledTimes(1 + 5); // 1 inicial + 5 reintentos max
});

it('should emit ERROR status after max attempts', () => {
  const statuses: ConnectionStatus[] = [];
  repository.connectionStatus$.subscribe(s => statuses.push(s));

  repository.connect();
  for (let i = 0; i < 5; i++) {
    mockWs.simulateClose();
    vi.advanceTimersByTime(30000);
  }

  expect(statuses.at(-1)).toBe('ERROR');
});
```

---

## 3. Contratos de API — Sin cambios

El Worker y sus endpoints están completos. Solo cambia la capa de presentación del frontend.

---

## 4. Archivos a MODIFICAR

| Archivo | Cambio |
|---------|--------|
| `src/core/domain/ports/websocket.repository.ts` | + `getConnectionStatus$()` abstract method + export `ConnectionStatus` type |
| `src/core/infrastructure/services/websocket-repository.impl.ts` | + `connectionStatus$` BehaviorSubject + backoff exponencial en `scheduleReconnect()` + limpieza con `clearReconnect()` |
| `src/core/infrastructure/services/websocket.service.ts` | + `getConnectionStatus$()` facade method |
| `src/presentation/components/alerts/alerts.component.ts` | `connected: boolean` → `connectionStatus: ConnectionStatus` + suscripción a `connectionStatus$` |
| `src/presentation/components/alerts/alerts.component.html` | Indicador de estado de 4 estados |
| `src/core/infrastructure/services/__tests__/websocket-repository.impl.spec.ts` | + test boundary 200 + tests backoff exponencial |

## 5. Archivos a NO MODIFICAR

- `backend/worker/src/*` — Worker completo ✅
- `backend/producer/src/*` — No afectado
- `src/core/domain/models/alert-message.model.ts` — Modelo correcto ✅
- `src/core/domain/models/websocket-command.model.ts` — Correcto ✅
- `src/presentation/components/alerts/alerts.component.css` — Solo añadir clases CSS de status ✅
- Tests de integración existentes — No romper ✅

---

## 6. Estimación

| Gap | Tarea | Estimación |
|-----|-------|-----------|
| GAP-03 | [RED] Test boundary 200 mensajes | 15 min |
| GAP-04 | [RED] Tests backoff exponencial (3 tests) | 20 min |
| GAP-01 | [GREEN] Refactor `scheduleReconnect()` → exponencial | 30 min |
| GAP-02a | [GREEN] Añadir `connectionStatus$` al repositorio + port | 20 min |
| GAP-02b | [GREEN] Actualizar `WebSocketService` fachada | 10 min |
| GAP-02c | [GREEN] Actualizar `AlertsComponent` ts + html | 20 min |
| — | Verificación: `npx vitest run` suite completa | 10 min |
| **Total** | | **~2h** |
