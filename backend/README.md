# Backend - CyberGuard System

Backend API (Producer) del sistema de alertas de ciberseguridad en tiempo real.

## 🚀 Stack Tecnológico

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Lenguaje**: TypeScript
- **Validación**: Joi
- **Autenticación**: JWT
- **Message Broker**: RabbitMQ (amqplib)
- **Logger**: Winston
- **Testing**: Jest + Supertest

---

## 📋 Prerequisitos

- Node.js >= 20.x
- Docker Desktop (para RabbitMQ)
- npm

---

## 🔧 Instalación

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env` con tus valores:
```env
PORT=3000
NODE_ENV=development
RABBITMQ_URL=amqp://guest:guest@localhost:5672
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ALLOWED_ORIGINS=http://localhost:4200

# Credenciales de usuario hardcodeado
ADMIN_USERNAME=1111
ADMIN_PASSWORD=1111
```

### 3. Levantar RabbitMQ
```bash
# Desde la raíz del proyecto
cd ..
npm run docker:up
```

Verificar que RabbitMQ esté corriendo:
- Management UI: http://localhost:15672 (guest/guest)

### 4. Iniciar servidor
```bash
npm run dev
```

El servidor estará corriendo en: http://localhost:3000

---

## 📡 API Endpoints

### Health Check
```http
GET /health
```

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "111",
  "password": "111"
}
```

**Respuesta exitosa (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

**Errores:**
- `400`: Validación fallida (username/password requeridos, mínimo 3/6 caracteres)
- `401`: Credenciales inválidas

---

### 2. Reportar Amenaza
```http
POST /api/threats
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "malware",
  "severity": "critical",
  "sourceIp": "192.168.1.100",
  "targetIp": "10.0.0.1",
  "description": "Ransomware detectado en servidor de producción",
  "metadata": {
    "signature": "WannaCry.v2",
    "affectedFiles": 150
  }
}
```

**Campos:**
- `type` (requerido): `malware` | `intrusion` | `phishing` | `ddos` | `ransomware`
- `severity` (requerido): `low` | `medium` | `high` | `critical`
- `sourceIp` (requerido): IP válida
- `targetIp` (opcional): IP válida
- `description` (requerido): 10-500 caracteres
- `metadata` (opcional): Objeto con datos adicionales

**Respuesta exitosa (202):**
```json
{
  "message": "Threat reported successfully",
  "threatId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

**Errores:**
- `400`: Validación fallida
- `401`: Token faltante, inválido o expirado
- `500`: Error interno

---

### 3. Listar Amenazas
```http
GET /api/threats
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "threats": [
    {
      "eventId": "event-123",
      "eventType": "threat.detected",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "data": {
        "threatId": "threat-123",
        "type": "malware",
        "severity": "critical",
        "sourceIp": "192.168.1.100",
        "description": "Ransomware detectado...",
        "metadata": {}
      }
    }
  ],
  "total": 1
}
```

**Errores:**
- `401`: Token faltante, inválido o expirado

---

## 🧪 Testing

### Ejecutar todos los tests
```bash
npm test
```

### Tests en modo watch
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:coverage
```

**Tests implementados:**
- ✅ Login endpoint (validaciones, autenticación)
- ✅ Auth middleware (JWT validation)
- ✅ Threat endpoint POST (validaciones, integración RabbitMQ)
- ✅ Threat endpoint GET (listar amenazas)
- ✅ Threat store (almacenamiento en memoria)
- ✅ Brute force detection (detección automática)

---

## 🔍 Verificar Funcionamiento

### 1. Con Postman/Thunder Client

#### Paso 1: Login
```http
POST http://localhost:3000/api/auth/login

{
  "username": "111",
  "password": "111"
}
```
Copia el `token` de la respuesta.

#### Paso 2: Reportar amenaza manual
```http
POST http://localhost:3000/api/threats
Authorization: Bearer <pega-el-token-aquí>

{
  "type": "malware",
  "severity": "critical",
  "sourceIp": "192.168.1.100",
  "description": "Malware detectado en sistema crítico"
}
```

#### Paso 3: Listar amenazas
```http
GET http://localhost:3000/api/threats
Authorization: Bearer <pega-el-token-aquí>
```

#### Paso 4: Probar detección automática de fuerza bruta
Haz **5 intentos fallidos** de login:
```http
POST http://localhost:3000/api/auth/login

{
  "username": "admin",
  "password": "wrongpassword"
}
```

Luego lista amenazas (Paso 3) y verás una de tipo `intrusion` con `autoDetected: true`.

### 2. Verificar en RabbitMQ

1. Abre http://localhost:15672 (guest/guest)
2. Ve a **Queues and Streams** → Click **"Add a new queue"**
3. Name: `test-queue` → Click **"Add queue"**
4. Click en `test-queue` → **"Bindings"** → **"Add binding from this queue"**
5. From exchange: `cyberguard.events`
6. Routing key: `threat.detected.#`
7. Click **"Bind"**
8. Reporta una amenaza desde Postman
9. En `test-queue` → Click **"Get messages"** → Verás el evento publicado

---

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # Validación de variables de entorno
│   │   ├── logger.ts           # Configuración de Winston
│   │   └── rabbitmq.ts         # Conexión y publicación a RabbitMQ
│   ├── controllers/
│   │   ├── auth.controller.ts  # Endpoint de login
│   │   └── threat.controller.ts # Endpoint de amenazas
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # Validación de JWT
│   │   └── error.middleware.ts # Manejo global de errores
│   ├── services/
│   │   └── threat.service.ts   # Lógica de negocio de amenazas
│   ├── types/
│   │   └── index.ts            # Interfaces TypeScript
│   ├── __tests__/
│   │   ├── auth.controller.test.ts
│   │   ├── auth.middleware.test.ts
│   │   └── threat.controller.test.ts
│   └── server.ts               # Punto de entrada
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛡️ Seguridad

### Implementado:
- ✅ Credenciales en variables de entorno (no hardcodeadas)
- ✅ Validación de inputs con Joi
- ✅ JWT con expiración (8h)
- ✅ Rate limiting (100 req/15min)
- ✅ CORS configurado
- ✅ Helmet.js para headers de seguridad
- ✅ Logs sin datos sensibles
- ✅ Separación de validación usuario/contraseña
- ✅ Detección automática de fuerza bruta (5 intentos fallidos)
- ✅ Almacenamiento de amenazas en memoria

### Human Checks:
Busca comentarios `// ⚠️ HUMAN CHECK:` en:
- `config/env.ts` - Validación de variables de entorno
- `config/rabbitmq.ts` - Manejo de conexión
- `controllers/auth.controller.ts` - Validación de credenciales y JWT
- `middlewares/auth.middleware.ts` - Manejo de errores de token
- `services/threat.service.ts` - Routing key dinámico

---

## 🔄 Scripts Disponibles

```bash
npm run dev          # Modo desarrollo con hot-reload
npm run build        # Compilar TypeScript a JavaScript
npm start            # Ejecutar versión compilada
npm test             # Ejecutar tests
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con cobertura
```

---

## 🐛 Troubleshooting

### Error: "Missing required environment variable"
- Verifica que el archivo `.env` existe
- Asegúrate de tener todas las variables del `.env.example`

### Error: "Failed to connect to RabbitMQ"
- Verifica que Docker Desktop esté corriendo
- Ejecuta `npm run docker:up` desde la raíz del proyecto
- Verifica que RabbitMQ esté en http://localhost:15672

### Error: "Token expired" o "Invalid token"
- Genera un nuevo token haciendo login nuevamente
- Los tokens expiran en 8 horas


**Última actualización**: 2024-01-15
