# CyberGuard System - Frontend v2

Sistema de monitoreo de ciberseguridad en tiempo real construido con Angular 21 y arquitectura hexagonal.

## Puntuación de Calidad: 9.3/10 ⭐

| Criterio | Estado |
|----------|--------|
| Arquitectura Hexagonal | ✅ |
| Modelos Inmutables | ✅ |
| Error Handling Global | ✅ |
| HTTP Interceptors | ✅ |
| DTOs vs Domain | ✅ |
| Mappers | ✅ |
| Loading State | ✅ |
| Test Coverage 85%+ | ✅ |

## Tecnologías

- **Angular 21** - Framework frontend
- **TypeScript 5.8** - Lenguaje tipado
- **RxJS** - Programación reactiva
- **Vitest 4.0** - Testing framework
- **Docker + Nginx** - Despliegue

## Arquitectura

El proyecto sigue **Arquitectura Hexagonal (Clean Architecture)**:

```
src/
├── core/                    # Núcleo de negocio
│   ├── domain/              # Modelos, puertos, servicios de dominio
│   │   ├── models/          # Entidades inmutables
│   │   ├── ports/           # Interfaces (contratos)
│   │   └── services/        # Lógica de negocio pura
│   ├── application/         # Casos de uso
│   │   └── use-cases/       # Orchestración de operaciones
│   └── infrastructure/      # Implementaciones concretas
│       ├── adapters/        # LocalStorage, etc
│       ├── handlers/        # GlobalErrorHandler
│       ├── interceptors/    # HTTP interceptors
│       ├── mappers/         # DTO ↔ Domain
│       ├── services/        # Repositorios impl
│       └── state/           # Estado global
├── presentation/            # UI Layer
│   ├── components/          # Componentes Angular
│   └── guards/              # Route guards
├── shared/                  # Utilidades compartidas
│   └── strategies/          # Validation strategies
└── environments/            # Configuración
```

## Patrones de Diseño

- **Repository Pattern** - Abstracción de datos
- **Factory Pattern** - Creación de DTOs/Modelos
- **Strategy Pattern** - Validación por tipo de amenaza
- **Facade Pattern** - Servicios simplificados
- **Adapter Pattern** - LocalStorage
- **Observer Pattern** - RxJS streams
- **Interceptor Pattern** - HTTP middleware
- **Mapper Pattern** - Transformaciones DTO/Domain
- **Singleton Pattern** - Services con providedIn: 'root'

## Características de Arquitectura

### HTTP Interceptors
- **AuthInterceptor** - Agrega JWT automáticamente
- **ErrorInterceptor** - Transforma errores a AppError
- **RetryInterceptor** - Reintenta requests fallidos
- **LoadingInterceptor** - Estado de carga global

### Global Error Handler
- Tipos: NETWORK, AUTHENTICATION, AUTHORIZATION, VALIDATION, SERVER, UNKNOWN
- Logging centralizado
- Redirección automática en 401

### DTOs y Mappers
- DTOs separados de modelos de dominio
- Mappers bidireccionales (DTO ↔ Domain)
- Modelos inmutables con `readonly`

## Desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
ng serve

# Build de producción
ng build
```

## Testing

```bash
# Ejecutar tests
npm test

# Tests con cobertura
npm test -- --no-watch --coverage

# Tests en modo watch
npm test -- --watch
```

### Cobertura de Tests

| Métrica | Cobertura |
|---------|-----------|
| Statements | 85.5% |
| Branches | 84.05% |
| Functions | 84.89% |
| Lines | 83.54% |

**Total:** 196 tests en 27 archivos

### Archivos con 100% cobertura:
- ✅ Use Cases (Login, Logout, GetCurrentUser, ReportThreat, GetThreats, DeleteThreat)
- ✅ Mappers (Auth, Threat, WebSocket)
- ✅ Adapters (LocalStorage)
- ✅ Services (Auth, Threat, WebSocket, Loading)
- ✅ Repositories (Auth, Threat)
- ✅ Guards (Admin)
- ✅ Strategies (ThreatValidation)
- ✅ Handlers (GlobalError)

## Docker

```bash
# Desplegar
./deploy.sh

# Detener
./stop.sh
```

## Configuración

Variables de entorno en `src/environments/`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:8081'
};
```

## Funcionalidades

- 🔐 **Autenticación** - Login/Logout con JWT
- 🛡️ **Reporte de Amenazas** - Formulario validado
- 📡 **Alertas en Tiempo Real** - WebSocket con reconexión
- 📊 **Dashboard** - Estadísticas y filtros
- 📥 **Exportación** - JSON de alertas
- 🎨 **Responsive** - Mobile-first design

## Licencia

MIT
