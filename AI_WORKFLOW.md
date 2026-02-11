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
- ✅ Angular 19+ para frontend
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
- ✅ Docker Compose orquestando 5 servicios:
  - RabbitMQ (broker de mensajes)
  - Redis (persistencia de historial)
  - Backend API (puerto 3000)
  - Worker (WebSocket puerto 8081)
  - Frontend (puerto 4200)
- ✅ Red compartida entre servicios
- ✅ Health checks para RabbitMQ y Redis
- ✅ Variables de entorno configurables
- ✅ Comando único para levantar todo: `docker compose up --build`
- **Responsable:** Cloud Architect & Backend Developer
- **Estado:** Sistema completamente containerizado y listo para producción

### Estado Actual: Operacional y Containerizado
- Backend listo para extensión
- Frontend con dashboard de administrador funcional
- Worker consumiendo RabbitMQ y emitiendo por WebSocket
- Redis persistiendo historial de alertas
- Sistema de notificaciones en tiempo real operativo
- **Todo el sistema dockerizado y orquestado con Docker Compose**
- **Despliegue con un solo comando: `docker compose up --build`**
- Arquitectura de microservicios preparada
- Documentación de seguridad implementada
- Workflow IA definido y operativo

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
- [docs/QA_EVIDENCE.md](docs/QA_EVIDENCE.md)

Incluye:
- Criterios de aceptacion validados
- Checklist de seguridad (segun [docs/SECURITY_GUIDELINES.md](docs/SECURITY_GUIDELINES.md))
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

**Última actualización**: Febrero 2026  
**Responsable**: Equipo CyberGuard (Cloud Architect & Backend Developer + Frontend Developer & QA Engineer)
