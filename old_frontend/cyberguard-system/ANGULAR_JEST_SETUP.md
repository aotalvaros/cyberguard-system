# 🚀 Setup Angular Testeable con Jest

## 📋 Stack Recomendado para Angular

### Testing
- **Jest** - Rápido, compatible con Angular
- **@testing-library/angular** - Tests centrados en usuario
- **jest-preset-angular** - Preset oficial

### Code Quality
- **ESLint** - Linting
- **Prettier** - Formato
- **Husky** - Git hooks

---

## 🛠️ Setup Paso a Paso

### 1. Crear Proyecto Angular

```bash
ng new mi-proyecto
cd mi-proyecto
```

### 2. Instalar Jest

```bash
npm uninstall karma karma-jasmine karma-chrome-launcher @types/jasmine
npm install -D jest @types/jest jest-preset-angular @testing-library/angular
```

### 3. Configurar Jest

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/environments/**'
  ],
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

### 4. Setup de Jest

```typescript
// setup-jest.ts
import 'jest-preset-angular/setup-jest';
```

### 5. Actualizar tsconfig

```json
// tsconfig.spec.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jest", "node"],
    "esModuleInterop": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

### 6. Scripts en package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

---

## 🏗️ Arquitectura Testeable

### Estructura Recomendada

```
src/
├── app/
│   ├── core/                    # Servicios singleton
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── auth.service.spec.ts
│   │   ├── guards/
│   │   └── interceptors/
│   ├── shared/                  # Componentes compartidos
│   │   ├── components/
│   │   ├── directives/
│   │   └── pipes/
│   ├── features/                # Features modulares
│   │   ├── login/
│   │   │   ├── login.component.ts
│   │   │   ├── login.component.spec.ts
│   │   │   ├── login.component.html
│   │   │   └── login.service.ts
│   │   └── dashboard/
│   └── testing/                 # Test helpers
│       ├── mocks/
│       └── factories/
└── setup-jest.ts
```

---

## 🧪 Ejemplos de Tests con Jest

### 1. Test de Servicio

```typescript
// auth.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should login successfully', (done) => {
    const mockResponse = { token: 'abc123', user: { id: '1', name: 'John' } };

    service.login('admin', 'pass').subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should handle login error', (done) => {
    service.login('wrong', 'credentials').subscribe({
      next: () => fail('should have failed'),
      error: (error) => {
        expect(error.status).toBe(401);
        done();
      }
    });

    const req = httpMock.expectOne('/api/auth/login');
    req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
  });
});
```

### 2. Test de Componente

```typescript
// login.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRouter: jest.Mocked<Router>;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn()
    } as any;

    mockRouter = {
      navigate: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form when empty', () => {
    expect(component.form.valid).toBeFalsy();
  });

  it('should login successfully', () => {
    mockAuthService.login.mockReturnValue(of({ token: 'abc', user: { id: '1' } }));

    component.form.patchValue({ username: 'admin', password: 'pass' });
    component.submit();

    expect(mockAuthService.login).toHaveBeenCalledWith('admin', 'pass');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show error on login failure', () => {
    mockAuthService.login.mockReturnValue(throwError(() => ({ error: 'Invalid' })));

    component.form.patchValue({ username: 'wrong', password: 'wrong' });
    component.submit();

    expect(component.error).toBe('Invalid');
  });
});
```

### 3. Test de Guard

```typescript
// auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRouter: jest.Mocked<Router>;

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: jest.fn()
    } as any;

    mockRouter = {
      navigate: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('should allow access when authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(null as any, null as any));

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard(null as any, null as any));

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
```

### 4. Test con Testing Library

```typescript
// login.component.spec.ts (Testing Library)
import { render, screen, fireEvent, waitFor } from '@testing-library/angular';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';

describe('LoginComponent (Testing Library)', () => {
  it('should login on form submit', async () => {
    const mockAuthService = {
      login: jest.fn().mockReturnValue(of({ token: 'abc' }))
    };

    await render(LoginComponent, {
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.input(usernameInput, { target: { value: 'admin' } });
    fireEvent.input(passwordInput, { target: { value: 'pass123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAuthService.login).toHaveBeenCalledWith('admin', 'pass123');
    });
  });
});
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
        run: npm run test:ci
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## ✅ Ventajas de Jest sobre Karma

| Feature | Jest | Karma + Jasmine |
|---------|------|-----------------|
| Velocidad | ⚡ 5-10x más rápido | 🐌 Lento |
| Watch mode | ✅ Inteligente | ❌ Básico |
| Snapshots | ✅ Sí | ❌ No |
| Parallel | ✅ Por defecto | ❌ Complejo |
| Setup | ✅ Simple | ❌ Complejo |
| Futuro | ✅ Activo | ⚠️ Deprecated |

---

## 🎯 Resultado Esperado

- Tests en < 5 segundos (vs 30s con Karma)
- Cobertura > 80%
- CI/CD automático
- Developer experience mejorado

---

## 📚 Recursos

- [Jest](https://jestjs.io/)
- [jest-preset-angular](https://thymikee.github.io/jest-preset-angular/)
- [Testing Library Angular](https://testing-library.com/docs/angular-testing-library/intro/)
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Técnicas avanzadas
