# 🚀 Setup de Proyecto Angular Fácil de Testear

## 📋 Stack Recomendado

### Testing
- **Vitest** - Rápido, moderno, compatible con Vite
- **Testing Library** - Tests centrados en el usuario
- **MSW** - Mock de APIs HTTP

### Code Quality
- **ESLint** - Linting
- **Prettier** - Formato
- **Husky** - Git hooks
- **lint-staged** - Pre-commit checks

### CI/CD
- **GitHub Actions** - Automatización
- **Codecov** - Reporte de cobertura

---

## 🛠️ Setup Paso a Paso

### 1. Crear Proyecto

```bash
npm create vite@latest mi-proyecto -- --template angular
cd mi-proyecto
npm install
```

### 2. Instalar Testing

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D jsdom @testing-library/angular @testing-library/user-event
npm install -D msw
```

### 3. Configurar Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', '**/*.spec.ts', '**/*.config.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

### 4. Setup de Angular Testing

```typescript
// src/test-setup.ts
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
```

### 5. Instalar Code Quality

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier
npm install -D husky lint-staged
```

### 6. Configurar ESLint

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "max-lines-per-function": ["warn", 50],
    "complexity": ["warn", 10]
  }
}
```

### 7. Configurar Prettier

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### 8. Configurar Husky

```bash
npx husky init
echo "npm run lint && npm test -- --run" > .husky/pre-commit
```

### 9. Scripts en package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.{ts,html,css}\""
  }
}
```

---

## 🏗️ Arquitectura Testeable

### Estructura de Carpetas

```
src/
├── app/
│   ├── core/                    # Servicios singleton
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── auth.service.spec.ts
│   │   └── guards/
│   ├── shared/                  # Componentes reutilizables
│   │   ├── components/
│   │   └── pipes/
│   ├── features/                # Módulos por feature
│   │   ├── login/
│   │   │   ├── login.component.ts
│   │   │   ├── login.component.spec.ts
│   │   │   └── login.service.ts
│   │   └── dashboard/
│   └── testing/                 # Utilidades de testing
│       ├── mocks/
│       └── helpers/
└── test-setup.ts
```

### Principios de Diseño

#### 1. Inyección de Dependencias
```typescript
// ✅ BIEN - Fácil de testear
export class UserService {
  constructor(private http: HttpClient) {}
}

// ❌ MAL - Difícil de testear
export class UserService {
  private http = inject(HttpClient);
}
```

#### 2. Interfaces para Contratos
```typescript
// user.repository.ts
export interface UserRepository {
  getUser(id: string): Observable<User>;
  saveUser(user: User): Observable<void>;
}

// user.service.ts
export class UserService {
  constructor(private repo: UserRepository) {}
}

// En tests: mock fácil del repository
```

#### 3. Separar Lógica de UI
```typescript
// ✅ BIEN
export class LoginComponent {
  constructor(private authService: AuthService) {}
  
  login() {
    this.authService.login(this.form.value);
  }
}

// ❌ MAL - Lógica mezclada
export class LoginComponent {
  login() {
    const token = btoa(this.username + ':' + this.password);
    localStorage.setItem('token', token);
    // ... más lógica
  }
}
```

---

## 🧪 Patrones de Testing

### 1. Test de Servicio Simple

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });
    
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should fetch user', (done) => {
    service.getUser('123').subscribe(user => {
      expect(user.id).toBe('123');
      done();
    });

    const req = httpMock.expectOne('/api/users/123');
    req.flush({ id: '123', name: 'John' });
  });
});
```

### 2. Test de Componente con Testing Library

```typescript
import { render, screen, fireEvent } from '@testing-library/angular';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('should login on submit', async () => {
    const mockAuthService = { login: vi.fn() };
    
    await render(LoginComponent, {
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    fireEvent.input(screen.getByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(mockAuthService.login).toHaveBeenCalledWith('admin', 'pass');
  });
});
```

### 3. Mock de API con MSW

```typescript
// src/testing/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'John' });
  }),
  
  http.post('/api/login', async ({ request }) => {
    const body = await request.json();
    if (body.username === 'admin') {
      return HttpResponse.json({ token: 'abc123' });
    }
    return HttpResponse.json({ error: 'Invalid' }, { status: 401 });
  })
];

// src/test-setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './testing/mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 📊 CI/CD con GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm run test:coverage
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Check Coverage Thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi
```

---

## ✅ Checklist de Proyecto Testeable

### Setup Inicial
- [ ] Vitest configurado
- [ ] Testing Library instalado
- [ ] MSW para mocks de API
- [ ] ESLint + Prettier
- [ ] Husky + lint-staged
- [ ] GitHub Actions

### Arquitectura
- [ ] Inyección de dependencias
- [ ] Interfaces para contratos
- [ ] Lógica separada de UI
- [ ] Servicios singleton en core/
- [ ] Features modulares

### Testing
- [ ] Test por cada servicio
- [ ] Test por cada componente
- [ ] Mocks de APIs con MSW
- [ ] Coverage > 80%
- [ ] Tests en CI/CD

### Code Quality
- [ ] ESLint sin errores
- [ ] Prettier aplicado
- [ ] Complejidad < 10
- [ ] Funciones < 50 líneas
- [ ] Sin 'any' explícitos

---

## 🎯 Resultado Esperado

Con este setup desde el inicio:

- ✅ Tests rápidos (< 5s para 100+ tests)
- ✅ Cobertura > 80% sin esfuerzo
- ✅ CI/CD automático
- ✅ Code quality garantizado
- ✅ Fácil de mantener y escalar

---

## 📚 Recursos

- [Vitest](https://vitest.dev/)
- [Testing Library Angular](https://testing-library.com/docs/angular-testing-library/intro/)
- [MSW](https://mswjs.io/)
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Técnicas avanzadas
