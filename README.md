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
- **Autenticación**: JWT (usuario hardcodeado)
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

### 1. Clonar el repositorio
```bash
git clone <repo-url>
cd cyberguard-system
```

### 2. Levantar infraestructura con Docker
```bash
docker-compose up -d
```

Esto levanta:
- RabbitMQ (puerto 5672, Management UI: 15672)

### 3. Acceder a RabbitMQ Management
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

### 4. Próximos pasos
- Implementar Backend (Producer)
- Implementar Worker (Consumer)
- Implementar Frontend (Angular Dashboard)

---

## 📁 Estructura del Proyecto

```
cyberguard-system/
├── frontend/          # Angular App (Pendiente)
├── backend/           # Node.js API Producer (Pendiente)
├── worker/            # Node.js Consumer (Pendiente)
├── docs/              # Documentación
│   └── SECURITY_GUIDELINES.md
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

Pendiente de implementación.

---

## 📊 Scripts Disponibles

**Raíz del proyecto:**
```bash
npm run docker:up       # Levantar RabbitMQ
npm run docker:down     # Detener RabbitMQ
npm run docker:logs     # Ver logs de RabbitMQ
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

**Última actualización**: [Fecha]
