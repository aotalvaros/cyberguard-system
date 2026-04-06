# Tasks: Real-Time Notifications
**Feature ID:** `real-time-notifications`
**Plan:** `.specify/specs/real-time-notifications/plan.md`
**Versión:** 1.0.0
**Fecha:** 06 Abr 2026
**Estimación total:** ~2h

> **Convención:**
> - `[ ]` tarea pendiente · `[x]` completada
> - `[P]` puede ejecutarse en paralelo con otras `[P]` del mismo grupo
> - Orden TDD obligatorio: RED → GREEN → REFACTOR
> - Rama: `feature/ep-02/real-time-notifications`

---

## Resumen

| ID | Tarea | Capa | Estimación |
|----|-------|------|-----------|
| TASK-01 | [RED] Test boundary 200 mensajes | Infrastructure | 15 min |
| TASK-02 | [RED] Tests backoff exponencial (3 tests) | Infrastructure | 20 min |
| TASK-03 | [GREEN] Refactor `scheduleReconnect()` → backoff exponencial | Infrastructure | 30 min |
| TASK-04 | [GREEN] Añadir `ConnectionStatus` al port + `connectionStatus$` al impl | Domain + Infrastructure | 20 min |
| TASK-05 | [GREEN] Actualizar `WebSocketService` fachada | Infrastructure | 10 min |
| TASK-06 | [GREEN] Actualizar `AlertsComponent` ts + html (4 estados) | Presentation | 20 min |
| TASK-07 | Verificación suite completa `npx vitest run` | — | 5 min |

---

## FASE 1 — Tests RED

### TASK-01 · [RED] Test boundary 200 mensajes
**Capa:** Infrastructure · **Estimación:** 15 min
**Rama:** `feature/ep-02/real-time-notifications/task-01`
**Archivo:** `src/core/infrastructure/services/__tests__/websocket-repository.impl.spec.ts`

- [ ] Añadir dentro del `describe('addMessage')` existente:
  ```typescript
  it('should cap messages at MAX_MESSAGES (200)', async () => {
    for (let i = 0; i < 201; i++) {
      repository.testAddMessage({
        eventId: `evt-${i}`,
        timestamp: i,
        data: { threatId: `t-${i}`, type: 'malware', severity: 'low',
                sourceIp: '1.2.3.4', description: 'x' },
      });
    }
    const messages = await firstValueFrom(repository.getMessages$());
    expect(messages).toHaveLength(200);
    expect(messages[0].eventId).toBe('evt-200'); // más reciente al frente
  });
  ```
- [ ] Confirmar que el test PASA (la lógica de `.slice(0, MAX_MESSAGES)` ya existe en `addMessage()`)

> **Nota:** Este test es GREEN de inmediato — su valor es documentar el comportamiento
> y prevenir regresiones si alguien modifica `addMessage()` en el futuro.

**Verificación:** `npx vitest run --reporter=verbose websocket-repository.impl` → nuevo test PASS.

---

### TASK-02 · [RED] Tests backoff exponencial
**Capa:** Infrastructure · **Estimación:** 20 min
**Rama:** `feature/ep-02/real-time-notifications/task-02`
**Archivo:** `src/core/infrastructure/services/__tests__/websocket-repository.impl.spec.ts`

- [ ] Añadir nuevo `describe('exponential backoff reconnect')` después del `describe('scheduleReconnect')` existente:

  **Test 1 — delays crecientes:**
  ```typescript
  it('attempt 0→1000ms, attempt 1→2000ms, attempt 2→4000ms', () => {
    let callCount = 0;
    const trackingFactory: WebSocketFactory = vi.fn((url) => {
      callCount++;
      const ws = new MockWebSocket(url);
      setTimeout(() => ws.simulateOpen(), 0);
      return ws as unknown as WebSocket;
    });
    const repo = new TestableWebSocketRepository(trackingFactory, mockStorage);

    repo.connect();
    vi.advanceTimersByTime(0); // trigger onopen del primer WS

    // cierre 1 → intento 0, delay 1000ms
    (trackingFactory as ReturnType<typeof vi.fn>).mock.results
      .at(-1)?.value?.simulateClose();
    vi.advanceTimersByTime(999);
    expect(trackingFactory).toHaveBeenCalledTimes(1); // aún no reconecta
    vi.advanceTimersByTime(1);
    expect(trackingFactory).toHaveBeenCalledTimes(2); // reconectó en 1000ms

    // cierre 2 → intento 1, delay 2000ms
    (trackingFactory as ReturnType<typeof vi.fn>).mock.results
      .at(-1)?.value?.simulateClose();
    vi.advanceTimersByTime(1999);
    expect(trackingFactory).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(trackingFactory).toHaveBeenCalledTimes(3); // reconectó en 2000ms
  });
  ```

  **Test 2 — límite de 5 intentos:**
  ```typescript
  it('should stop reconnecting after MAX_RECONNECT_ATTEMPTS (5)', () => {
    const factory = vi.fn((url: string) => {
      const ws = new MockWebSocket(url);
      return ws as unknown as WebSocket;
    });
    const repo = new TestableWebSocketRepository(factory, mockStorage);
    repo.connect();

    for (let i = 0; i < 6; i++) {
      (factory.mock.results.at(-1)?.value as MockWebSocket)?.simulateClose();
      vi.advanceTimersByTime(30000);
    }

    // 1 intento inicial + 5 reintentos = 6 total (el 6.º cierre no genera nuevo intento)
    expect(factory).toHaveBeenCalledTimes(6);
  });
  ```

  **Test 3 — estado ERROR tras agotar intentos:**
  ```typescript
  it('should emit ERROR status after max attempts exhausted', () => {
    const statuses: string[] = [];
    const factory = vi.fn((url: string) => {
      const ws = new MockWebSocket(url);
      return ws as unknown as WebSocket;
    });
    const repo = new TestableWebSocketRepository(factory, mockStorage);
    repo.connectionStatus$.subscribe(s => statuses.push(s));

    repo.connect();
    for (let i = 0; i < 5; i++) {
      (factory.mock.results.at(-1)?.value as MockWebSocket)?.simulateClose();
      vi.advanceTimersByTime(30000);
    }

    expect(statuses.at(-1)).toBe('ERROR');
  });
  ```

- [ ] Confirmar que los 3 tests FALLAN (RED) — `connectionStatus$` y backoff no existen aún

**Verificación:** `npx vitest run --reporter=verbose websocket-repository.impl` → 3 tests FAIL (RED esperado).

---

## FASE 2 — Implementación GREEN

### TASK-03 · [GREEN] Backoff exponencial en `scheduleReconnect()`
**Capa:** Infrastructure · **Estimación:** 30 min
**Rama:** `feature/ep-02/real-time-notifications/task-03`
**Archivo:** `src/core/infrastructure/services/websocket-repository.impl.ts`

- [ ] Añadir tipo exportado `ConnectionStatus`:
  ```typescript
  export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  ```
- [ ] Reemplazar `reconnectInterval` por:
  ```typescript
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  readonly connectionStatus$ = new BehaviorSubject<ConnectionStatus>('DISCONNECTED');
  ```
- [ ] Reemplazar `scheduleReconnect()`:
  ```typescript
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
  ```
- [ ] Añadir `clearReconnect()`:
  ```typescript
  protected clearReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempt = 0;
  }
  ```
- [ ] Actualizar `connect()`:
  - `onopen` → `this.clearReconnect(); this.connectionStatus$.next('CONNECTED');`
  - `onclose` → `this.connected = false; this.scheduleReconnect();`
  - `catch` → `this.scheduleReconnect();`
- [ ] Actualizar `disconnect()`:
  - `this.clearReconnect(); this.connectionStatus$.next('DISCONNECTED');`
- [ ] Añadir getter `getConnectionStatus$()`:
  ```typescript
  getConnectionStatus$(): Observable<ConnectionStatus> {
    return this.connectionStatus$.asObservable();
  }
  ```
- [ ] Confirmar que los 3 tests de TASK-02 pasan (GREEN)

**Verificación:** `npx vitest run --reporter=verbose websocket-repository.impl` → todos PASS.

---

### TASK-04 · [GREEN] Añadir `ConnectionStatus` al port abstracto [P]
**Capa:** Domain · **Estimación:** 10 min
**Rama:** `feature/ep-02/real-time-notifications/task-03` *(misma sub-rama)*
**Archivo:** `src/core/domain/ports/websocket.repository.ts`

- [ ] Añadir export del tipo y método abstracto:
  ```typescript
  import { Observable } from 'rxjs';
  import { AlertMessage } from '../models/alert-message.model';
  import { WebSocketCommand } from '../models/websocket-command.model';

  export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';

  export abstract class WebSocketRepository {
    abstract connect(): void;
    abstract disconnect(): void;
    abstract sendCommand(command: WebSocketCommand): void;
    abstract getMessages$(): Observable<AlertMessage[]>;
    abstract isConnected(): boolean;
    abstract getConnectionStatus$(): Observable<ConnectionStatus>; // ← nuevo
  }
  ```
- [ ] Importar `ConnectionStatus` en `websocket-repository.impl.ts` desde el port (reemplazar definición local)
- [ ] Confirmar: `npx tsc --noEmit` sin errores

**Verificación:** Compilación limpia.

---

### TASK-05 · [GREEN] Actualizar `WebSocketService` fachada [P]
**Capa:** Infrastructure · **Estimación:** 10 min
**Rama:** `feature/ep-02/real-time-notifications/task-03` *(misma sub-rama)*
**Archivo:** `src/core/infrastructure/services/websocket.service.ts`

- [ ] Añadir import:
  ```typescript
  import { ConnectionStatus } from '../../domain/ports/websocket.repository';
  ```
- [ ] Añadir método fachada:
  ```typescript
  getConnectionStatus$(): Observable<ConnectionStatus> {
    return this.wsRepository.getConnectionStatus$();
  }
  ```

**Verificación:** Compilación limpia + test de `websocket.service.spec.ts` sin regresiones.

---

### TASK-06 · [GREEN] Actualizar `AlertsComponent` — 4 estados de conexión [P]
**Capa:** Presentation · **Estimación:** 20 min
**Rama:** `feature/ep-02/real-time-notifications/task-06`
**Archivos:** `alerts.component.ts` + `alerts.component.html` + `alerts.component.css`

**alerts.component.ts:**
- [ ] Importar `ConnectionStatus` desde el port
- [ ] Reemplazar `connected = false` por `connectionStatus: ConnectionStatus = 'DISCONNECTED'`
- [ ] Añadir mapa de labels (fuera de la clase, const):
  ```typescript
  const STATUS_LABELS: Record<ConnectionStatus, string> = {
    CONNECTED:    '● Conectado',
    DISCONNECTED: '○ Desconectado',
    CONNECTING:   '◌ Reconectando...',
    ERROR:        '✕ Sin conexión',
  };
  ```
- [ ] En `ngOnInit()`, añadir suscripción:
  ```typescript
  this.wsService.getConnectionStatus$().subscribe(status => {
    this.connectionStatus = status;
    this.cdr.detectChanges();
  });
  ```
- [ ] Exponer `statusLabel` en el componente:
  ```typescript
  readonly statusLabel = STATUS_LABELS;
  ```
- [ ] ⚠️ HUMAN CHECK: Sustituir uso de `this.connected` (getter `isAdmin` no se toca — no depende de `connected`)

**alerts.component.html:**
- [ ] Reemplazar el `<span class="connection-status">` actual:
  ```html
  <span class="connection-status"
        [class]="'status-' + connectionStatus.toLowerCase()">
    {{ statusLabel[connectionStatus] }}
  </span>
  ```

**alerts.component.css:**
- [ ] Añadir clases para los 4 estados:
  ```css
  .status-connected    { color: #28a745; }
  .status-disconnected { color: #6c757d; }
  .status-connecting   { color: #ffc107; }
  .status-error        { color: #dc3545; }
  ```

**Verificación:** `npx vitest run alerts` → tests de integración de AlertsComponent sin regresiones.

---

## FASE 3 — Verificación Final

### TASK-07 · Suite completa Vitest
**Estimación:** 5 min

- [ ] Ejecutar: `npx vitest run --reporter=verbose`
- [ ] Confirmar: TASK-01 (boundary) + TASK-02 (backoff ×3) + suite existente → todos PASS
- [ ] Confirmar: `npx tsc --noEmit` → 0 errores
- [ ] Commit: `feat(real-time-notifications): backoff exponencial + 4 estados de conexión (#15 tests)`

---

## Árbol de ramas

```
feature/gestion-categoria-amenaza  (base)
└── feature/ep-02/real-time-notifications              ← rama padre
    ├── feature/ep-02/real-time-notifications/task-01  ← test boundary 200
    ├── feature/ep-02/real-time-notifications/task-02  ← tests backoff RED
    ├── feature/ep-02/real-time-notifications/task-03  ← GREEN backoff + port + service
    └── feature/ep-02/real-time-notifications/task-06  ← AlertsComponent 4 estados
```
