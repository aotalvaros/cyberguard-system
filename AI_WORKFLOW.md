# 🤖 AI Workflow - CyberGuard System

---

## 📋 Bitácora de Inicio del Proyecto

**Proyecto:** Sistema de Detección y Respuesta a Amenazas (CyberGuard)  
**Inicio:** Febrero 2026  
**Stack:** Node.js, TypeScript, RabbitMQ, Angular, Docker

### Fase de Inicialización

#### Commit 1️⃣: Scaffolding Base del Proyecto
- ✅ Estructura multiservicio: Backend, Frontend, Worker
- ✅ Configuración de TypeScript en backend
- ✅ Angular 21+ para frontend
- ✅ Docker Compose para orquestación local
- **Estado:** Proyecto monorepo listo para desarrollo

#### Commit 2️⃣: Definición de Arquitectura
- ✅ Patrón Event-Driven con RabbitMQ
- ✅ Microservicios: API Gateway, Threat Detector, Logger, Notifier
- ✅ Análisis de amenazas en tiempo real
- ✅ Comunicación asíncrona entre servicios
- **Estado:** Arquitectura documentada y validada

#### Commit 3️⃣: Implementación de Backend Base
- ✅ Servidor Express con TypeScript
- ✅ Controladores: Auth, Threat Management
- ✅ Middlewares: Autenticación, Protección contra Fuerza Bruta
- ✅ Servicio de almacenamiento de amenazas (In-Memory)
- **Estado:** API REST funcional con validación de seguridad

#### Commit 4️⃣: Configuración de Seguridad
- ✅ Variables de entorno para credenciales
- ✅ Middleware de autenticación JWT
- ✅ Rate limiting contra ataques de fuerza bruta
- ✅ Guía de seguridad obligatoria (SECURITY_GUIDELINES.md)
- **Estado:** Sistema hardened contra vulnerabilidades comunes

#### Commit 5️⃣: Testing e Integración
- ✅ Tests unitarios con Jest (auth, middlewares, servicios)
- ✅ Cobertura de casos críticos (validación, errores)
- ✅ Configuración de RabbitMQ
- **Estado:** Suite de tests implementada y ejecutándose

#### Commit 6️⃣: Frontend Funcional
- ✅ Módulo de autenticación (login/registro)
- ✅ Integración con API Backend
- ✅ Componentes Angular standalone
- ✅ Rutas configuradas
- **Estado:** UI básica en desarrollo

#### Commit 7️⃣: Establecimiento de Workflow IA  
- ✅ Este documento (AI_WORKFLOW.md) creado como guía obligatoria
- ✅ Metodología de "Prompting por Capas" definida
- ✅ Protocolos de validación QA establecidos
- ✅ Comentarios centinela (HUMAN CHECK) implementados
- **Estado:** Guía de desarrollo con IA lista para uso

#### Commit 8️⃣: Worker y Sistema de Notificaciones en Tiempo Real
- ✅ Worker Node.js implementado para consumir RabbitMQ
- ✅ WebSocket Server integrado en worker (puerto 8081)
- ✅ Persistencia de historial con Redis (máx 200 alertas)
- ✅ Cliente WebSocket en Angular con reconexión automática
- ✅ Dashboard de administrador con alertas en tiempo real
- ✅ Sincronización entre Redis y localStorage del navegador
- ✅ Funcionalidad de eliminación individual y limpieza masiva de alertas
- ✅ Deduplicación de mensajes con hash de contenido
- ✅ Detección de cambios optimizada con ChangeDetectorRef
- **Responsable:** Cloud Architect & Backend Developer
- **Estado:** Sistema de notificaciones completo y funcional

#### Commit 9️⃣: Dockerización Completa del Sistema
- ✅ Dockerfile para Backend (Producer)
- ✅ Dockerfile para Worker (Consumer + WebSocket)
- ✅ Dockerfile para Frontend (Angular + Nginx)
- ✅ Docker Compose orquestando 6 servicios:
  - RabbitMQ (broker de mensajes)
  - Redis (historial de alertas — Worker únicamente)
  - **PostgreSQL 15** (persistencia principal del Backend)
  - Backend API (puerto 3000)
  - Worker (WebSocket puerto 8081)
  - Frontend (puerto 4200)
- ✅ Red compartida entre servicios
- ✅ Health checks para RabbitMQ y Redis
- ✅ Variables de entorno configurables
- ✅ Comando único para levantar todo: `docker compose up --build`
- **Responsable:** Cloud Architect & Backend Developer
- **Estado:** Sistema completamente containerizado y listo para producción

#### Commit 🔟: Refactorización Frontend a Arquitectura Hexagonal (V2)
- ✅ Implementación completa de Arquitectura Hexagonal
- ✅ Separación en capas: Domain, Application, Infrastructure, Presentation
- ✅ 5 Patrones de Diseño implementados:
  - Strategy Pattern (validación dinámica por tipo de amenaza)
  - Factory Pattern (creación de estrategias)
  - Repository Pattern (abstracción de datos)
  - Observer Pattern (WebSocket + RxJS)
  - Facade Pattern (Use Cases)
- ✅ SOLID implementado al 100%:
  - SRP: Cada clase con una sola responsabilidad
  - OCP: Extensible sin modificar código existente
  - LSP: Implementaciones intercambiables
  - ISP: Interfaces específicas y cohesivas
  - DIP: Inversión de dependencias completa
- ✅ Domain Service con lógica de negocio pura
- ✅ Type Safety completo (0 usos de 'any')
- ✅ 10 archivos de tests unitarios
- ✅ Componente Report Threat con validación dinámica
- ✅ Documentación completa (DEBT_REPORT_FRONTEND_V2.md)
- **Responsable:** Frontend Developer & QA Engineer
- **Score:** 9.8/10 (mejora de +5.3 puntos desde V1)
- **Estado:** Frontend production-ready con arquitectura escalable

### Estado Actual: Operacional, Containerizado y Arquitectura Hexagonal (FE + BE)
- Backend hexagonal TypeScript — PostgreSQL como persistencia principal
- Firebase Auth como identity provider + JWT para sesiones
- Frontend V2 con arquitectura hexagonal (Angular 21, score 9.8/10)
- Worker consumiendo RabbitMQ y emitiendo por WebSocket
- Redis persistiendo historial de alertas (Worker únicamente)
- Sistema de notificaciones en tiempo real operativo
- **6 servicios dockerizados y orquestados con Docker Compose**
- **Despliegue con un solo comando: `docker compose up --build`**
- Arquitectura de microservicios preparada
- Documentación de seguridad implementada
- Workflow IA definido y operativo

#### Commit 🔟: Auditoría QA e Infraestructura de Testing
- ✅ Evaluación AI-First: 23.5/25 (EXCELENTE)
- ✅ Vitest + jsdom configurado, 6 archivos spec (783 líneas)
- ✅ Test setup: vitest.config.ts, test-setup.ts, test-demo.spec.ts
- ✅ FEEDBACK_TEAM-4-QA.md: Auditoría oficial con roadmap
- ✅ 17 Human Checks validados en código crítico
- ✅ Roadmap: 8 optimizaciones identificadas (11-18h)
- **Responsable:** Frontend Developer & QA Engineer
- **Estado:** Sistema listo para producción, testing 100% operativo

#### Commit 1️⃣1️⃣: Refactorización Backend a Arquitectura Hexagonal + PostgreSQL + Firebase Auth
- ✅ Migración completa de JavaScript a **TypeScript**
- ✅ Arquitectura Hexagonal: Domain / Application / Infrastructure
- ✅ Persistencia: In-Memory/Redis → **PostgreSQL 15** (usuarios, amenazas, audit_logs)
- ✅ Autenticación: JWT simple → **Firebase Auth** (identity provider) + JWT para sesiones
- ✅ Nuevos endpoints: `GET /api/threats`, `DELETE /api/threats/:id`, `GET /api/statistics`, `PATCH /api/admin/users/:username/role`
- ✅ Roles: `admin`, `analyst`, `viewer` gestionados en PostgreSQL
- ✅ Middleware `bruteForceDetection` explícito
- ✅ `AuditLogRepository` — trazabilidad completa de acciones
- ✅ `ServiceFactory` para inyección de dependencias
- ✅ Migración inicial: `backend/producer/migrations/001_initial_schema.sql`
- ✅ 21 suites de tests (~506 tests) — cobertura de todas las capas hexagonales
- ✅ Docker Compose actualizado: añade servicio `postgres` con health check
- **Responsable:** Cloud Architect & Backend Developer
- **Estado:** Backend production-ready con arquitectura hexagonal, persistencia ACID y autenticación enterprise

---

## Estrategia de Interacción con IA

### Metodología: Prompting por Capas

Implementamos un enfoque estructurado de **Prompting por Capas** donde cada interacción con IA sigue un flujo progresivo:

#### Capa 1: Contexto Arquitectónico
- Proporcionar a la IA el contexto completo del sistema distribuido
- Especificar patrones de microservicios y comunicación asíncrona
- Definir restricciones de seguridad y resiliencia desde el inicio

#### Capa 2: Especificación Funcional
- Detallar el caso de uso específico (ej: detector de amenazas, notificador)
- Incluir criterios de aceptación y casos edge
- Mencionar explícitamente requisitos no funcionales (performance, seguridad)

#### Capa 3: Validación Técnica
- Solicitar a la IA que explique su solución antes de generar código
- Pedir alternativas y trade-offs
- Validar que considere patrones de resiliencia (circuit breaker, retry, timeout)

#### Capa 4: Refinamiento Humano
- Aplicar **Human Checks** obligatorios en código crítico
- QA valida vulnerabilidades y malas prácticas
- Documentar decisiones donde se rechazó código de IA

---

## Interacciones Clave con IA

### 1. Diseño de Arquitectura
**Prompt Tipo:**
```
"Diseña la arquitectura de microservicios para un sistema de alertas de ciberseguridad.
Debe incluir: detector de amenazas, analizador de logs, notificador en tiempo real.
Usa RabbitMQ para comunicación asíncrona. Considera patrones de resiliencia y
escalabilidad. Explica tu decisión antes de dar código."
```

### 2. Implementación de Servicios
**Prompt Tipo:**
```
"Implementa el microservicio [NOMBRE] usando [TECNOLOGÍA].
Requisitos de seguridad: [LISTA].
Debe manejar fallos de RabbitMQ con reintentos exponenciales.
Incluye validación de entrada y sanitización.
Marca con comentarios las secciones que requieren Human Check."
```

### 3. Configuración de Infraestructura
**Prompt Tipo:**
```
"Crea la configuración de RabbitMQ con exchanges y queues para [CASO DE USO].
Usa variables de entorno para credenciales.
Implementa dead letter queues para mensajes fallidos.
Explica la topología antes de generar código."
```

### 4. Testing y Validación
**Prompt Tipo:**
```
"Genera tests de integración para [SERVICIO] que validen:
- Manejo de mensajes duplicados
- Comportamiento ante caída de RabbitMQ
- Validación de payloads maliciosos
Usa mocks apropiados y aserciones específicas."
```

### 5. Sistema de Notificaciones en Tiempo Real (Implementado)
**Prompt Real Usado:**
```
"Tengo un sistema donde el backend valida logins sospechosos y los encola en RabbitMQ.
Necesito:
1. Un worker que consuma de RabbitMQ y emita por WebSocket
2. Persistir historial en Redis (máx 200 alertas)
3. Cliente Angular que se suscriba al WebSocket
4. Sincronizar con localStorage para sobrevivir recargas
5. Deduplicación de mensajes
6. Botón para eliminar alertas individuales y limpiar todo

Problema detectado: Al recargar la página no se mostraban las alertas aunque
están en localStorage.

Solución aplicada: Cargar historial en el constructor del servicio antes de
que el componente se suscriba al BehaviorSubject."
```

**Resultado:**
- ✅ Worker funcional con Redis
- ✅ WebSocket con reconexión automática
- ✅ Dashboard con alertas persistentes
- ✅ Eliminación de alertas implementada

### 6. Dockerización Completa (Implementado)
**Prompt Real Usado:**
```
"Necesito Dockerfiles para:
1. Backend (Node.js + TypeScript)
2. Worker (Node.js + TypeScript)
3. Frontend (Angular + Nginx)

Luego actualiza el docker-compose.yml para levantar todo con un solo comando.
Incluye:
- Red compartida entre servicios
- Health checks para RabbitMQ y Redis
- Variables de entorno configurables
- Dependencias entre servicios

Documenta todo en README.md y AI_WORKFLOW.md"
```

**Resultado:**
- ✅ 3 Dockerfiles creados (backend, worker, frontend)
- ✅ Docker Compose con 5 servicios orquestados
- ✅ Sistema completo levanta con: `docker compose up --build`
- ✅ Documentación actualizada

### 7. Refactorización Frontend a Arquitectura Hexagonal (Implementado)
**Prompt Real Usado:**
```
"Refactorizar frontend (score 4.5/10) a arquitectura hexagonal para 9.8/10.

Implementa:
1. Arquitectura Hexagonal (Domain, Application, Infrastructure, Presentation)
2. 5 Patrones: Strategy, Factory, Repository, Observer, Facade
3. SOLID al 100%
4. Type Safety completo (eliminar 'any')
5. Domain Service con lógica de negocio
6. Tests unitarios completos
7. Componente Report Threat con validación dinámica
"
```

**Resultado:**
- ✅ Arquitectura Hexagonal completa
- ✅ 5 patrones de diseño
- ✅ SOLID 10/10
- ✅ Type Safety 10/10
- ✅ 10 archivos de tests
- ✅ Score: 9.8/10 (+5.3 puntos)
- ✅ DEBT_REPORT_FRONTEND_V2.md creado

---

## Documentos Clave y Contextualización

### Documentos que SIEMPRE se proporcionan a la IA:

1. **README.md** - Visión general del sistema
2. **SECURITY_GUIDELINES.md** - Checklist de seguridad obligatorio
3. **Este archivo (AI_WORKFLOW.md)** - Para mantener consistencia

### Contexto Mínimo por Interacción:
```
"Contexto: Sistema distribuido de alertas de ciberseguridad.
Stack: [Node.js/Python/Java], RabbitMQ, Docker.
Patrón actual: Event-driven con CQRS.
Restricción: Código debe pasar validación de seguridad del QA."
```

---

## Dinámicas de Interacción

### 🔄 Ciclo de Desarrollo con IA

```
1. Developer escribe prompt siguiendo "Prompting por Capas"
   ↓
2. IA genera solución + explicación
   ↓
3. Developer aplica "Human Check" en código crítico
   ↓
4. QA Engineer valida:
   - Vulnerabilidades (OWASP Top 10)
   - Malas prácticas (hardcoded secrets, SQL injection)
   - Resiliencia (manejo de errores, timeouts)
   ↓
5. Si falla QA → Rechazar y documentar en "Anti-Pattern Log"
   ↓
6. Si pasa QA → Code Review por par
   ↓
7. Merge a develop siguiendo Git Flow
```

### 🛡️ Protocolo de Validación QA

El QA Engineer debe verificar en CADA Pull Request:

- [ ] **Secrets Management**: No hay credenciales hardcodeadas
- [ ] **Input Validation**: Todos los inputs externos están validados
- [ ] **Error Handling**: Try-catch apropiados, no se exponen stack traces
- [ ] **Resilience Patterns**: Implementa retry, circuit breaker o timeout
- [ ] **Logging**: No se loguean datos sensibles
- [ ] **Dependencies**: No hay paquetes con vulnerabilidades conocidas
- [ ] **Human Checks**: Existen comentarios `// ⚠️ HUMAN CHECK:` en lógica crítica

### Evidencia QA
El QA Engineer debe registrar evidencias de ejecucion y hallazgos en:
- [docs/qa/QA_EVIDENCE.md](docs/qa/QA_EVIDENCE.md)

Incluye:
- Criterios de aceptacion validados
- Checklist de seguridad (segun [docs/security/SECURITY_GUIDELINES.md](docs/security/SECURITY_GUIDELINES.md))
- Pruebas de estres con metricas
- Bugs encontrados y solucion aplicada
- Capturas y adjuntos en [docs/images](docs/images)

### 📝 Comentarios Centinela Obligatorios

En cada bloque de lógica compleja, agregar:

```javascript
// ⚠️ HUMAN CHECK:
// [Descripción de qué sugirió la IA]
// [Por qué se modificó o validó manualmente]
// [Consideraciones que la IA no tuvo en cuenta]
```

**Ubicaciones obligatorias:**
1. Configuración de conexiones (DB, RabbitMQ)
2. Lógica de reintentos y circuit breakers
3. Validación y sanitización de inputs
4. Manejo de errores críticos
5. Procesamiento de datos sensibles

---

## 🐞 Log de Bugs (Simulado)

**Nota:** Casos simulados para entrenamiento QA y documentacion.

1) **Exposicion de stack trace**
- Hallazgo: Error 500 respondia `error.stack` al cliente.
- Riesgo: Filtracion de rutas internas y detalles de librerias.
- Solucion: Middleware retorna mensaje generico y loguea solo `error.message`.

2) **CORS permisivo**
- Hallazgo: `origin: '*'` en CORS.
- Riesgo: Consumo desde origenes no confiables.
- Solucion: `ALLOWED_ORIGINS` en env y lista controlada.

3) **JWT sin expiracion**
- Hallazgo: `jwt.sign(payload, secret)` sin `expiresIn`.
- Riesgo: Sesiones indefinidas.
- Solucion: `expiresIn: '15m'` + refresh token.

---

## Herramientas IA Utilizadas

- **Editor Principal**: [Cursor/Windsurf/Otro]
- **Asistente de Código**: GitHub Copilot / Amazon Q
- **Validación de Seguridad**: [Herramienta específica]
- **Generación de Tests**: [Herramienta específica]

---

## Métricas de Éxito

- **Cobertura de Tests**: > 80%

## Cambios Recientes (automatizados)

- 2026-03-01: Añadida prueba de integración `alerts.integration.spec.ts` para `Alerts` (WebSocket in-memory, eliminación y limpieza) en el frontend V2.
- 2026-03-01: Añadido `TDD.md` en `frontend/cyberguard-system-appv2/docs/` documentando la estrategia TDD aplicada y la clasificación de pruebas (unitarias vs integración).
- 2026-03-01: Añadida referencia funcional en `frontend/cyberguard-system-appv2/docs/README.md` para la feature de notificacion omnicanal.
- 2026-03-27: Diagrama C4 reorganizado con subgrupos visuales por modulos existentes/nuevos dentro de cada zona (Frontend, Backend, Worker), flechas discretas y agrupacion de infraestructura y externos en zonas separadas para mayor legibilidad operacional.
- **Human Checks Documentados**: Mínimo 5 por microservicio
- **Vulnerabilidades Detectadas por QA**: 0 en producción
- **Anti-Patterns Documentados**: Mínimo 2 en README.md
- **Code Reviews Aprobados**: 100% con aprobación de par

---

## Evolución del Workflow

Este documento es **vivo** y debe actualizarse cuando:
- Se descubra un nuevo anti-pattern
- Se identifique una mejora en el prompting
- El QA encuentre un patrón recurrente de error de IA
- Se adopte una nueva herramienta o práctica

### Cambios recientes (14 Feb 2026 — 27 Feb 2026)
- **Worker v1.4.0 (20 Feb 2026)**: actualizaciones en `backend/worker` — corrección Redis, mejoras en roles y endpoint admin, README actualizado.
- **Threat Statistics / Analytics (23-25 Feb 2026)**: nueva feature `GET /api/statistics` en backend; ciclo TDD completo, pruebas de integración y cobertura real reportada (25 Feb 2026). Artefactos OpenSpec para `threat-statistics-dashboard` (creado 2026-02-23) y componente `statistics-widget` en frontend.
- **Dashboard & UX**: integración de widget de estadísticas en frontend V2; sincronización con backend de analytics; componentes presentacionales añadidos bajo `presentation/components/dashboard/statistics-widget/`.
- **Testing y QA**: estrategia de tests actualizada (suite completa reportada el 25 Feb 2026), TDD reforzado para nuevas features y eliminación de exclusiones de cobertura.
- **Prácticas y Paradigmas**: adopción más estricta de feature-by-feature (feature flags), TDD como política, y mayor exigencia de `Human Checks` en lógica crítica.
- **Documentación y Análisis**: análisis de deuda y sesiones de corrección (sesión 20 Feb 2026) con acciones en roles, endpoints administrativos y fixes menores. Creación del documento de impacto arquitectónico para la feature de estadísticas (`docs/architecture/ARCHITECTURAL_IMPACT_ANALYTICS.md`).

**Última actualización**: 06 Abr 2026 (Includes: Backend hexagonal migration docs + docs/ restructuring sync)  
**Responsable**: Equipo CyberGuard (Cloud Architect & Backend Developer + Frontend Developer & QA Engineer)

---

### [AI_WORKFLOW.md](file:///home/jhonathan-aparicio/Escritorio/cyberguard-system/AI_WORKFLOW.md)

Registrar ajuste de diagramas según la nueva iniciativa funcional.
