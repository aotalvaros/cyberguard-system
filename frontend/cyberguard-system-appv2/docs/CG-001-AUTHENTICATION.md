# CG-001: Authentication Module

## 📋 Descripción
Módulo de autenticación implementado con arquitectura hexagonal, siguiendo principios SOLID y patrones de diseño.

## 🏗️ Arquitectura

### Capas Hexagonales

```
core/
├── domain/              # Capa de dominio (entidades y contratos)
│   ├── models/         # User, LoginCredentials, AuthResponse
│   └── ports/          # AuthRepository (interface)
├── application/        # Casos de uso (lógica de negocio)
│   └── use-cases/      # LoginUseCase, LogoutUseCase, GetCurrentUserUseCase
└── infrastructure/     # Implementaciones técnicas
    ├── adapters/       # LocalStorageAdapter
    └── services/       # AuthRepositoryImpl, AuthService (Facade)
```

## 🎯 Patrones Aplicados

1. **Hexagonal Architecture**: Separación clara entre dominio, aplicación e infraestructura
2. **Dependency Inversion (SOLID)**: AuthRepository como abstracción
3. **Facade Pattern**: AuthService simplifica el uso de casos de uso
4. **Repository Pattern**: AuthRepository abstrae persistencia y HTTP
5. **Use Case Pattern**: Lógica de negocio encapsulada

## 🔌 Uso

### Login
```typescript
constructor(private authService: AuthService) {}

login() {
  this.authService.login('admin', 'cyberguard2024').subscribe({
    next: (response) => console.log('Logged in', response),
    error: (err) => console.error('Error', err)
  });
}
```

### Logout
```typescript
logout() {
  this.authService.logout();
}
```

### Verificar Admin
```typescript
if (this.authService.isAdmin()) {
  // Usuario es admin
}
```

### Guard
```typescript
// app.routes.ts
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [adminGuard]
}
```

## 🧪 Tests

Ejecutar tests:
```bash
npm test
```

Cobertura:
- LoginUseCase ✅
- LogoutUseCase ✅
- GetCurrentUserUseCase ✅
- AuthService ✅
- adminGuard ✅

## 📦 Dependencias

- `@angular/common/http` - HttpClient
- `rxjs` - Observables
- `vitest` - Testing

## 🔐 Seguridad

- Token JWT almacenado en localStorage
- Guard protege rutas admin
- Limpieza de credenciales en logout
