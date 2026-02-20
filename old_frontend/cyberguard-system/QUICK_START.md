# 🚀 Quick Start - Testing

## Instalación

```bash
cd frontend/cyberguard-system
npm install
npm install -D @vitest/coverage-v8 @vitest/ui --legacy-peer-deps
```

## Ejecutar Tests

```bash
npm test
```

## Con Cobertura

```bash
npm run test:coverage
```

## Ver Reporte

```bash
xdg-open coverage/index.html
```

## ⚠️ Importante

Los tests están escritos en **sintaxis Jasmine** pero necesitan conversión a **Vitest**:

- `jasmine.createSpy()` → `vi.fn()`
- `spyOn(obj, 'method').and.returnValue()` → `vi.spyOn(obj, 'method').mockReturnValue()`
- `expect().toHaveBeenCalled()` → `expect().toHaveBeenCalled()`

## Para Proyecto Nuevo

Usa Vitest desde el inicio. Ver **TESTING_GUIDE.md** para estrategias completas que son universales (WebSocket, localStorage, observables, etc.)
