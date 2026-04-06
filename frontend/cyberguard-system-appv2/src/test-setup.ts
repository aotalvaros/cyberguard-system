// Polyfill CloseEvent for Node.js test environment (needed by WebSocket tests)
if (typeof globalThis.CloseEvent === 'undefined') {
  (globalThis as any).CloseEvent = class CloseEvent extends Event {
    code: number;
    reason: string;
    wasClean: boolean;
    constructor(type: string, init?: { code?: number; reason?: string; wasClean?: boolean }) {
      super(type);
      this.code = init?.code ?? 1000;
      this.reason = init?.reason ?? '';
      this.wasClean = init?.wasClean ?? true;
    }
  };
}
