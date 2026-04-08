# 📋 Plan de Pruebas del Sprint 2 — CyberGuard System

**Versión:** 1.0
**Fecha:** 8 de abril de 2026
**Responsable QA:** QA Senior Engineer
**Sprint:** Notificaciones, Perfil Administrativo, Gestión de Usuarios e Incidentes v2.0

---

## 1. Propósito del plan

Este plan define la estrategia de pruebas para el sprint enfocado en cuatro capacidades clave de negocio: autogestión del perfil del administrador, configuración de preferencias de notificación multicanal (email y WhatsApp), notificaciones en tiempo real dentro de la plataforma, gestión de usuarios del IRMS y creación de incidentes desde amenazas.

El objetivo principal de QA en este sprint es asegurar que el producto entregue valor de negocio confiable en funcionalidades de comunicación, personalización y gestión operativa, con un nivel de riesgo aceptable en integraciones con servicios externos (SendGrid, Twilio WhatsApp, RabbitMQ, Redis, WebSocket).

---

## 2. Objetivos de calidad del sprint

Durante este sprint, el equipo buscará asegurar que:

- el administrador pueda consultar y editar sus datos personales (username, email, teléfono);
- el teléfono se valide en formato E.164 y se persista correctamente;
- las preferencias de notificación (email y WhatsApp) puedan activarse/desactivarse y se persistan en Redis;
- las notificaciones en tiempo real lleguen al panel sin recargar la página;
- las notificaciones por email se envíen vía SendGrid con plantillas por categoría;
- las notificaciones por WhatsApp se envíen vía Twilio con reintentos y backoff exponencial;
- el fallo de un canal no bloquee la entrega por otros canales;
- un administrador pueda crear, modificar y desactivar/reactivar usuarios con auditoría;
- se puedan crear incidentes desde amenazas con severidad alta o crítica;
- los defectos de alto impacto sobre seguridad, comunicación y gestión operativa sean detectados tempranamente.

---

## 3. Alcance funcional del sprint

### 3.1 Épica: Notificaciones y Perfil (EP-01, EP-02, EP-03)

#### HU-01: Consultar y editar datos personales

Como administrador, quiero acceder a mis datos personales para consultarlos o modificarlos.

**Valor de negocio:** garantizar que la información del sistema sea precisa y actualizada.
**Riesgo de negocio:** medio.

#### HU-02: Registrar número telefónico y configurar preferencias de notificación

Como administrador, quiero agregar mi número telefónico y configurar qué canales de notificación deseo activar.

**Valor de negocio:** habilitar notificaciones externas y mantener datos de contacto completos.
**Riesgo de negocio:** alto.

#### HU-03: Recibir notificación automática en panel (tiempo real)

Como administrador, quiero que al llegar una nueva alerta el sistema me notifique automáticamente.

**Valor de negocio:** toma de decisiones temprana ante amenazas.
**Riesgo de negocio:** muy alto.

#### HU-04: Recibir notificaciones por email

Como administrador, quiero recibir notificaciones por email para enterarme aun sin estar conectado.

**Valor de negocio:** historial externo auditable y reacción temprana.
**Riesgo de negocio:** alto.

#### HU-05: Recibir notificaciones por WhatsApp

Como administrador en movilidad, quiero recibir notificaciones por WhatsApp.

**Valor de negocio:** inmediatez fuera de la plataforma.
**Riesgo de negocio:** alto.

### 3.2 Épica: Gestión de Usuarios (SPEC-001)

#### HU-008.1: Creación de Usuarios

Como administrador, quiero crear un nuevo usuario proporcionando nombre completo, email y rol.

**Valor de negocio:** dar acceso controlado a nuevos miembros del equipo.
**Riesgo de negocio:** alto.

#### HU-008.2: Modificación de Usuarios

Como administrador, quiero modificar el nombre completo y el rol de un usuario existente.

**Valor de negocio:** mantener información actualizada y ajustar permisos.
**Riesgo de negocio:** alto.

#### HU-008.3: Desactivación y Reactivación de Usuarios

Como administrador, quiero desactivar temporalmente una cuenta y reactivarla cuando sea necesario.

**Valor de negocio:** gestionar acceso de forma segura sin perder historial.
**Riesgo de negocio:** alto.

### 3.3 Épica: Creación de Incidentes (SPEC-002)

#### HU-001: Crear Incidente desde Amenaza

Como analista SOC o administrador, quiero crear un incidente a partir de una amenaza con severidad alta o crítica.

**Valor de negocio:** iniciar ciclo de respuesta formal con trazabilidad amenaza → incidente.
**Riesgo de negocio:** muy alto.

---

## 4. Fuera de alcance del sprint

- Filtrado de notificaciones por categoría;
- Silenciar notificaciones;
- Personalización de plantillas por parte del usuario;
- Pruebas formales de pentesting;
- Pruebas de carga a escala productiva;
- Validaciones avanzadas de accesibilidad WCAG;
- Certificación multi-navegador o multi-dispositivo;
- Hardening de infraestructura fuera de los criterios mínimos;
- Cambio de estados de incidentes (asignar, escalar, cerrar) — fuera de este sprint.

### 4.1 Supuestos y dependencias del sprint

- Las historias de usuario cuentan con criterios de aceptación definidos en Gherkin;
- Existe un ambiente Docker Compose funcional con los 6 servicios (postgres, redis, rabbitmq, backend, worker, frontend);
- Las credenciales de SendGrid y Twilio están configuradas en `.env`;
- Firebase Auth está operativo para autenticación;
- La spec SPEC-001 y SPEC-002 están aprobadas.

---

## 5. Enfoque de pruebas recomendado

### 5.1 Estrategia principal: pruebas basadas en riesgos

La estrategia dominante será **Risk-Based Testing**, priorizando los escenarios cuya falla pueda provocar:

- pérdida de notificaciones críticas (email/WhatsApp no llegan);
- datos de perfil corruptos o inconsistentes;
- acceso no autorizado a gestión de usuarios;
- creación de incidentes inválidos o duplicados;
- states de UI inconsistentes (botones que se quedan en "Guardando...");
- fallo silencioso sin feedback visual al usuario.

### 5.2 Estrategias complementarias

- **Model-Based Testing:** para flujos con estados claros (notificación: enviada/fallida/reintentar, usuario: activo/inactivo, incidente: open/closed);
- **Boundary Value Analysis:** para validaciones E.164, longitud de campos, severidad de amenazas;
- **Equivalence Partitioning:** para canales de notificación (habilitado/deshabilitado), roles (admin/no-admin), severidades;
- **Exploratory Testing:** para sincronización WebSocket, change detection Angular, estados de loading;
- **Integration Testing:** para cadena completa Producer → RabbitMQ → Worker → SendGrid/Twilio.

---

## 6. Priorización de riesgos del negocio

| Funcionalidad | Riesgo | Motivo de prioridad |
|---|---|---|
| Notificaciones en tiempo real (WebSocket) | Muy alto | Valor central: respuesta temprana ante amenazas |
| Notificaciones por email (SendGrid) | Alto | Canal de persistencia externa y auditoría |
| Notificaciones por WhatsApp (Twilio) | Alto | Canal de inmediatez en movilidad |
| Creación de incidentes | Muy alto | Inicia ciclo formal de respuesta ante amenazas |
| Gestión de usuarios (CRUD + desactivación) | Alto | Control de acceso y auditoría |
| Perfil personal y preferencias | Medio | Afecta habilitación de notificaciones |
| Change detection / estados de UI | Medio | UX — botones en estado incorrecto |

### Distribución sugerida del esfuerzo de testing

- Notificaciones multicanal (email + WhatsApp + WebSocket): **30%**
- Creación de incidentes: **20%**
- Gestión de usuarios: **20%**
- Perfil personal y preferencias: **15%**
- Integración y flujos E2E: **15%**

---

## 7. Niveles de prueba

### 7.1 Pruebas unitarias

**Objetivo:** validar reglas de negocio, validaciones y comportamientos aislados.

Priorizar:

- validación E.164 del teléfono;
- lógica de severidad para creación de incidentes (solo high/critical);
- prevención de auto-cambio de rol y auto-desactivación;
- lógica de retry con backoff exponencial en adaptadores de notificación;
- mapeo y transformación de DTOs/modelos.

**Cobertura esperada:**
- mínimo **85%** en lógica crítica de negocio;
- mínimo **70%** de cobertura general en módulos del sprint.

### 7.2 Pruebas de integración

**Objetivo:** validar que los flujos de negocio no se rompan entre componentes.

Priorizar:

- `Producer → PostgreSQL`: CRUD de perfil, usuarios, incidentes;
- `Producer → Redis`: guardado/lectura de preferencias de notificación;
- `Producer → RabbitMQ → Worker`: flujo de eventos de alerta;
- `Worker → Redis`: lectura de preferencias para despacho;
- `Worker → SendGrid`: envío de email;
- `Worker → Twilio`: envío de WhatsApp;
- `Frontend → Backend API`: autenticación, perfil, preferencias, amenazas, incidentes, usuarios.

### 7.3 Pruebas de sistema

**Objetivo:** validar comportamiento del producto como capacidad de negocio completa.

Escenarios prioritarios:

- un administrador edita su perfil y los cambios persisten;
- un administrador configura preferencias y recibe notificaciones por los canales activos;
- una alerta reportada genera notificación en tiempo real, por email y por WhatsApp;
- un administrador crea un usuario, lo modifica y lo desactiva con auditoría;
- un incidente se crea correctamente desde una amenaza alta/crítica;
- el fallo de SendGrid no impide la entrega por WhatsApp.

### 7.4 Pruebas end-to-end (E2E)

Flujos E2E sugeridos:

1. Login → Dashboard → Reportar Amenaza → Notificación WebSocket visible;
2. Configurar preferencias email/WhatsApp → Reportar Amenaza → Recibir email + WhatsApp;
3. Editar perfil (username, email, teléfono) → Guardar → Verificar persistencia;
4. Crear usuario → Modificar rol → Desactivar → Verificar auditoría;
5. Reportar amenaza high/critical → Crear incidente → Verificar en lista de incidentes;
6. Reportar amenaza low/medium → Verificar que botón "Crear Incidente" no aparece.

### 7.5 Matriz de cobertura por historia y nivel

| Historia | Unitarias | Integración | Sistema | E2E |
|---|---|---|---|---|
| HU-01 Perfil personal | validación E.164, hasChanges() | PATCH API, PostgreSQL | edición completa | editar perfil flujo completo |
| HU-02 Preferencias notificación | toggle enable/disable, form | PUT Redis, GET Redis | activar/desactivar canales | configurar + verificar |
| HU-03 Notificaciones tiempo real | — | Producer→RabbitMQ→Worker→WS | alerta visible sin recarga | reportar + ver en panel |
| HU-04 Email | retry/backoff, template render | Worker→SendGrid | envío exitoso + fallo | reportar + recibir email |
| HU-05 WhatsApp | retry/backoff, Twilio adapter | Worker→Twilio | envío exitoso + fallo | reportar + recibir WhatsApp |
| HU-008.1 Crear usuario | validación email, rol | POST API, PostgreSQL, audit | creación completa | crear desde UI |
| HU-008.2 Modificar usuario | auto-cambio rol prohibido | PUT API, audit_logs | modificación + auditoría | modificar desde UI |
| HU-008.3 Desactivar/Reactivar | auto-desactivación prohibida | PATCH API, reasignación | desactivar + reactivar | toggle desde UI |
| HU-001 Crear incidente | severidad only high/critical | POST API, threats FK | creación completa | crear desde alerta |

---

## 8. Tipos de prueba por funcionalidad

| Funcionalidad | Tipos de prueba recomendados |
|---|---|
| Perfil personal | funcionales, validación de datos, negativas, integración |
| Preferencias de notificación | funcionales, integración (Redis), states/change detection |
| Notificaciones WebSocket | funcionales, integración, sistema, resiliencia |
| Notificaciones email | funcionales, integración (SendGrid), resiliencia, retry |
| Notificaciones WhatsApp | funcionales, integración (Twilio), resiliencia, retry |
| Gestión de usuarios | funcionales, seguridad (roles), negativas, integración |
| Creación de incidentes | funcionales, negativas, seguridad, integración |

---

## 9. Técnicas de diseño de pruebas

### 9.1 Partición de equivalencias

| Flujo | Clases válidas | Clases inválidas |
|---|---|---|
| Perfil personal | username 3-50 chars, email válido, phone E.164 | username vacío, email mal formato, phone sin + |
| Preferencias | emailEnabled=true + email, whatsappEnabled=true + phone | canal activo sin dato de contacto |
| Crear usuario | email único, rol válido (5 roles), fullName presente | email duplicado, rol inexistente, fullName vacío |
| Crear incidente | amenaza severity=high/critical | severity=low/medium, threatId inexistente |
| Notificación email | SendGrid operativo, email verificado | SendGrid caído, email no verificado (403) |
| Notificación WhatsApp | Twilio operativo, phone E.164 | Twilio caído, phone inválido |

### 9.2 Análisis de valores frontera

| Regla | Casos frontera |
|---|---|
| Username min 3 chars | 2, 3, 4 caracteres |
| Username max 50 chars | 49, 50, 51 caracteres |
| Descripción amenaza min 10 chars | 9, 10, 11 caracteres |
| Descripción amenaza max 500 chars | 499, 500, 501 caracteres |
| Phone E.164 min 7 dígitos | +1234567 (7), +123456 (6) |
| Phone E.164 max 15 dígitos | +123456789012345 (15), +1234567890123456 (16) |
| Retry max 3 intentos | intento 2 (no max), intento 3 (max), intento 4 (no debe ocurrir) |

### 9.3 Pruebas basadas en estados

- **Notificación**: pendiente → enviando → exitosa / fallida → reintentando (max 3) → fallida definitiva;
- **Usuario**: activo → desactivado (incidentes reasignados) → reactivado;
- **Incidente**: sin incidente → open (creado) → closed → nuevo open permitido;
- **Botón guardar**: idle → guardando... → éxito/error → idle;
- **Canal notificación**: deshabilitado → habilitado con dato de contacto → recibiendo notificaciones.

### 9.4 Pruebas exploratorias

- Change detection Angular: ¿los signals/BehaviorSubjects actualizan la UI correctamente?
- WebSocket: ¿qué pasa al desconectar/reconectar?
- Concurrencia: ¿qué pasa si se edita perfil desde dos pestañas?
- Race conditions: ¿el botón "Guardar" se queda en loading si hay error de red?
- Degradación: ¿qué sucede si Redis no está disponible al guardar preferencias?

---

## 10. Pruebas funcionales prioritarias

### 10.1 Perfil personal
- Visualización correcta de datos personales;
- Edición exitosa de username, email y teléfono;
- Validación inline de formato E.164;
- Botón "Guardar" deshabilitado si no hay cambios o formulario inválido;
- Botón "Guardar" sale de estado "Guardando..." tras éxito o error;
- Mensaje de confirmación "Perfil actualizado correctamente" visible.

### 10.2 Preferencias de notificación
- Visualización de preferencias actuales desde Redis;
- Activar/desactivar canal email y WhatsApp;
- Campo de contacto se habilita/deshabilita según toggle;
- Guardado exitoso con feedback visual;
- Botón "Guardar" sale de estado "Guardando..." correctamente.

### 10.3 Notificaciones en tiempo real
- Alerta aparece en el panel sin recargar página;
- Historial se recupera al reconectar WebSocket;
- "Limpiar todo" elimina historial en Redis y UI.

### 10.4 Notificaciones externas
- Email llega con asunto y cuerpo según categoría;
- WhatsApp llega con contenido correcto;
- Fallo de email no bloquea WhatsApp;
- Reintentos automáticos con backoff exponencial;
- Si no hay dato de contacto, no se intenta envío.

### 10.5 Gestión de usuarios
- Creación exitosa con nombre, email y rol;
- Rechazo por email duplicado (409);
- Rechazo por rol inválido (400);
- Modificación de nombre y rol con auditoría;
- Prevención de auto-cambio de rol;
- Desactivación con reasignación de incidentes;
- Reactivación exitosa;
- Prevención de auto-desactivación.

### 10.6 Creación de incidentes
- Creación desde amenaza high/critical exitosa;
- Rechazo desde amenaza low/medium (422);
- Rechazo si ya existe incidente activo (409);
- Amenaza no encontrada (404);
- Reapertura permitida si incidente previo está cerrado.

---

## 11. Pruebas no funcionales prioritarias

### 11.1 Seguridad
- Solo admin puede acceder a gestión de usuarios;
- Endpoints protegidos por JWT;
- Credenciales de servicios externos solo en variables de entorno;
- No exposición de tokens en logs o respuestas.

### 11.2 Rendimiento ligero
- Latencia de notificación WebSocket: < 3 segundos;
- Guardado de perfil: < 500 ms;
- Guardado de preferencias: < 500 ms;
- Envío de email: < 5 segundos (incluyendo reintentos);
- Creación de incidente: < 1 segundo.

### 11.3 Resiliencia
- Si SendGrid falla, WhatsApp sigue funcionando;
- Si Twilio falla, email sigue funcionando;
- Si Redis no está disponible, el backend degrada con error controlado;
- Retry con backoff exponencial funciona correctamente (1s, 2s, 4s).

---

## 12. Ambiente y datos de prueba

### 12.1 Ambiente de ejecución

Docker Compose con 6 servicios:
- **postgres** (puerto 5432): base de datos principal;
- **redis** (puerto 6379): preferencias de notificación + historial WebSocket;
- **rabbitmq** (puertos 5672/15672): cola de eventos;
- **backend** (puerto 3000): API producer;
- **worker** (puerto 8081): consumidor RabbitMQ + notificaciones + WebSocket;
- **frontend** (puerto 4200): app Angular.

### 12.2 Datos de prueba mínimos

- Usuario admin autenticado con Firebase;
- Email verificado en SendGrid;
- Teléfono en formato E.164 con sandbox Twilio (join whatsapp-sandbox);
- Amenazas con severidades low, medium, high, critical;
- Usuarios con roles: admin, soc_analyst, incident_handler, incident_manager, ciso;
- Incidentes en estados: open, closed.

---

## 13. Criterios de entrada

- Specs SPEC-001 y SPEC-002 aprobadas;
- Requirement `notificaciones-y-perfil.md` completo;
- Docker Compose funcional con los 6 servicios healthy;
- Credenciales de SendGrid y Twilio configuradas;
- Frontend y backend compilando sin errores;
- Tests unitarios backend pasando (48/48 suites, 911/911 tests);
- Tests unitarios worker pasando (10/10 suites, 151/151 tests).

---

## 14. Criterios de salida

- Historias críticas cubiertas por pruebas funcionales y de riesgo;
- Flujos E2E críticos aprobados;
- 0 defectos abiertos de severidad bloqueante o crítica;
- Cobertura de lógica crítica ≥ 85%;
- Cobertura general ≥ 70%;
- Notificaciones email y WhatsApp verificadas en ambiente controlado;
- Evidencia de pruebas documentada.

---

## 15. Gestión de defectos

### 15.1 Severidad

| Severidad | Definición |
|---|---|
| Bloqueante | Impide continuar el flujo principal (ej: botón se queda en "Guardando..." sin recuperar) |
| Crítica | Notificaciones no se envían sin feedback de error |
| Mayor | Canal de notificación falla pero los otros funcionan |
| Menor | Impacto visual o de claridad, sin afectar funcionalidad core |

### 15.2 Priorización

Se priorizarán los defectos que:
- impidan la entrega de notificaciones críticas;
- dejen la UI en estado inconsistente;
- comprometan la gestión de usuarios/roles;
- permitan crear incidentes inválidos.

---

## 16. Riesgos del plan de pruebas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| SendGrid sender no verificado (403 Forbidden) | Email no funciona | Verificar sender en dashboard SendGrid antes de testing |
| Sandbox Twilio requiere opt-in del destinatario | WhatsApp no llega | Documentar paso de "join sandbox" en setup |
| Change detection Angular sin zone.js | UI no se actualiza | Asegurar uso de signals en todos los componentes |
| Race conditions en BehaviorSubject | Botón "Guardando" queda atascado | Usar `loading$.pipe(skip/take)` en lugar de comparación por referencia |
| Redis no disponible | Preferencias no se guardan | Health check de Redis antes de ejecutar suite |

---

## 17. Aprobaciones

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| QA Lead |  |  |  |
| Tech Lead |  |  |  |
| Product Owner |  |  |  |

---

> **Nota:** Este documento es vivo y puede ajustarse si cambian las prioridades del sprint, aparecen nuevos riesgos o el equipo redefine el alcance funcional.
