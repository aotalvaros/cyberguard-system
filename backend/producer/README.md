# Backend - CyberGuard System

Backend API (Producer) del sistema de alertas de ciberseguridad en tiempo real con arquitectura Event-Driven.

**📚 Documentación Relacionada:**
- 🤖 [AI_WORKFLOW.md](../AI_WORKFLOW.md) - Marco de desarrollo con IA (Prompting por Capas)
- 🛡️ [SECURITY_GUIDELINES.md](../docs/SECURITY_GUIDELINES.md) - Checklist de seguridad obligatorio

---

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
ADMIN_USERNAME=admin
ADMIN_PASSWORD=cyberguard2024
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
  "username": "admin",
  "password": "cyberguard2024"
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
  "username": "admin",
  "password": "cyberguard2024"
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

### 3. Historial WebSocket (Worker)

El worker guarda historial en Redis para replays al reconectar. El dashboard puede limpiar el historial compartido por WebSocket:

- **Clear all**: envía `{ "type": "clear-all" }` → borra Redis y notifica a todos los clientes
- **Delete one**: envía `{ "type": "delete-one", "id": "<messageId>" }` → elimina un item en Redis y sincroniza a los clientes

---

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # Validación de variables de entorno ⚠️
│   │   ├── logger.ts           # Logging estructurado con Winston
│   │   └── rabbitmq.ts         # Conexión segura a RabbitMQ ⚠️
│   ├── controllers/
│   │   ├── auth.controller.ts  # Endpoint de login + JWT ⚠️
│   │   └── threat.controller.ts # Endpoints de amenazas
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # Validación JWT ⚠️
│   │   ├── bruteforce.middleware.ts # Protección contra ataques 🛡️
│   │   └── error.middleware.ts # Manejo seguro de errores
│   ├── services/
│   │   ├── threat.service.ts   # Lógica de negocio + eventos
│   │   └── threat.store.ts     # Almacenamiento en memoria
│   ├── types/
│   │   └── index.ts            # Interfaces TypeScript
│   ├── __tests__/
│   │   ├── auth.controller.test.ts
│   │   ├── auth.middleware.test.ts
│   │   ├── bruteforce.middleware.test.ts
│   │   ├── threat.controller.test.ts
│   │   └── threat.store.test.ts
│   └── server.ts               # Punto de entrada Express
├── worker/                      # Worker asincrónico (Consumer)
│   ├── src/
│   │   ├── config.ts
│   │   ├── handler.ts
│   │   ├── rabbitmq.ts
│   │   ├── websocket.ts
│   │   └── index.ts
│   └── package.json
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md

⚠️ = Contiene comentarios "HUMAN CHECK" (validación de seguridad requerida)
🛡️ = Componente crítico de seguridad
```

---

## 🛡️ Seguridad

**📖 Lee [SECURITY_GUIDELINES.md](../docs/SECURITY_GUIDELINES.md) ANTES de hacer cambios de seguridad.**

### ✅ Implementado:
1. **Secrets Management**: Credenciales en variables de entorno
2. **Input Validation**: Validación con Joi
3. **Password Hashing**: Bcrypt (rounds: 10+)
4. **JWT Security**: Expiración 15-30 min + refresh tokens
5. **Rate Limiting**: 100 req/15min + brute force protection
6. **CORS**: Configurado restrictivo (sin `*`)
7. **Helmet.js**: Headers de seguridad
8. **Logging**: Estructurado, sin datos sensibles
9. **RabbitMQ**: Credenciales en env, mensajes persistentes
10. **Error Handling**: Mensajes genéricos, no expone detalles
11. **Auto-Detection**: Fuerza bruta en login (5 intentos)
12. **Audit Trail**: Eventos críticos registrados

### ⚠️ Human Checks Obligatorios:
Estos archivos contienen lógica crítica que requiere validación manual:

```
✅ MUST REVIEW (Antes de merge):
- src/config/env.ts              # Variables de entorno
- src/config/rabbitmq.ts         # Conexión a RabbitMQ
- src/controllers/auth.controller.ts  # Autenticación
- src/middlewares/auth.middleware.ts  # Validación JWT
- src/middlewares/bruteforce.middleware.ts  # Protección
- src/services/threat.service.ts # Publicación de eventos
```

### Checklist Pre-Merge:
Sigue el checklist completo en [SECURITY_GUIDELINES.md#checklist-pre-merge](../docs/SECURITY_GUIDELINES.md#checklist-pre-merge)

---

## 🤖 Desarrollo con IA

### Marco de Trabajo: AI_WORKFLOW.md

Este proyecto utiliza **Prompting por Capas** para interacción con IA:

1. **Capa 1**: Contexto arquitectónico (microservicios, RabbitMQ, seguridad)
2. **Capa 2**: Especificación funcional (caso de uso, criterios de aceptación)
3. **Capa 3**: Validación técnica (resiliencia, patrones, trade-offs)
4. **Capa 4**: Refinamiento humano (Human Checks obligatorios)

### Estructura de Prompts al IA:
```
"Contexto: Sistema distribuido de alertas de ciberseguridad.
Stack: Node.js, TypeScript, RabbitMQ, Docker.
Patrón: Event-Driven con CQRS.

Requisito de seguridad: [TEMA]
Explica tu solución antes de generar código."
```

### Validación de Código:
- ✅ Código generado por IA requiere **Human Check** en lógica crítica
- ✅ Busca comentarios `// ⚠️ HUMAN CHECK:` en cada archivo
- ✅ QA valida contra [SECURITY_GUIDELINES.md](../docs/SECURITY_GUIDELINES.md)

📚 **Lee [AI_WORKFLOW.md](../AI_WORKFLOW.md) para detalles completos.**

---

```bash
# Desarrollo
npm run dev          # Modo desarrollo con hot-reload

# Build
npm run build        # Compilar TypeScript a JavaScript
npm start            # Ejecutar versión compilada

# Testing
npm test             # Ejecutar todos los tests
npm run test:watch   # Tests en modo watch (cambios en tiempo real)
npm run test:coverage # Coverage de tests

# Verificación
npm audit            # Escanear vulnerabilidades en dependencias
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
- Los tokens expiran en 15-30 minutos (ver `JWT_SECRET` en `.env`)

### Error: "Brute force detected"
- Espera 15 minutos o elimina el usuario de la lista de bloqueos
- Los intentos fallidos se resetean automáticamente

---

## 📞 Soporte

**Problemas comunes:**
- 🔐 Seguridad: Ver [SECURITY_GUIDELINES.md](../docs/SECURITY_GUIDELINES.md)
- 🤖 Desarrollo con IA: Ver [AI_WORKFLOW.md](../AI_WORKFLOW.md)
- 📝 Logs: Revisar `src/config/logger.ts`
- 🧪 Tests: Ejecutar `npm run test:coverage`

---

**Última actualización**: 10 de Febrero de 2026  
**Equipo**: CyberGuard  
**Próxima revisión**: Marzo 2026
