// ⚠️ SETUP SIMPLIFICADO: Compatible con Vitest + jsdom

// ⚠️ OPTIMIZACIÓN: Mock global para localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    store: {} as Record<string, string>,
    getItem(key: string) { 
      return this.store[key] || null; 
    },
    setItem(key: string, value: string) { 
      this.store[key] = value; 
    },
    removeItem(key: string) { 
      delete this.store[key]; 
    },
    clear() { 
      this.store = {}; 
    }
  },
  configurable: true
});

// ⚠️ OPTIMIZACIÓN: Mock global para fetch si no existe
if (!global.fetch) {
  global.fetch = vi.fn() as any;
}

// Mock console para tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};