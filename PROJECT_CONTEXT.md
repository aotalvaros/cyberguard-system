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

1. **Frontend (Angular 21)**
   - UI para login y dashboard
   - Formulario de reporte de amenazas
   - Cliente WebSocket para notificaciones
   - Gestión de historial local

2. **Backend API (Node.js + Express)**
   - Autenticación JWT
   - Validación de payloads (Joi)
   - Producer de RabbitMQ
   - Rate limiting y seguridad

3. **RabbitMQ**
   - Message broker
   - Cola: `threats.queue`
   - Exchange: `threats.exchange`
   - Routing key: `threat.reported`

4. **Worker (Node.js Consumer)**
   - Consume mensajes de RabbitMQ
   - Procesa amenazas
   - Envía notificaciones vía WebSocket
   - Servidor WebSocket en puerto 8081

5. **Redis**
   - Almacenamiento de sesiones
   - Cache de datos temporales

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

## 🔌 Contrato WebSocket

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

### Backend (Redis)
- Sesiones de usuario
- Cache temporal
- TTL: 24 horas

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
│   └── cyberguard-system/
│       ├── src/
│       │   ├── app/
│       │   │   ├── services/
│       │   │   │   ├── auth.service.ts       # Autenticación y sesiones
│       │   │   │   ├── threat.service.ts     # Reporte de amenazas
│       │   │   │   └── ws.service.ts         # Cliente WebSocket
│       │   │   ├── guards/
│       │   │   │   └── admin.guard.ts        # Protección de rutas
│       │   │   ├── admin/
│       │   │   │   └── admin-dashboard.component.ts  # Dashboard principal
│       │   │   └── autenticacion/
│       │   │       └── autenticacion.component.ts    # Login
│       │   └── environment.ts
│       ├── TESTING_GUIDE.md          # Guía de testing (2000+ líneas)
│       ├── ANGULAR_JEST_SETUP.md     # Setup de Jest para Angular
│       └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.js        # Rutas de autenticación
│   │   │   └── threats.routes.js     # Rutas de amenazas
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js    # Validación JWT
│   │   │   └── validation.middleware.js  # Validación Joi
│   │   ├── services/
│   │   │   └── rabbitmq.service.js   # Producer de RabbitMQ
│   │   └── server.js
│   └── worker/
│       ├── consumer.js               # Consumer de RabbitMQ
│       └── websocket.server.js       # Servidor WebSocket
├── docker-compose.yml                # RabbitMQ + Redis
├── docs/
│   ├── SECURITY_GUIDELINES.md        # Checklist de seguridad
│   └── QA_EVIDENCE.md                # Evidencias de QA
└── README.md                         # Este archivo
```

---

## 🔧 Variables de Entorno

### Backend (.env)
```bash
PORT=3000
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h
RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:4200
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### Frontend (environment.ts)
```typescript
export const environment = {
  production: false,
  baseUrl: 'http://localhost:3000/api/auth',
  apiBase: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:8081'
};
```

### Worker (.env)
```bash
RABBITMQ_URL=amqp://localhost:5672
WEBSOCKET_PORT=8081
QUEUE_NAME=threats.queue
EXCHANGE_NAME=threats.exchange
ROUTING_KEY=threat.reported
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
cd frontend/cyberguard-system
npm install
npm start
```

---

## 🧪 Testing

### Frontend
```bash
cd frontend/cyberguard-system
npm test                    # Ejecutar tests
npm run test:coverage       # Con cobertura
```

**Cobertura Objetivo:** 85%+

**Archivos Testeados:**
- ✅ auth.service.spec.ts (95%+)
- ✅ threat.service.spec.ts (90%+)
- ✅ ws.service.spec.ts (95%+)
- ✅ admin-dashboard.component.spec.ts (90%+)
- ✅ autenticacion.component.spec.ts (95%+)
- ✅ admin.guard.spec.ts (100%)

### Backend
```bash
cd backend
npm test
```

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

**Última actualización:** Febrero 2024
