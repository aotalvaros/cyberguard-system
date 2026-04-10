# 🛡️ CyberGuard System

Sistema distribuido de ciberseguridad con detección de amenazas en tiempo real y gestión de respuesta a incidentes (IRMS). Construido con arquitectura hexagonal, comunicación asíncrona via RabbitMQ y ciclo completo de calidad automatizada.


---

## 🏗️ Arquitectura

**Patrón**: Monorepo con Hexagonal Architecture + Event-Driven Architecture

## 🚨 Notificaciones Multicanal y Personalización (Patrón Strategy)

El sistema implementa notificaciones automáticas por **email** (SendGrid) y **WhatsApp** (Meta/Twilio) para alertar al administrador ante nuevas amenazas.

- **Patrón Strategy:** Cada categoría de alerta (`malware`, `phishing`, `ddos`, `intrusion`, `other`) utiliza un template de asunto y cuerpo diferente, tanto para email como para WhatsApp. Esto permite mensajes personalizados y relevantes según el tipo de amenaza.
- **Implementación:**
  - Archivo: `backend/worker/src/infrastructure/notifications/CategoryTemplateStrategy.ts`
  - Usado por: `EmailAdapter` y `WhatsAppAdapter`.
  - Ejemplo de template:
    - `malware`: "CyberGuard: Malware Detectado" + detalles técnicos.
    - `phishing`: "CyberGuard: Intento de Phishing" + detalles.
  - El subject y body se interpolan dinámicamente con los datos de la alerta.
- **Extensible:** Agregar una nueva categoría solo requiere añadir un template en el strategy.

**Flujo de notificación:**
1. El Worker recibe una alerta desde RabbitMQ.
2. Consulta preferencias del usuario en Redis (`notif:prefs:<username>`).
3. Si el canal está habilitado, selecciona el template según la categoría y envía la notificación personalizada.
4. Todos los intentos y resultados quedan registrados en logs.

**Troubleshooting:**
- Si el email no llega, revisar que el remitente esté verificado en SendGrid y que la variable `SENDGRID_FROM_EMAIL` coincida.
- Si WhatsApp no llega, verificar que el número no haya bloqueado al remitente oficial (`+14155238886`) y que WhatsApp esté activo en el dispositivo.
- Los logs del worker muestran el resultado de cada intento de envío y el canal utilizado.

---

## 📝 Ejemplo de Templates por Categoría (Strategy)

```
malware:
  subject: 'CyberGuard: Malware Detectado'
  body: 'Se ha detectado actividad de malware en el sistema. Severidad: {{severity}}. IP origen: {{sourceIp}}. {{description}}.'
phishing:
  subject: 'CyberGuard: Intento de Phishing'
  body: 'Se ha detectado un intento de phishing. Severidad: {{severity}}. IP origen: {{sourceIp}}. {{description}}.'
...etc
```

El subject y body se interpolan automáticamente con los datos de la alerta recibida.

```
cyberguard-system/
├── frontend/
│   └── cyberguard-system-appv2/   # Angular 21 (app activa)
├── backend/
│   ├── producer/                  # Node.js API (Express + TypeScript)
│   └── worker/                    # Node.js Consumer (WebSocket)
├── docs/                          # Documentación técnica
├── .github/specs/                 # Specs ASDD aprobadas (IRMS)
└── docker-compose.yml             # 6 servicios orquestados
```

### Flujo de Datos
```
[Frontend] → [Backend API] → [RabbitMQ] → [Worker] → [WebSocket → Notificaciones]
                   ↓
             [PostgreSQL]
```


## 🚀 Stack Tecnológico

### Frontend
- **Framework**: Angular 21 (Standalone Components)
- **Arquitectura**: Hexagonal (core/domain, core/application, core/infrastructure, presentation)
- **UI Library**: Angular Material
- **State Management**: RxJS Observables
- **Testing**: Vitest (~52 specs)

### Backend (Producer)
- **Runtime**: Node.js 20+
- **Lenguaje**: TypeScript
- **Framework**: Express.js
- **Arquitectura**: Hexagonal (domain/ports, application/use-cases, infrastructure)
- **Validación**: Joi schemas
- **Base de Datos**: PostgreSQL 15 (persistencia principal)
- **Caché / Estado Worker**: Redis 7
- **Autenticación**: Firebase Auth + JWT
- **Mensajería**: amqplib (RabbitMQ)
- **Testing**: Jest 30 — **506 tests, 21 suites**

### Broker & Mensajería
- **Message Broker**: RabbitMQ 3.12
- **Management UI**: Puerto 15672
- **Patrón**: Producer (backend) → Queue → Consumer (worker)

### Base de Datos
- **Principal**: PostgreSQL 15 — schema `public` (usuarios, amenazas) + schema `irms` (incidentes, audit log)
- **Caché**: Redis 7 — estado del worker y WebSocket

### Infraestructura
- **Contenedores**: Docker Compose — 6 servicios
- **Frontend serving**: Nginx (producción)

---

## 📋 Prerequisitos

- Docker & Docker Compose
- Git

---

## 🔧 Instalación y Configuración

### Opción 1: Docker Compose (Recomendado) 🐳

#### 1. Clonar el repositorio
```bash
git clone <[repo-url](https://github.com/aotalvaros/cyberguard-system)>
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
cd frontend/cyberguard-system-appv2
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
├── frontend/
│   └── cyberguard-system-appv2/        # Angular 21 (app activa)
│       └── src/
│           ├── core/domain/            # Entidades, ports, servicios
│           ├── core/application/       # Use cases
│           ├── core/infrastructure/    # Repos, interceptors, mappers
│           └── presentation/          # Componentes, guards
├── backend/
│   ├── producer/                       # Express API (TypeScript)
│   │   └── src/
│   │       ├── domain/                 # Entidades, ports, value objects
│   │       ├── application/            # Use cases
│   │       └── infrastructure/        # Repos, controllers, providers
│   └── worker/                        # WebSocket consumer
├── docs/
│   ├── PRESENTACION_SUSTENTACION.md   # Guía de sustentación examen final
│   ├── EVIDENCIA_PRUEBAS.md           # Evidencia de cobertura y QA
│   ├── SECURITY_GUIDELINES.md
│   └── QA_EVIDENCE.md
├── .github/
│   └── specs/
│       ├── user-management.spec.md    # SPEC-001 APPROVED (HU-008)
│       └── create-incident.spec.md   # SPEC-002 APPROVED (HU-001)
├── docker-compose.yml
├── AI_WORKFLOW.md
└── README.md
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
cd frontend/cyberguard-system-appv2
npm start        # Servidor de desarrollo (puerto 4200)
npm test         # Ejecutar tests con Vitest
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

**Última actualización**: 7 de abril de 2026
