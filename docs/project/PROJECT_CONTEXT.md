# 🛡️ CyberGuard System - Sistema de Alertas de Ciberseguridad

## 📋 Contexto de Negocio

**CyberGuard** es un sistema distribuido de monitoreo y gestión de amenazas de ciberseguridad en tiempo real. Permite a administradores reportar amenazas detectadas y recibir notificaciones instantáneas a través de WebSocket.

### Problema que Resuelve
- Centralizar reportes de amenazas de seguridad
- Notificar en tiempo real a equipos de seguridad
- Mantener historial de amenazas detectadas
- Facilitar respuesta rápida ante incidentes

### Usuarios
- **Administradores**: Reportan amenazas, reciben alertas en tiempo real
- **Sistema**: Procesa amenazas y distribuye notificaciones

---

## 🏗️ Arquitectura del Sistema

### Patrón: Event-Driven Architecture con Microservicios

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│  Backend    │─────▶│  RabbitMQ    │─────▶│   Worker    │
│  (Angular)  │      │  (Express)  │      │  (Message    │      │  (Consumer) │
│             │◀─────│             │      │   Broker)    │      │             │
└─────────────┘      └─────────────┘      └──────────────┘      └─────────────┘
       │                    │                                            │
       │                    │                                            │
       │                    ▼                                            ▼
       │             ┌─────────────┐                            ┌─────────────┐
       │             │    Redis    │                            │  WebSocket  │
       │             │  (Session)  │                            │   Server    │
       │             └─────────────┘                            └─────────────┘
       │                                                                 │
       └─────────────────────────────────────────────────────────────────┘
                            (Notificaciones en Tiempo Real)
```

### Componentes

1. **Frontend (Angular 21 — Hexagonal)**
   - Arquitectura hexagonal: `core/domain/`, `core/application/use-cases/`, `presentation/`
   - Use Cases: `LoginUseCase`, `ReportThreatUseCase`, `GetThreatsUseCase`, `DeleteThreatUseCase`, `GetStatisticsUseCase`
   - Ports: `AuthRepository`, `ThreatRepository`, `StatisticsRepository`, `WebSocketRepository`
   - Presentation: `DashboardComponent`, `StatisticsWidgetComponent`, `AlertsComponent`, `ReportThreatComponent`, `AutenticacionComponent`
   - Guards: `AuthGuard`, `AdminGuard`
   - Strategies + Factory: `ThreatValidationStrategy`, `ThreatValidationFactory`
   - Shared state via RxJS signals/Observables

2. **Backend API — Producer (Node.js + Express — Hexagonal TypeScript)**
   - Autenticación dual: **Firebase** (identity provider) + **JWT** (sesiones)
   - Validación de payloads: Joi
   - Controllers: `AuthController`, `ThreatController`, `StatisticsController`, `AdminController`
   - Use Cases: `GetThreatStatisticsUseCase`, `ListThreatsUseCase`, `DeleteThreatUseCase`
   - Domain Ports: `ThreatRepository`, `ThreatStatisticsRepository`, `UserRepository`, `AuditLogRepository`, `EventPublisher`, `ThreatClassificationStrategy`
   - Infraestructura: `PostgresThreatRepository`, `PostgresThreatStatisticsRepository`, `PostgresUserRepository`, `PostgresAuditLogRepository`, `RabbitMQPublisher`, `FirebaseAuthProvider`, `JWTTokenService`
   - Middlewares: `authMiddleware`, `bruteForceDetection`, `errorMiddleware`, `validationMiddleware`
   - Rate limiting y Helmet.js para seguridad de headers
   - Logging: Winston

3. **RabbitMQ**
   - Message broker
   - Exchange: `cyberguard.events`
   - Topic: `#`

4. **Worker (Node.js Consumer)**
   - Consume mensajes de RabbitMQ
   - Persiste historial en **Redis**
   - Servidor WebSocket en puerto 8081
   - Reenvía eventos al Frontend en tiempo real

5. **PostgreSQL 15+**
   - Persistencia principal del Backend
   - Tablas: `users`, `threats`, `audit_logs`
   - Migración inicial: `backend/producer/migrations/001_initial_schema.sql`
   - Usuario `admin` pre-seeded

6. **Redis 7+**
   - Usado únicamente por el Worker
   - Historial de alertas recibidas por WebSocket

---

## 📡 Contratos de API

### 1. Autenticación

#### POST `/api/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "cyberguard2024"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

**Response 401:**
```json
{
  "error": "Invalid credentials"
}
```

**Credenciales por Defecto:**
- Username: `admin`
- Password: `cyberguard2024`

---

### 2. Reporte de Amenazas

#### POST `/api/threats`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "type": "malware",
  "severity": "high",
  "sourceIp": "192.168.1.100",
  "targetIp": "10.0.0.50",
  "description": "Malware detected on endpoint attempting to exfiltrate data",
  "metadata": {
    "reportedAtLocal": "15/2/2024, 10:30:45",
    "reportedAtTz": "America/Bogota",
    "detectionMethod": "antivirus",
    "affectedFiles": 15
  }
}
```

**Campos:**

| Campo | Tipo | Requerido | Valores | Descripción |
|-------|------|-----------|---------|-------------|
| `type` | string | ✅ | `malware`, `intrusion`, `phishing`, `ddos`, `ransomware` | Tipo de amenaza |
| `severity` | string | ✅ | `low`, `medium`, `high`, `critical` | Nivel de severidad |
| `sourceIp` | string | ✅ | IPv4 válida | IP origen del ataque |
| `targetIp` | string | ❌ | IPv4 válida | IP objetivo (opcional) |
| `description` | string | ✅ | 10-500 chars | Descripción detallada |
| `metadata` | object | ❌ | Cualquier objeto | Datos adicionales |

**Response 201:**
```json
{
  "threatId": "threat-1234567890",
  "status": "queued",
  "message": "Threat report received and queued for processing"
}
```

**Response 400:**
```json
{
  "error": "Validation failed",
  "details": {
    "sourceIp": "must be a valid IPv4 address"
  }
}
```

**Response 401:**
```json
{
  "error": "Unauthorized - Invalid or missing token"
}
```

---

### 3. Estadísticas de Amenazas

#### GET `/api/statistics`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalThreats": 42,
    "bySeverity": { "low": 5, "medium": 15, "high": 18, "critical": 4 },
    "byType": { "malware": 12, "intrusion": 10, "phishing": 8, "ddos": 7, "ransomware": 5 },
    "timeWindow": "all_time",
    "generatedAt": "2026-04-06T10:00:00.000Z"
  }
}
```

---

### 4. Listado de Amenazas

#### GET `/api/threats`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{ "total": 10, "threats": [ { "id": "...", "type": "malware", "severity": "high", ... } ] }
```

---

### 5. Eliminar Amenaza

#### DELETE `/api/threats/:threatId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{ "success": true, "threatId": "...", "message": "Threat deleted successfully" }
```

**Response 404:**
```json
{ "success": false, "error": "Threat not found" }
```

---

### 6. Gestión de Roles (Admin)

#### PATCH `/api/admin/users/:username/role`

**Headers:**
```
Authorization: Bearer <token>  (role=admin requerido)
```

**Request:**
```json
{ "role": "analyst" }
```

**Roles válidos:** `admin`, `analyst`, `viewer`

**Response 200:**
```json
{ "message": "Role updated", "username": "...", "role": "analyst" }
```

---

### Conexión

**URL:** `ws://localhost:8081`

**Eventos del Cliente → Servidor:**

#### 1. Limpiar Todas las Alertas
```json
{
  "type": "clear-all"
}
```

#### 2. Eliminar Alerta Específica
```json
{
  "type": "delete-one",
  "id": "threat-1234567890"
}
```

---

**Eventos del Servidor → Cliente:**

#### 1. Nueva Amenaza Detectada
```json
{
  "eventId": "evt-1234567890",
  "type": "threat.detected",
  "routingKey": "threat.reported",
  "data": {
    "threatId": "threat-1234567890",
    "type": "malware",
    "severity": "high",
    "sourceIp": "192.168.1.100",
    "targetIp": "10.0.0.50",
    "description": "Malware detected on endpoint",
    "metadata": {
      "reportedAtLocal": "15/2/2024, 10:30:45",
      "reportedAtTz": "America/Bogota"
    }
  },
  "receivedAt": "2024-02-15T15:30:45.123Z",
  "processedAt": "2024-02-15T15:30:45.456Z"
}
```

#### 2. Comando de Limpieza
```json
{
  "type": "clear-all"
}
```

#### 3. Comando de Eliminación
```json
{
  "type": "delete-one",
  "id": "threat-1234567890"
}
```

---

## 🔐 Seguridad

### Autenticación
- **JWT** con expiración de 24 horas
- Token en header: `Authorization: Bearer <token>`
- Almacenamiento en localStorage del frontend

### Validación
- **Joi** para validación de payloads
- Sanitización de inputs
- Validación de IPs con regex
- Límites de longitud en strings

### Rate Limiting
- 100 requests por 15 minutos por IP
- Protección contra DDoS

### Headers de Seguridad
- Helmet.js configurado
- CORS con orígenes permitidos
- CSP (Content Security Policy)

---

## 💾 Persistencia de Datos

### Frontend (localStorage)
- **Key:** `cg_ws_history`
- **Capacidad:** 200 mensajes
- **Deduplicación:** Por `eventId`, `threatId`, o hash

### Backend (Redis) — Worker únicamente
- Historial de alertas recibidas vía WebSocket
- TTL configurable

### Backend (PostgreSQL)
- Tabla `users`: sincronizada desde Firebase en primer login
- Tabla `threats`: amenazas reportadas, con índices por tipo, severidad y fecha
- Tabla `audit_logs`: registro de acciones por usuario
- Usuario `admin` pre-seeded en migración inicial

### RabbitMQ
- Persistencia de mensajes
- Durabilidad de colas
- Acknowledgments manuales

---

## 🚀 Flujo Completo de una Amenaza

```
1. Usuario reporta amenaza en Frontend
   ↓
2. Frontend envía POST /api/threats con JWT
   ↓
3. Backend valida payload con Joi
   ↓
4. Backend publica mensaje en RabbitMQ
   ↓
5. Worker consume mensaje de la cola
   ↓
6. Worker procesa y enriquece datos
   ↓
7. Worker envía notificación vía WebSocket
   ↓
8. Frontend recibe notificación en tiempo real
   ↓
9. Frontend deduplica y almacena en localStorage
   ↓
10. Usuario ve alerta en dashboard
```

---

## 📦 Estructura del Proyecto

```
cyberguard-system/
├── frontend/
│   └── cyberguard-system-appv2/          # Frontend activo (Angular 21 + Hexagonal)
│       └── src/
│           ├── core/
│           │   ├── domain/
│           │   │   ├── models/              # Entidades y enums de dominio
│           │   │   ├── ports/               # Interfaces (repositorios, servicios)
│           │   │   └── services/            # Servicios de dominio
│           │   └── application/
│           │       └── use-cases/           # LoginUseCase, ReportThreatUseCase, etc.
│           ├── presentation/
│           │   ├── components/          # Dashboard, Alerts, ReportThreat, Login
│           │   └── guards/              # AuthGuard, AdminGuard
│           ├── shared/
│           │   ├── strategies/          # ThreatValidationStrategy
│           │   └── factories/           # ThreatValidationFactory
│           └── environments/
├── backend/
│   ├── producer/                         # Backend API (TypeScript + Hexagonal)
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql    # Esquema PostgreSQL inicial
│   │   └── src/
│   │       ├── domain/
│   │       │   ├── entities/             # Threat
│   │       │   ├── ports/                # Interfaces de repositorios y proveedores
│   │       │   └── services/             # ThreatClassifier
│   │       ├── application/
│   │       │   ├── use-cases/            # GetThreatStatisticsUseCase, ListThreatsUseCase, DeleteThreatUseCase
│   │       │   └── services/             # AuthService, ThreatService
│   │       └── infrastructure/
│   │           ├── http/
│   │           │   ├── controllers/      # auth, threat, statistics, admin
│   │           │   ├── middlewares/      # auth, bruteforce, error, validation
│   │           │   └── validators/       # threat.schema.ts
│   │           ├── persistence/      # PostgresThreatRepository, PostgresUserRepository, etc.
│   │           ├── providers/        # FirebaseAuthProvider, JWTTokenService, RabbitMQPublisher
│   │           ├── factories/        # ServiceFactory
│   │           └── config/           # env.ts, database.ts, logger.ts, rabbitmq.ts
│   └── worker/                           # Worker Consumer (Redis + WebSocket)
├── docker-compose.yml                    # RabbitMQ + Redis + PostgreSQL + Backend + Worker + Frontend
├── docs/
│   ├── architecture/                     # ARCHITECTURAL_IMPACT_ANALYTICS.md, HEXAGONAL_FRONTEND.md
│   ├── security/                         # SECURITY_GUIDELINES.md, PLANNED_ATTACK.md
│   ├── qa/                               # QA_EVIDENCE.md, FEEDBACK_TEAM-4-QA.md
│   ├── feedback/                         # FEEDBACK_DAVID.md, FEEDBACK_Jhorman.md
│   ├── project/                          # PROJECT_CONTEXT.md, DECISION_LOG.md, CHANGELOG_SOURCES.md
│   ├── guides/                           # TOOLS_GUIDE.md
│   └── diagrams/                         # drawio: C4, secuencia, componentes
├── AI_WORKFLOW.md
└── README.md
```

---

## 🔧 Variables de Entorno

### Backend (.env)
```bash
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
RABBITMQ_URL=amqp://localhost:5672
ALLOWED_ORIGINS=http://localhost:4200
# Firebase (identity provider)
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=cyberguard_db
POSTGRES_USER=cyberguard
POSTGRES_PASSWORD=cyberguard_secret
```

### Frontend (environment.ts)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:8081'
};
```

### Worker (.env)
```bash
RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379
WORKER_WS_PORT=8081
WORKER_EXCHANGE=cyberguard.events
WORKER_TOPIC=#
```

---

## 🚀 Instalación y Ejecución

### Opción 1: Docker Compose (Recomendado)

```bash
# Clonar repositorio
git clone https://github.com/aotalvaros/cyberguard-system
cd cyberguard-system

# Levantar todo el sistema
docker compose up --build

# Acceder
# Frontend: http://localhost:4200
# Backend: http://localhost:3000
# RabbitMQ UI: http://localhost:15672 (guest/guest)
```

### Opción 2: Desarrollo Local

```bash
# 1. Levantar infraestructura
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run dev

# 3. Worker
cd backend/worker
npm install
npm start

# 4. Frontend
cd frontend/cyberguard-system-appv2
npm install
npm start
```

---

## 🧪 Testing

### Frontend
```bash
cd frontend/cyberguard-system-appv2
npm test                    # Ejecutar tests con Vitest
npm run test:coverage       # Con cobertura
```

**Cobertura Objetivo:** 85%+

**Archivos Testeados (hexagonal):**
- ✅ `core/application/use-cases/__tests__/` — todos los use-cases
- ✅ `core/domain/services/__tests__/` — servicios de dominio
- ✅ `core/domain/ports/__tests__/` — contratos de puertos
- ✅ `presentation/components/dashboard/__tests__/` — Dashboard + integración
- ✅ `presentation/components/alerts/__tests__/` — Alerts + integración
- ✅ `presentation/guards/__tests__/` — AuthGuard, AdminGuard
- ✅ `shared/strategies/__tests__/` — ThreatValidationStrategy

### Backend
```bash
cd backend/producer
npm test
```

**Suites testeadas:** 21 suites, ~506 tests

**Capas cubiertas:**
- ✅ `unit/domain/entities/` — entidades de dominio
- ✅ `unit/domain/services/` — ThreatClassifier
- ✅ `unit/aplication/use-cases/` — GetThreatStatisticsUseCase, ListThreatsUseCase, DeleteThreatUseCase
- ✅ `unit/aplication/services/` — AuthService, ThreatService
- ✅ `unit/infrastructure/http/controllers/` — auth, threat, statistics, admin
- ✅ `unit/infrastructure/http/middlewares/` — auth, bruteforce, error, validation
- ✅ `unit/infrastructure/persistence/` — Postgres repositories
- ✅ `unit/infrastructure/providers/` — Firebase, JWT, RabbitMQ
- ✅ `integration/` — auth y statistics

---

## 📊 Métricas y Monitoreo

### Performance
- Latencia API: < 100ms (p95)
- Throughput: 1000 req/s
- WebSocket: < 50ms de latencia

### Disponibilidad
- Uptime objetivo: 99.9%
- RTO: 5 minutos
- RPO: 1 hora

---

## 🐛 Troubleshooting

### Frontend no recibe notificaciones
1. Verificar que el Worker esté corriendo
2. Verificar conexión WebSocket en DevTools
3. Verificar que el usuario sea admin

### Backend retorna 401
1. Verificar que el token JWT sea válido
2. Verificar que no haya expirado (24h)
3. Verificar header `Authorization: Bearer <token>`

### RabbitMQ no procesa mensajes
1. Verificar que la cola exista
2. Verificar que el Worker esté conectado
3. Revisar logs del Worker

---

## 📚 Documentación Adicional

- **TESTING_GUIDE.md** - Estrategias de testing para código difícil
- **ANGULAR_JEST_SETUP.md** - Setup de Jest para Angular
- **SECURITY_GUIDELINES.md** - Checklist de seguridad
- **QA_EVIDENCE.md** - Evidencias de pruebas
- **AI_WORKFLOW.md** - Estrategia de trabajo con IA

---

## 🤝 Contribución

1. Fork el proyecto
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m "feat: agregar nueva funcionalidad"`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Convenciones de Commits
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Documentación
- `test:` Tests
- `refactor:` Refactorización

---

## 📞 Contacto

**Equipo CyberGuard**
- GitHub: https://github.com/aotalvaros/cyberguard-system
- Issues: https://github.com/aotalvaros/cyberguard-system/issues

---

## 📄 Licencia

MIT License - Ver LICENSE para más detalles

---

**Última actualización:** Abril 2026
