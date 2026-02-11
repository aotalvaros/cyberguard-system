# 🛡️ CyberGuard System

Sistema distribuido de alertas de ciberseguridad en tiempo real con arquitectura de microservicios y comunicación asíncrona.

## 👥 Equipo

| Rol | Responsabilidades |
|-----|-------------------|
| **Cloud Architect & Backend Developer** | Infraestructura, Backend API, RabbitMQ, Workers, Despliegue |
| **Frontend Developer & QA Engineer** | Angular UI, Validación de seguridad, Testing, Code Review |

---

## 🏗️ Arquitectura

**Patrón**: Monorepo con Event-Driven Architecture

```
cyberguard-system/
├── frontend/          # Angular App
├── backend/           # Node.js API (Producer)
├── worker/            # Node.js Consumer
├── docs/              # Documentación técnica
└── docker-compose.yml # RabbitMQ
```

### Flujo de Datos
```
[Frontend] → [Backend API] → [RabbitMQ] → [Worker] → [Notificaciones]
```

---

## 🚀 Stack Tecnológico

### Frontend
- **Framework**: Angular 17+
- **UI Library**: Angular Material
- **State Management**: RxJS
- **HTTP Client**: Angular HttpClient

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Validación**: Joi
- **Autenticación**: JWT (usuario en variables de entorno)
- **Cliente RabbitMQ**: amqplib

### Broker
- **Message Broker**: RabbitMQ 3.12+
- **Management UI**: Puerto 15672

---

## 📋 Prerequisitos

- Docker & Docker Compose
- Git

---

## 🔧 Instalación y Configuración

### Opción 1: Docker Compose (Recomendado) 🐳

#### 1. Clonar el repositorio
```bash
git clone <repo-url>
cd cyberguard-system
```

#### 2. Configurar variables de entorno (opcional)
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

#### 3. Levantar todo el sistema con un solo comando
```bash
docker compose up --build
```

Esto levanta:
- **RabbitMQ** (puerto 5672, Management UI: 15672)
- **Redis** (puerto 6379)
- **Backend API** (puerto 3000)
- **Worker** (WebSocket puerto 8081)
- **Frontend** (puerto 4200)

#### 4. Acceder a la aplicación
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **Credenciales por defecto**: admin / cyberguard2024

#### 5. Detener el sistema
```bash
docker compose down
```

#### 6. Limpiar volúmenes (eliminar datos persistentes)
```bash
docker compose down -v
```

---

### Opción 2: Desarrollo Local

#### 1. Clonar el repositorio
```bash
git clone <https://github.com/aotalvaros/cyberguard-system>
cd cyberguard-system
```

#### 2. Levantar infraestructura con Docker
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name cyberguard-redis -p 6379:6379 redis:7-alpine
```

#### 3. Configurar y levantar Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

#### 4. Configurar y levantar Worker
```bash
cd backend/worker
npm install
npm start
```

#### 5. Configurar y levantar Frontend
```bash
cd frontend/cyberguard-system
npm install
npm start
```

#### 6. Acceder a servicios
- **Frontend**: http://localhost:4200
- **Backend**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

---

## 📁 Estructura del Proyecto

```
cyberguard-system/
├── frontend/          # Angular App
├── backend/           # Node.js API Producer
├── worker/            # Node.js Consumer
├── docs/              # Documentación
│   ├── SECURITY_GUIDELINES.md
│   ├── QA_EVIDENCE.md
│   └── images/
├── docker-compose.yml # RabbitMQ
├── AI_WORKFLOW.md     # Estrategia de trabajo con IA
├── README.md
└── package.json
```

---

## 🔄 Git Flow

### Branches
- `main` - Producción
- `develop` - Desarrollo
- `feature/*` - Nuevas funcionalidades
- `fix/*` - Correcciones
- `hotfix/*` - Fixes urgentes en producción

### Workflow
```bash
# Crear feature
git checkout develop
git checkout -b feature/alert-detector

# Commits
git add .
git commit -m "feat(backend): add threat detection endpoint"

# Push y PR
git push origin feature/alert-detector
# Crear PR a develop en GitHub
```

### Convenciones de Commits
```
feat(scope): descripción
fix(scope): descripción
docs(scope): descripción
test(scope): descripción
refactor(scope): descripción
```

---

## 🧪 Testing
### Backend (Producer)
```bash
cd backend/producer
npm test
```

### Frontend (Angular)
```bash
cd frontend/cyberguard-system
npm test
```

### QA Evidencias
- Registro formal de QA: [docs/QA_EVIDENCE.md](docs/QA_EVIDENCE.md)
- Criterios de aceptacion, seguridad y estres documentados por QA
- Capturas y adjuntos en [docs/images](docs/images)

---

## 📊 Scripts Disponibles

**Raíz del proyecto (Docker Compose):**
```bash
docker compose up --build    # Levantar todo el sistema
docker compose up -d         # Levantar en background
docker compose down          # Detener servicios
docker compose down -v       # Detener y eliminar volúmenes
docker compose logs -f       # Ver logs en tiempo real
docker compose ps            # Ver estado de servicios
```

**Backend:**
```bash
cd backend
npm run dev      # Modo desarrollo
npm test         # Ejecutar tests
```

**Worker:**
```bash
cd backend/worker
npm start        # Iniciar worker
```

**Frontend:**
```bash
cd frontend/cyberguard-system
npm start        # Servidor de desarrollo
npm test         # Ejecutar tests
npm run build    # Build de producción
```

---

## 🛡️ Seguridad

- ✅ Variables de entorno para credenciales
- ✅ Validación de inputs con Joi/Zod
- ✅ Sanitización de datos
- ✅ Rate limiting en API
- ✅ CORS configurado
- ✅ Helmet.js para headers de seguridad
- ✅ JWT para autenticación
- ✅ Logs sin datos sensibles

---

## 🧪 QA: Criterios, Seguridad y Estres

### Criterios de Aceptacion (resumen)
- Login: respuestas 200/400/401 segun payload y credenciales
- Threats: POST protegido con JWT y validacion Joi
- WebSocket: entrega de alertas en tiempo real y limpieza

### Checklist de Seguridad
- Basado en [docs/SECURITY_GUIDELINES.md](docs/SECURITY_GUIDELINES.md)
- Validado en cada PR por QA

### Pruebas de Estres (ejemplo)
```bash
npx autocannon -c 50 -d 30 -p 10 http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -b '{"username":"admin","password":"cyberguard2024"}'
```

Evidencia completa en [docs/QA_EVIDENCE.md](docs/QA_EVIDENCE.md)

---

## ⚠️ Lo que la IA hizo mal (Anti-Pattern Log)

### 1. Credenciales Hardcodeadas
**Lo que sugirió la IA:**
```javascript
const connection = await amqp.connect('amqp://guest:guest@localhost:5672');
```

**Por qué lo rechazamos:**
Expone credenciales en el código fuente. Violación de seguridad crítica.

**Solución implementada:**
```javascript
// ⚠️ HUMAN CHECK:
// La IA quería hardcodear las credenciales de RabbitMQ.
// Implementamos variables de entorno y validación al inicio.
const connection = await amqp.connect(process.env.RABBITMQ_URL);
if (!process.env.RABBITMQ_URL) {
  throw new Error('RABBITMQ_URL no configurada');
}
```

### 2. Reintentos Infinitos sin Backoff
**Lo que sugirió la IA:**
```javascript
async function processMessage(msg) {
  try {
    await handler(msg);
  } catch (error) {
    await processMessage(msg); // Retry inmediato infinito
  }
}
```

**Por qué lo rechazamos:**
Puede saturar el sistema con reintentos inmediatos. No considera fallos permanentes.

**Solución implementada:**
```javascript
// ⚠️ HUMAN CHECK:
// La IA implementó reintentos infinitos sin backoff exponencial.
// Agregamos límite de reintentos y dead letter queue para mensajes fallidos.
async function processMessage(msg, retryCount = 0) {
  const MAX_RETRIES = 3;
  try {
    await handler(msg);
    channel.ack(msg);
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // Backoff exponencial
      setTimeout(() => processMessage(msg, retryCount + 1), delay);
    } else {
      channel.nack(msg, false, false); // Enviar a DLQ
    }
  }
}
```

---

## 🐞 Bugs Simulados y Soluciones (QA)

### Bug 1: Respuesta 500 expone stack trace
**Impacto:** Filtra detalles internos al cliente.

**Solucion:** Middleware de errores retorna mensaje generico y loguea de forma segura.

### Bug 2: CORS abierto con '*'
**Impacto:** Riesgo de consumo desde origenes no confiables.

**Solucion:** `ALLOWED_ORIGINS` en variables de entorno y lista explicita.

### Bug 3: JWT sin expiracion
**Impacto:** Sesiones indefinidas si el token se filtra.

**Solucion:** Expiracion corta + refresh token.


---

## 📝 Comentarios Centinela (Human Checks)

Durante la implementación, agregar comentarios `// ⚠️ HUMAN CHECK:` en:
1. Configuración de conexión a RabbitMQ
2. Lógica de reintentos en workers
3. Validación y sanitización de inputs
4. Manejo de errores críticos
5. Generación de tokens JWT

---

## 🤝 Contribución

1. Leer [AI_WORKFLOW.md](./AI_WORKFLOW.md)
2. Crear branch desde `develop`
3. Implementar con Human Checks en código crítico
4. Ejecutar tests y linter
5. Crear PR con descripción detallada
6. Esperar aprobación de QA + Code Review
7. Merge a `develop`

---

## 📚 Documentación Adicional

- [AI_WORKFLOW.md](./AI_WORKFLOW.md) - Estrategia de trabajo con IA
- [docs/SECURITY_GUIDELINES.md](./docs/SECURITY_GUIDELINES.md) - Checklist de seguridad

---

## 📞 Contacto

**Equipo CyberGuard**
- Cloud Architect & Backend: [Nombre]
- Frontend & QA: [Nombre]

---

**Última actualización**: 11 de febrero de 2026
