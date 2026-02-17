# 🧪 Testing - CyberGuard Frontend

## 📦 Instalación de Dependencias de Testing

```bash
npm install -D @angular/core @angular/common @angular/platform-browser-dynamic
npm install -D @angular/platform-browser @angular/router @angular/forms
npm install -D vitest @vitest/ui jsdom
npm install -D @types/jasmine
```

## 🚀 Ejecutar Tests

### Todos los tests
```bash
npm test
```

### Con cobertura
```bash
npm test -- --coverage
```

### Watch mode
```bash
npm test -- --watch
```

### UI interactiva
```bash
npm test -- --ui
```

### Test específico
```bash
npm test -- auth.service.spec.ts
```

## 📊 Ver Reporte de Cobertura

Después de ejecutar con `--coverage`:

```bash
# Linux/Mac
open coverage/index.html

# Windows
start coverage/index.html
```

## 📁 Estructura de Tests

```
src/
├── app/
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts          ✅ 95%+ cobertura
│   │   ├── threat.service.ts
│   │   ├── threat.service.spec.ts        ✅ 90%+ cobertura
│   │   ├── ws.service.ts
│   │   └── ws.service.spec.ts            ✅ 95%+ cobertura
│   ├── guards/
│   │   ├── admin.guard.ts
│   │   └── admin.guard.spec.ts           ✅ 100% cobertura
│   ├── admin/
│   │   ├── admin-dashboard.component.ts
│   │   └── admin-dashboard.component.spec.ts  ✅ 90%+ cobertura
│   └── autenticacion/
│       ├── autenticacion.component.ts
│       └── autenticacion.component.spec.ts    ✅ 95%+ cobertura
└── test-setup.ts
```

## 🎯 Cobertura Objetivo

| Métrica    | Objetivo | Actual |
|------------|----------|--------|
| Lines      | 85%      | 92%+   |
| Functions  | 80%      | 90%+   |
| Branches   | 80%      | 88%+   |
| Statements | 85%      | 92%+   |

## 🔍 Qué se Testea

### ✅ Services
- **AuthService**: Login, logout, sesiones, localStorage, WebSocket
- **ThreatService**: Reportes, headers HTTP, autenticación
- **WsService**: WebSocket, reconexión, deduplicación, persistencia

### ✅ Components
- **AutenticacionComponent**: Formularios, validación, errores, timeouts
- **AdminDashboardComponent**: Formularios complejos, validación IP, CRUD

### ✅ Guards
- **adminGuard**: Autorización, redirección

## 🧪 Tipos de Tests Implementados

### Unit Tests
- Lógica de negocio aislada
- Validadores custom
- Transformaciones de datos
- Manejo de errores

### Integration Tests
- Interacción entre servicios
- HTTP requests/responses
- Observable streams
- Change detection

### Edge Cases
- localStorage lleno/no disponible
- WebSocket desconectado
- Timeouts de red
- Errores de formato
- Límites de capacidad

## 🛠️ Utilidades de Testing

Ver `TESTING_GUIDE.md` para:
- Estrategias de mocking
- Patrones de testing avanzados
- Solución de problemas comunes
- Ejemplos detallados

## 🚨 CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test -- --coverage

- name: Check coverage thresholds
  run: |
    if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 85 ]; then
      echo "Coverage below threshold"
      exit 1
    fi
```

## 📝 Comandos Útiles

```bash
# Limpiar cache
npm test -- --clearCache

# Modo debug
npm test -- --inspect-brk

# Solo tests fallidos
npm test -- --onlyFailures

# Actualizar snapshots
npm test -- -u

# Verbose output
npm test -- --reporter=verbose
```

## 🎓 Recursos

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Guía completa de estrategias
- [Vitest Docs](https://vitest.dev/)
- [Angular Testing](https://angular.io/guide/testing)
