# 🛠️ Herramientas de Desarrollo - CyberGuard Frontend

**Objetivo:** Explicar las herramientas modernas para asegurar calidad, escalabilidad y mantenibilidad

---

## 🧪 Testing Tools

### 1. **Jest** - Unit & Integration Testing

**¿Qué hace?**
- Framework de testing para JavaScript/TypeScript
- Ejecuta tests unitarios e integración
- Mide code coverage
- Mocking integrado

**¿Por qué Jest y no Jasmine/Karma?**
- ⚡ 3x más rápido
- 🎯 Mejor experiencia de desarrollo
- 📊 Coverage reports integrados
- 🔄 Watch mode inteligente

**Ejemplo:**
```typescript
// auth.use-case.service.spec.ts
describe('AuthUseCaseService', () => {
  let service: AuthUseCaseService;
  let mockAuthRepo: jest.Mocked<AuthRepository>;

  beforeEach(() => {
    mockAuthRepo = {
      login: jest.fn(),
      logout: jest.fn()
    } as any;

    service = new AuthUseCaseService(mockAuthRepo);
  });

  it('should save session when login succeeds', async () => {
    const session = { token: 'abc', user: { username: 'admin' } };
    mockAuthRepo.login.mockReturnValue(of(session));

    await service.login('admin', 'pass').toPromise();

    expect(mockAuthRepo.login).toHaveBeenCalledWith('admin', 'pass');
  });
});
```

**Comandos:**
```bash
npm test                    # Ejecutar todos los tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # Con coverage report
npm test -- auth.spec.ts    # Test específico
```

**Configuración:**
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    }
  }
};
```

---

### 2. **Cypress** - End-to-End Testing

**¿Qué hace?**
- Tests E2E (simula usuario real)
- Interactúa con la UI completa
- Screenshots y videos automáticos
- Time-travel debugging

**¿Por qué Cypress y no Protractor?**
- 🎥 Grabación de tests
- 🐛 Debugging visual
- ⚡ Más rápido y confiable
- 📱 Soporte para mobile

**Ejemplo:**
```typescript
// cypress/e2e/login.cy.ts
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should login successfully with valid credentials', () => {
    cy.get('[data-cy=username]').type('admin');
    cy.get('[data-cy=password]').type('cyberguard2024');
    cy.get('[data-cy=submit]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-cy=welcome-message]').should('contain', 'admin');
  });

  it('should show error with invalid credentials', () => {
    cy.get('[data-cy=username]').type('admin');
    cy.get('[data-cy=password]').type('wrong');
    cy.get('[data-cy=submit]').click();

    cy.get('[data-cy=error]').should('contain', 'Invalid credentials');
    cy.url().should('include', '/login');
  });

  it('should navigate to dashboard when already authenticated', () => {
    cy.window().then(win => {
      win.localStorage.setItem('cgv2_session', JSON.stringify({
        token: 'valid-token',
        user: { username: 'admin', role: 'admin' }
      }));
    });

    cy.visit('/login');
    cy.url().should('include', '/dashboard');
  });
});
```

**Comandos:**
```bash
npx cypress open             # Modo interactivo
npx cypress run              # Modo headless (CI)
npx cypress run --spec "cypress/e2e/login.cy.ts"
```

**Configuración:**
```typescript
// cypress.config.ts
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720
  }
});
```

---

## 📊 Code Quality Tools

### 3. **SonarQube** - Análisis Estático de Código

**¿Qué hace?**
- Detecta bugs, vulnerabilidades y code smells
- Mide complejidad ciclomática
- Calcula deuda técnica
- Reportes de duplicación de código
- Quality gates (bloquea merge si no pasa)

**Métricas que analiza:**
- 🐛 **Bugs:** Errores que causan comportamiento incorrecto
- 🔒 **Vulnerabilidades:** Problemas de seguridad (XSS, injection)
- 💩 **Code Smells:** Código difícil de mantener
- 📊 **Coverage:** % de código testeado
- 🔄 **Duplicación:** Código repetido
- 📏 **Complejidad:** Ciclomática por función

**Ejemplo de Reporte:**
```
┌─────────────────────────────────────────────┐
│ SonarQube Quality Gate: PASSED ✅          │
├─────────────────────────────────────────────┤
│ Bugs:              0                        │
│ Vulnerabilities:   0                        │
│ Code Smells:       5 (A rating)             │
│ Coverage:          87.3%                    │
│ Duplications:      2.1%                     │
│ Technical Debt:    3 days                   │
└─────────────────────────────────────────────┘
```

**Problemas que detecta en CyberGuard Legacy:**
```typescript
// ❌ Complejidad alta (8)
private getMessageId(payload: any): string | null {
  if (payload.eventId) return payload.eventId;
  if (payload.data?.threatId) return payload.data.threatId;
  // ... 6 condiciones más
}
// SonarQube: "Reduce complexity from 8 to 5"

// ❌ Uso de 'any' (Type Safety)
messages: any[] = [];
// SonarQube: "Use specific type instead of 'any'"

// ❌ Try-catch vacío
try { this.ws.connect(); } catch {}
// SonarQube: "Handle or log the exception"

// ❌ Función larga (40 líneas)
submitThreat() { ... }
// SonarQube: "Split into smaller functions"
```

**Integración CI/CD:**
```yaml
# .github/workflows/sonar.yml
- name: SonarQube Scan
  run: |
    npm run test:coverage
    sonar-scanner \
      -Dsonar.projectKey=cyberguard-frontend \
      -Dsonar.sources=src \
      -Dsonar.tests=src \
      -Dsonar.test.inclusions=**/*.spec.ts \
      -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info \
      -Dsonar.qualitygate.wait=true
```

---

## 🎨 Code Style Tools

### 4. **ESLint** - Linter para TypeScript/JavaScript

**¿Qué hace?**
- Detecta errores de sintaxis
- Aplica reglas de estilo
- Previene bugs comunes
- Integración con IDE (errores en tiempo real)

**Reglas importantes para CyberGuard:**
```javascript
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@angular-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",        // ❌ Prohibir 'any'
    "@typescript-eslint/explicit-function-return-type": "warn",
    "max-lines": ["error", 150],                          // Máx 150 líneas por archivo
    "max-lines-per-function": ["error", 20],              // Máx 20 líneas por función
    "complexity": ["error", 5],                           // Complejidad máx 5
    "no-console": ["warn", { "allow": ["error"] }],       // Solo console.error
    "no-magic-numbers": "error",                          // Prohibir magic numbers
    "@angular-eslint/component-max-inline-declarations": "error"
  }
}
```

**Ejemplo de uso:**
```bash
npm run lint                # Analizar código
npm run lint -- --fix       # Auto-fix problemas
```

**Errores que detectaría en CyberGuard Legacy:**
```typescript
// ❌ ESLint: no-explicit-any
messages: any[] = [];
// Fix: messages: ThreatAlert[] = [];

// ❌ ESLint: no-magic-numbers
this.messages = list.slice(0, 50);
// Fix: this.messages = list.slice(0, MAX_VISIBLE_MESSAGES);

// ❌ ESLint: max-lines-per-function
submitThreat() {
  // 40 líneas...
}
// Fix: Dividir en funciones más pequeñas
```

---

### 5. **Prettier** - Formateador de Código

**¿Qué hace?**
- Formatea código automáticamente
- Estilo consistente en todo el equipo
- Elimina discusiones sobre estilo
- Integración con Git hooks

**¿Por qué Prettier?**
- 🎨 Opinionated (sin configuración)
- ⚡ Rápido
- 🔄 Integración con ESLint
- 🤝 Elimina debates de estilo

**Configuración:**
```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

**Antes vs Después:**
```typescript
// ❌ ANTES (inconsistente)
const user={username:"admin",role:'admin'}
if(user.role==='admin'){
this.connect()
}

// ✅ DESPUÉS (formateado por Prettier)
const user = { username: 'admin', role: 'admin' };
if (user.role === 'admin') {
  this.connect();
}
```

**Integración con Git:**
```json
// package.json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,html,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,html,css}\""
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,html,css}": ["prettier --write", "eslint --fix"]
  }
}
```

---

## 🔄 Git Hooks

### 6. **Husky** - Git Hooks Manager

**¿Qué hace?**
- Ejecuta scripts antes de commit/push
- Previene commits con errores
- Aplica formato automáticamente
- Valida mensajes de commit

**Configuración:**
```bash
# Instalar
npm install -D husky lint-staged

# Inicializar
npx husky init

# Crear hooks
echo "npm run lint" > .husky/pre-commit
echo "npm test -- --passWithNoTests" > .husky/pre-push
```

**Flujo:**
```bash
git add .
git commit -m "feat: add login"

# Husky ejecuta automáticamente:
# 1. Prettier formatea código
# 2. ESLint valida reglas
# 3. Tests unitarios
# 4. Si todo pasa → commit ✅
# 5. Si algo falla → commit bloqueado ❌
```

---

### 7. **Conventional Commits** - Mensajes Estandarizados

**¿Qué hace?**
- Estandariza mensajes de commit
- Genera changelog automático
- Semantic versioning automático

**Formato:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Tipos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Refactorización
- `test`: Agregar tests
- `docs`: Documentación
- `chore`: Tareas de mantenimiento

**Ejemplos:**
```bash
git commit -m "feat(auth): implement hexagonal architecture for login"
git commit -m "fix(dashboard): resolve memory leak in websocket subscription"
git commit -m "refactor(ws): extract message id generation to strategy pattern"
git commit -m "test(auth): add unit tests for auth use case (85% coverage)"
```

**Validación automática:**
```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1

# commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'test', 'docs', 'chore']],
    'scope-enum': [2, 'always', ['auth', 'dashboard', 'ws', 'threat', 'infra']],
    'subject-max-length': [2, 'always', 100]
  }
};
```

---

## 📦 Bundle Analysis

### 8. **webpack-bundle-analyzer**

**¿Qué hace?**
- Visualiza tamaño del bundle
- Identifica dependencias pesadas
- Detecta código duplicado
- Optimiza imports

**Uso:**
```bash
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

**Visualización:**
```
┌─────────────────────────────────────────┐
│  Bundle Size: 487 KB                    │
├─────────────────────────────────────────┤
│  ├─ @angular/core (120 KB)             │
│  ├─ rxjs (85 KB)                        │
│  ├─ @angular/common (65 KB)            │
│  ├─ app code (150 KB)                   │
│  └─ other (67 KB)                       │
└─────────────────────────────────────────┘
```

**Optimizaciones detectadas:**
```typescript
// ❌ Import completo (pesado)
import * as _ from 'lodash';

// ✅ Import específico (liviano)
import { debounce } from 'lodash-es';

// ❌ Dependencia no usada
import { MatDialog } from '@angular/material/dialog';  // No se usa

// ✅ Lazy loading
loadChildren: () => import('./dashboard/dashboard.routes')
```

---

## 🔍 Performance Tools

### 9. **Lighthouse CI**

**¿Qué hace?**
- Audita performance, accesibilidad, SEO
- Ejecuta en cada PR
- Bloquea merge si score baja

**Métricas:**
- ⚡ **Performance:** FCP, LCP, TTI, CLS
- ♿ **Accessibility:** ARIA, contraste, navegación
- 🔍 **SEO:** Meta tags, estructura
- ✅ **Best Practices:** HTTPS, console errors

**Configuración CI:**
```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse CI
  run: |
    npm run build
    npm install -g @lhci/cli
    lhci autorun
    
# lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}]
      }
    }
  }
}
```

---

### 10. **Angular DevTools**

**¿Qué hace?**
- Profiling de componentes
- Detecta change detection innecesario
- Visualiza árbol de componentes
- Debugging de inyección de dependencias

**Uso:**
```
1. Instalar extensión de Chrome
2. Abrir DevTools → Angular tab
3. Profiler → Record
4. Interactuar con la app
5. Stop → Analizar flamegraph
```

**Optimizaciones detectadas:**
```typescript
// ❌ Change detection en cada evento
@Component({
  changeDetection: ChangeDetectionStrategy.Default  // Lento
})

// ✅ OnPush (solo cuando inputs cambian)
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush  // Rápido
})

// ❌ Sin trackBy (re-renderiza toda la lista)
<div *ngFor="let item of items">

// ✅ Con trackBy (solo items cambiados)
<div *ngFor="let item of items; trackBy: trackById">

trackById(index: number, item: Threat): string {
  return item.id;
}
```

---

## 🔐 Security Tools

### 11. **npm audit**

**¿Qué hace?**
- Detecta vulnerabilidades en dependencias
- Sugiere versiones seguras
- Integración con CI/CD

**Uso:**
```bash
npm audit                    # Ver vulnerabilidades
npm audit fix                # Auto-fix vulnerabilidades
npm audit fix --force        # Fix breaking changes
```

**Ejemplo:**
```
┌───────────────────────────────────────────┐
│ found 3 vulnerabilities (1 moderate, 2 high) │
├───────────────────────────────────────────┤
│ Package: lodash                           │
│ Severity: high                            │
│ Issue: Prototype Pollution                │
│ Fix: npm install lodash@4.17.21           │
└───────────────────────────────────────────┘
```

---

## 🤖 Automation Tools

### 12. **GitHub Actions** - CI/CD

**¿Qué hace?**
- Ejecuta tests automáticamente en cada PR
- Build y deploy automático
- Quality gates
- Notificaciones

**Pipeline Completo:**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
          
      - name: Install dependencies
        run: npm ci
        
      - name: Lint
        run: npm run lint
        
      - name: Format check
        run: npm run format:check
        
      - name: Unit tests
        run: npm run test:ci
        
      - name: E2E tests
        run: npm run e2e:ci
        
      - name: Build
        run: npm run build
        
      - name: SonarQube scan
        run: npm run sonar
        
      - name: Lighthouse CI
        run: npm run lighthouse:ci
        
      - name: Security audit
        run: npm audit --audit-level=moderate
        
      - name: Bundle size check
        run: npm run bundlesize
```

---

## 📊 Resumen de Herramientas

| Herramienta | Propósito | Cuándo se ejecuta | Bloquea commit/merge |
|-------------|-----------|-------------------|---------------------|
| **Jest** | Unit tests | Pre-push, CI | ✅ Sí |
| **Cypress** | E2E tests | CI, manual | ✅ Sí |
| **ESLint** | Linting | Pre-commit, CI | ✅ Sí |
| **Prettier** | Formato | Pre-commit | ✅ Sí |
| **SonarQube** | Calidad | CI | ✅ Sí (quality gate) |
| **Lighthouse** | Performance | CI | ✅ Sí (score <90) |
| **npm audit** | Seguridad | CI | ✅ Sí (high/critical) |
| **Husky** | Git hooks | Local | ✅ Sí |

---

## 🎯 Flujo de Desarrollo

```
1. Developer escribe código
   ↓
2. Git add + commit
   ↓
3. Husky ejecuta:
   - Prettier (auto-format)
   - ESLint (validación)
   - Jest (unit tests)
   ↓
4. Si pasa → Commit ✅
   Si falla → Commit bloqueado ❌
   ↓
5. Git push
   ↓
6. GitHub Actions ejecuta:
   - Lint
   - Tests (unit + E2E)
   - Build
   - SonarQube
   - Lighthouse
   - Security audit
   ↓
7. Si todo pasa → Merge habilitado ✅
   Si algo falla → Merge bloqueado ❌
```

---

## 💰 Costo vs Beneficio

| Herramienta | Setup Time | Mantenimiento | ROI |
|-------------|------------|---------------|-----|
| Jest | 2 horas | Bajo | Alto ⭐⭐⭐⭐⭐ |
| Cypress | 4 horas | Medio | Alto ⭐⭐⭐⭐⭐ |
| ESLint | 1 hora | Bajo | Alto ⭐⭐⭐⭐⭐ |
| Prettier | 30 min | Bajo | Alto ⭐⭐⭐⭐⭐ |
| SonarQube | 8 horas | Medio | Muy Alto ⭐⭐⭐⭐⭐ |
| Lighthouse | 2 horas | Bajo | Alto ⭐⭐⭐⭐ |
| Husky | 1 hora | Bajo | Alto ⭐⭐⭐⭐⭐ |

**Total Setup:** ~18 horas (2-3 días)  
**Beneficio:** Previene 100+ horas de debugging y refactoring

---

## 🚀 Quick Start

```bash
# 1. Instalar todas las herramientas
npm install -D jest @testing-library/angular cypress \
  eslint prettier husky lint-staged \
  @commitlint/cli @commitlint/config-conventional

# 2. Configurar
npx husky init
npm run prepare

# 3. Crear configuraciones
# - jest.config.js
# - .eslintrc.json
# - .prettierrc
# - commitlint.config.js

# 4. Agregar scripts a package.json
{
  "scripts": {
    "test": "jest",
    "test:ci": "jest --ci --coverage",
    "e2e": "cypress open",
    "e2e:ci": "cypress run",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.{ts,html,css}",
    "sonar": "sonar-scanner"
  }
}

# 5. Ejecutar
npm run lint
npm run format
npm test
npm run e2e
```

---

**Preparado por:** Senior DevOps & QA Team  
**Próxima actualización:** Post-Sprint 1
