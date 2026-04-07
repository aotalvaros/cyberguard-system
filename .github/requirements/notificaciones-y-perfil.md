# Proyecto: Cyberguard System — Notificaciones y Gestión de Perfil

**Autor:** Jhonathan Samuel Aparicio Lindarte  
**Estado:** ✅ Implementado  
**Fecha de diseño:** 2026-04-07  
**Última actualización:** 2026-04-07 (ajustado con implementación real)

> **Nota de actualización:** Este documento fue ajustado post-implementación para reflejar el estado real del código en la rama `epic/sprint-01/features`. Las secciones técnicas describen lo que fue efectivamente construido, no lo que estaba planeado.

---

## Iniciativa

> "Necesitamos que el administrador siempre esté al tanto de las alertas que vayan llegando."

---

## 1. Introducción y Objetivos

### 1.1 Problema actual

El personal encargado del sistema puede estar concentrado en otras tareas alineadas a su rol, por lo que no siempre estará pendiente de lo que sucede en la plataforma en tiempo real.

### 1.2 Solución implementada

El sistema envía notificaciones al personal interesado personalizando el contenido según la categoría de la alerta, permitiendo percibir más rápidamente el tipo de evento reportado. Se implementaron tres canales:

- **WebSocket** — notificaciones en tiempo real dentro de la plataforma
- **Email** — notificaciones externas vía SendGrid con plantillas por categoría
- **WhatsApp** — notificaciones externas vía WhatsApp Business API (Meta Graph)

Adicionalmente, se habilitó la autogestión del perfil y las preferencias de notificación del administrador, incluyendo email de contacto, número de teléfono y habilitación/deshabilitación por canal.

### 1.3 Valor de negocio

Al ser un sistema basado en el reporte de riesgos, los atributos de calidad prioritarios son **seguridad**, **fiabilidad** y **disponibilidad**. Esta implementación entrega:

- Respuestas más tempranas ante alertas críticas
- Reducción de errores humanos por falta de atención al panel
- Historial auditable por canal externo: si el sistema cae, el administrador conserva los registros en su correo o en la app de WhatsApp
- Tolerancia a fallos por canal: el fallo de email no bloquea WhatsApp y viceversa

### 1.4 Glosario de términos

| Término | Definición |
|---------|-----------|
| **Sistema** | Plataforma tecnológica para el registro, gestión y notificación de alertas de seguridad. |
| **Administrador** | Persona autenticada con capacidad de recibir, crear y gestionar alertas. En este documento también aplica a cualquier rol del IRMS que tenga preferencias configuradas. |
| **Seguridad** | Medidas para proteger información y recursos frente a accesos no autorizados. |
| **Disponibilidad** | Capacidad del sistema de estar operativo y accesible para usuarios autorizados. |
| **Fiabilidad** | Grado en que el sistema realiza sus funciones de forma constante y precisa. |
| **Notificación** | Mensaje automático enviado cuando se registra una nueva alerta. |
| **Alerta** | Evento que puede poner en riesgo la seguridad, integridad o disponibilidad de los recursos. |
| **Categoría** | Clasificación de la alerta: `malware`, `phishing`, `ddos`, `intrusion`, `other`. Determina la plantilla de notificación. |
| **Preferencias de notificación** | Configuración por usuario que indica si desea recibir email, WhatsApp, y los datos de contacto. Persistidas en Redis. |
| **Logs** | Mensajes del sistema para trazabilidad interna de casos exitosos y fallidos. Implementado con `pino` (logger estructurado). |
| **Producer** | Punto de entrada del sistema. Recibe alertas, las persiste en PostgreSQL y las publica en RabbitMQ. Expone también los endpoints de perfil y preferencias. |
| **Worker** | Motor que consume mensajes de RabbitMQ, los transmite por WebSocket al frontend y dispara notificaciones externas (email + WhatsApp). |
| **Frontend** | Interfaz Angular donde el administrador ve alertas en vivo, gestiona su perfil y configura sus preferencias de notificación. |
| **Backend** | Sistema central con arquitectura hexagonal donde se ejecuta la lógica de negocio. |
| **API** | Conjunto de contratos REST (y WebSocket) para comunicación entre frontend, producer y worker. |

---

## 2. Especificaciones Funcionales — Historias de Usuario

### EP-01 · Gestión de datos personales y contacto

#### HU-01: Consultar y editar datos personales ✅ Implementado

```
Como:    Administrador autenticado
Quiero:  Acceder a mis datos personales para consultarlos o modificarlos
Para:    Garantizar que la información del sistema sea precisa y actualizada

Estimación T-Shirt: S
Estado: IMPLEMENTADO
```

**Endpoints implementados:**

| Método | Ruta | Use Case |
|--------|------|----------|
| `GET` | `/api/profile` | `GetAdminProfileUseCase` |
| `PATCH` | `/api/profile` | `UpdateAdminProfileUseCase` |

**Criterios de Aceptación:**

```gherkin
Feature: Gestión de perfil personal

  Scenario: Visualización exitosa del perfil
    Given un administrador autenticado con JWT válido
    When hace GET /api/profile
    Then el sistema retorna HTTP 200 con { username, email, role, fullName, createdAt }

  Scenario: Edición exitosa de datos de perfil
    Given un administrador autenticado
    When hace PATCH /api/profile con { "email": "nuevo@ejemplo.com", "fullName": "Juan Pérez" }
    Then el sistema valida y persiste los nuevos datos en PostgreSQL
    And retorna HTTP 200 con { message: "Perfil actualizado correctamente" }

  Scenario: Intento de guardado con email inválido
    Given un administrador autenticado
    When hace PATCH /api/profile con { "email": "no-es-un-email" }
    Then el sistema retorna HTTP 400 con mensaje de validación
    And no persiste cambios en la base de datos
```

---

#### HU-02: Registrar datos de contacto para notificaciones ✅ Implementado

```
Como:    Administrador
Quiero:  Configurar mi email y teléfono de contacto, y activar/desactivar canales
Para:    Habilitar notificaciones externas según mi disponibilidad

Estimación T-Shirt: S
Estado: IMPLEMENTADO
Nota: la implementación fue más amplia que lo diseñado — incluye también los flags
      emailEnabled / whatsappEnabled (que estaban marcados como fuera del alcance).
```

**Endpoints implementados:**

| Método | Ruta | Use Case |
|--------|------|----------|
| `GET` | `/api/profile/notification-preferences` | `GetNotificationPreferencesUseCase` |
| `PUT` | `/api/profile/notification-preferences` | `SaveNotificationPreferencesUseCase` |

**Persistencia:** Redis — clave `notif:prefs:<username>`. No en PostgreSQL.

**Estructura de preferencias:**

```typescript
interface NotificationPreferences {
  username: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  email: string;
  phone: string;
}
```

**Criterios de Aceptación:**

```gherkin
Feature: Configuración de preferencias de notificación

  Scenario: Consulta de preferencias existentes
    Given un administrador autenticado con preferencias previas configuradas
    When hace GET /api/profile/notification-preferences
    Then el sistema retorna HTTP 200 con { emailEnabled, whatsappEnabled, email, phone }

  Scenario: Consulta de preferencias sin configuración previa
    Given un administrador que nunca ha configurado preferencias
    When hace GET /api/profile/notification-preferences
    Then el sistema retorna defaults: { emailEnabled: false, whatsappEnabled: false, email: "", phone: "" }

  Scenario: Activación exitosa del canal email
    Given un administrador autenticado
    When hace PUT /api/profile/notification-preferences con { "emailEnabled": true, "email": "admin@ejemplo.com" }
    Then el sistema persiste las preferencias en Redis
    And retorna HTTP 200 con { message: "Notification preferences updated successfully" }

  Scenario: Guardado de número telefónico válido
    Given un administrador en edición de preferencias
    When hace PUT con { "whatsappEnabled": true, "phone": "+573001234567" }
    Then el sistema almacena el número
    And el cambio se refleja al consultar de nuevo las preferencias
```

---

### EP-02 · Notificación en tiempo real dentro de la plataforma

#### HU-03: Recibir notificación automática en panel ✅ Implementado

```
Como:    Administrador con sesión activa
Quiero:  Ver notificaciones automáticas cuando llega una nueva alerta
Para:    Tomar decisiones tempranas sin depender de canales externos

Estimación T-Shirt: M
Estado: IMPLEMENTADO
```

**Implementación:** Worker expone un servidor WebSocket (`ws://`) en puerto configurable. Cuando RabbitMQ entrega un mensaje al Worker, este hace broadcast a todos los clientes conectados. Al reconectar, el cliente recibe el historial almacenado en Redis.

**Capacidades implementadas del WebSocket:**

| Mensaje cliente → servidor | Efecto |
|---|---|
| `{ type: "clear-all" }` | Borra historial en Redis + broadcast confirmación |
| `{ type: "delete-one", id: "<uuid>" }` | Elimina ítem del historial + broadcast confirmación |

**Criterios de Aceptación:**

```gherkin
Feature: Notificaciones en tiempo real en la plataforma

  Scenario: Recepción de nueva alerta en panel
    Given un administrador con conexión WebSocket activa
    When se registra una nueva alerta con type="malware" y severity="critical"
    Then el panel recibe el mensaje sin recargar la página
    And el payload contiene { eventId, type, severity, sourceIp, description, receivedAt }

  Scenario: Historial al reconectar
    Given un administrador que se reconecta al WebSocket
    When el servidor establece la conexión
    Then el sistema envía todos los eventos almacenados en Redis al cliente recién conectado

  Scenario: Borrado del panel por el administrador
    Given un administrador con notificaciones en el panel
    When envía { type: "clear-all" } por WebSocket
    Then el servidor borra el historial en Redis
    And broadcast { type: "clear-all", clearedAt: "..." } a todos los clientes conectados
```

---

### EP-03 · Notificación externa multicanal

#### HU-04: Recibir notificaciones por email ✅ Implementado

```
Como:    Administrador
Quiero:  Recibir notificaciones por email cuando llegue una alerta
Para:    Enterarme incluso cuando no esté conectado y conservar historial auditable

Estimación T-Shirt: M
Estado: IMPLEMENTADO
```

**Implementación:** `EmailAdapter` usa SendGrid (`@sendgrid/mail`). Aplica el patrón Strategy para seleccionar plantilla según categoría. Implementa retry con backoff exponencial (máx. 3 intentos, tope 30 s).

**Plantillas por categoría (Strategy):**

| Categoría | Asunto |
|-----------|--------|
| `malware` | 🚨 CyberGuard: Malware Detectado |
| `phishing` | ⚠️ CyberGuard: Intento de Phishing |
| `ddos` | 🔥 CyberGuard: Ataque DDoS en Curso |
| `intrusion` | 🛑 CyberGuard: Intrusión Detectada |
| `other` | ⚡ CyberGuard: Alerta de Seguridad |

**Criterios de Aceptación:**

```gherkin
Feature: Notificaciones externas por email

  Scenario: Envío exitoso de notificación por email
    Given un administrador con emailEnabled=true y email válido en preferencias
    When el Worker procesa una nueva alerta con type="malware"
    Then el EmailAdapter envía un email con asunto "🚨 CyberGuard: Malware Detectado"
    And el cuerpo incluye severity, sourceIp y description interpolados
    And el sistema registra en logs: "Email sent successfully" con eventId y attempt

  Scenario: Reintento automático ante fallo transitorio
    Given el servicio SendGrid retorna error en el primer intento
    When el EmailAdapter detecta el fallo
    Then reintenta con backoff exponencial (1s, 2s, 4s...)
    And si el segundo intento es exitoso retorna { status: "success", attempts: 2 }

  Scenario: Agotamiento de reintentos
    Given SendGrid falla en los 3 intentos configurados
    When el EmailAdapter agota los reintentos
    Then retorna { canal: "email", status: "error", attempts: 3, error: "<mensaje>" }
    And el sistema registra el fallo sin lanzar excepción no controlada

  Scenario: Falla de email no bloquea WhatsApp
    Given emailEnabled=true y whatsappEnabled=true
    And el servicio de email no está disponible
    When el NotificationOrchestrator ejecuta dispatch()
    Then el canal WhatsApp se ejecuta de forma independiente con Promise.allSettled
    And el fallo de email queda registrado en logs
    And el resultado de WhatsApp no se ve afectado
```

---

#### HU-05: Recibir notificaciones por WhatsApp ✅ Implementado

```
Como:    Administrador en movilidad
Quiero:  Recibir notificaciones por WhatsApp cuando llegue una alerta
Para:    Enterarme de riesgos de forma inmediata fuera de la plataforma

Estimación T-Shirt: L
Estado: IMPLEMENTADO
Dependencia: HU-02 para el dato de phone en preferencias
```

**Implementación:** `WhatsAppAdapter` usa WhatsApp Business API (Meta Graph API v18.0 via `axios`). Reutiliza el mismo sistema de plantillas por categoría que email. Retry con backoff exponencial (máx. 3 intentos).

**Criterios de Aceptación:**

```gherkin
Feature: Notificaciones externas por WhatsApp

  Scenario: Envío exitoso de mensaje WhatsApp
    Given un administrador con whatsappEnabled=true y phone="+573001234567"
    When el Worker procesa una nueva alerta
    Then el WhatsAppAdapter hace POST a graph.facebook.com/v18.0/<phoneNumberId>/messages
    And el mensaje contiene el asunto + cuerpo interpolado con los datos de la alerta
    And el sistema registra en logs: "WhatsApp message sent successfully"

  Scenario: No se envía si no hay teléfono configurado
    Given un administrador con whatsappEnabled=true pero phone=""
    When el NotificationOrchestrator ejecuta dispatch()
    Then no se encola tarea de WhatsApp
    And no se genera ningún log de intento

  Scenario: Reintento automático ante fallo
    Given la API de Meta retorna error 500 en el primer intento
    When el WhatsAppAdapter detecta el fallo
    Then reintenta hasta 3 veces con backoff exponencial
    And si todos fallan retorna { canal: "whatsapp", status: "error", attempts: 3 }
```

---

## 3. Validación INVEST por historia

| Historia | I | N | V | E | S | T | Observación |
|----------|---|---|---|---|---|---|-------------|
| HU-01 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Independiente: perfil básico en PostgreSQL |
| HU-02 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Desplegable en iteración separada. Persistida en Redis |
| HU-03 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Valor inmediato; historial en Redis |
| HU-04 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Canal acotado a SendGrid + retry |
| HU-05 | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | Depende de HU-02 para el campo `phone` |

---

## 4. Alcance de la feature

### 4.1 Dentro del alcance — Implementado

- ✅ El administrador gestiona sus datos personales (`fullName`, `email`) vía `PATCH /api/profile`
- ✅ El administrador configura su `email` y `phone` de contacto en preferencias de notificación
- ✅ El administrador activa o desactiva cada canal (`emailEnabled`, `whatsappEnabled`) ← *ampliado respecto al diseño original*
- ✅ El administrador recibe notificaciones en tiempo real en el panel vía WebSocket
- ✅ El administrador recibe notificaciones por email con plantilla según categoría de alerta
- ✅ El administrador recibe notificaciones por WhatsApp con el mismo contenido

### 4.2 Fuera del alcance — No implementado

- ❌ Filtrado de notificaciones por categoría
- ❌ Silenciar notificaciones temporalmente
- ❌ Personalización de plantillas por el usuario
- ❌ Desactivar notificaciones de otro usuario
- ❌ Persistencia de notificaciones como entidad independiente en base de datos (solo historial en Redis)

### 4.3 Nota de implementación — Ajuste de alcance

El diseño original marcaba como *fuera del alcance* la capacidad del administrador de decidir si recibir o no notificaciones por canal. La implementación incluyó esta capacidad a través de `emailEnabled` / `whatsappEnabled` en `NotificationPreferences` ya que resultó necesaria para garantizar la regla de negocio "no enviar si el canal no está habilitado". Este ajuste es positivo y no rompe ninguna restricción del negocio.

---

## 5. Modelo de negocio

### 5.1 Entidades principales implementadas

| Entidad | Persistencia | Archivo |
|---------|-------------|---------|
| `User` (Administrador) | PostgreSQL — tabla `users` | `PostgresUserRepository.ts` |
| `Threat` (Alerta) | PostgreSQL — tabla `threats` | `PostgresThreatRepository.ts` |
| `NotificationPreferences` | Redis — clave `notif:prefs:<username>` | `RedisNotificationPreferencesRepository.ts` |

> Las notificaciones **no son una entidad persistida**. Son eventos transitorios: se envían y se registran solo en logs.

### 5.2 Relaciones

```
Usuario (1) ─────────────── (1) NotificationPreferences
Usuario (1) ─────────────── (N) Threats
Threat  (1) ──── dispara ──────── NotificationOrchestrator
                                        ├── EmailAdapter (si emailEnabled + email)
                                        └── WhatsAppAdapter (si whatsappEnabled + phone)
```

---

## 6. Reglas de negocio

| # | Regla | Estado |
|---|-------|--------|
| RN-1 | Toda alerta debe tener una categoría obligatoria | ✅ Validado — `ThreatClassifier.ts` + schema Joi |
| RN-2 | Las notificaciones se envían solo si el canal está habilitado y el contacto está configurado | ✅ `NotificationOrchestrator.dispatch()` valida `prefs.emailEnabled && prefs.email` |
| RN-3 | El fallo de un canal no afecta al otro | ✅ `Promise.allSettled()` con `.catch()` independiente por canal |
| RN-4 | Todo intento de envío queda registrado en logs | ✅ `logger.info` en éxito, `logger.warn` en cada reintento, `logger.error` en agotamiento |
| RN-5 | Las notificaciones deben contener: fecha, categoría y descripción | ✅ `NotifPayload` incluye `receivedAt`, `type`, `severity`, `description` |
| RN-6 | Ninguna alerta debe perderse | ✅ RabbitMQ con `durable: true` en la cola; Redis como buffer de historial WebSocket |
| RN-7 | Si un envío falla, el sistema reintenta | ✅ Backoff exponencial 3 intentos en `EmailAdapter` y `WhatsAppAdapter` |

---

## 7. Consideraciones arquitectónicas

### 7.1 Impacto en arquitectura

| Capa | Impacto | Detalle |
|------|---------|---------|
| **Producer** | Alto | Nuevos endpoints: `GET/PATCH /api/profile`, `GET/PUT /api/profile/notification-preferences`. Nuevos use cases: `GetAdminProfileUseCase`, `UpdateAdminProfileUseCase`, `GetNotificationPreferencesUseCase`, `SaveNotificationPreferencesUseCase`. |
| **Worker** | Muy alto | Nueva carpeta `notifications/` con 4 archivos: `EmailAdapter`, `WhatsAppAdapter`, `NotificationOrchestrator`, `CategoryTemplateStrategy`. Integración con SendGrid y WhatsApp Business API. |
| **WebSocket** | Alto | `websocket.ts` en Worker: servidor `ws://` dedicado. Broadcast de nuevas alertas + historial Redis por reconexión. |
| **Persistencia** | Medio | PostgreSQL: columna `full_name` e `is_active` agregadas a `users` (SPEC-001). Redis: preferencias de notificación por usuario. |
| **Frontend** | Alto | `ProfileComponent` (formulario reactivo, validaciones E.164, skeleton, toasts) + `NotificationPreferencesComponent` + `AlertsComponent` (WebSocket). Navegación habilitada desde el sidebar (`Perfil Personal` → `/profile`). Completamente implementado. |

### 7.2 Patrones de diseño implementados

#### Observer (Worker)
El Worker actúa como observador de la cola RabbitMQ. Cuando el Producer publica una alerta, el Worker la consume y desencadena el flujo de notificaciones sin que el Producer tenga ningún conocimiento de ello. Esto permitió añadir los canales de email y WhatsApp sin tocar el Producer.

```
Producer → RabbitMQ → Worker → NotificationOrchestrator
                             └──→ WebSocket broadcast
```

#### Adapter (EmailAdapter + WhatsAppAdapter)
Ambos adapters implementan el contrato `INotificationService`:

```typescript
interface INotificationService {
  send(payload: NotifPayload): Promise<NotifResult>;
}
```

Esto desacopla el `NotificationOrchestrator` de SendGrid y de la API de Meta. En el futuro, cambiar el proveedor de email o pasar de WhatsApp a Telegram solo requiere implementar `INotificationService` sin tocar el orquestador.

#### Strategy (CategoryTemplateStrategy)
`selectTemplate(type: string)` selecciona dinámicamente la plantilla de email/WhatsApp según la categoría de la alerta. `renderTemplate()` interpola las variables `{{severity}}`, `{{sourceIp}}`, `{{description}}`. Añadir una nueva categoría es tan simple como agregar una entrada al mapa `TEMPLATES`.

---

## 8. Estimación de historias de usuario

**Técnica:** T-Shirt Sizing

| Historia de Usuario | Estimación | Estado |
|--------------------|------------|--------|
| HU-01: Consultar y editar datos personales | S | ✅ Implementado |
| HU-02: Registrar datos de contacto para notificaciones | S | ✅ Implementado |
| HU-03: Notificaciones en tiempo real (WebSocket) | M | ✅ Implementado |
| HU-04: Notificaciones externas por email | M | ✅ Implementado |
| HU-05: Notificaciones externas por WhatsApp | L | ✅ Implementado |

---

## 9. Requerimientos no funcionales

### 9.1 Seguridad
- ✅ Solo usuarios autenticados acceden a los endpoints de perfil y preferencias (`authMiddleware`)
- ✅ JWT firmado con secreto en variable de entorno; validado en cada request
- ✅ Credenciales de SendGrid y WhatsApp en variables de entorno (`SENDGRID_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`)
- ✅ Sanitización de input en el Worker (`sanitizeString` en `handler.ts`)

### 9.2 Rendimiento
- 🎯 Registrar una alerta < 2 segundos — cumplido: el Producer solo escribe en PostgreSQL + publica en RabbitMQ; el procesamiento de notificaciones es asíncrono en el Worker
- 🎯 Notificación WebSocket < 3 segundos — cumplido: el broadcast ocurre inmediatamente tras procesar el mensaje RabbitMQ

### 9.3 Disponibilidad
- ✅ Si SendGrid no está disponible, el sistema sigue funcionando (el Worker no falla; registra el error)
- ✅ Si WhatsApp API no responde, el sistema sigue funcionando (independencia por canal)
- ✅ Si Redis no está disponible, `getPreferences()` retorna `null` (defaults) sin lanzar excepción

### 9.4 Fiabilidad
- ✅ RabbitMQ con `durable: true` — ninguna alerta se pierde si el Worker reinicia
- ✅ Redis como buffer de historial — los clientes WebSocket reciben eventos pasados al reconectar
- ✅ Retry con backoff exponencial (3 intentos, tope 30s) en email y WhatsApp

### 9.5 Logs
- ✅ `pino` como logger estructurado en Producer y Worker
- ✅ Trazabilidad por `eventId` desde publicación hasta resultado de cada canal
- ✅ Niveles: `info` (envío exitoso), `warn` (reintento), `error` (fallo definitivo)

### 9.6 Integraciones
- ✅ Email: SendGrid (`@sendgrid/mail`) — desacoplado por `INotificationService`
- ✅ WhatsApp: Meta Graph API v18.0 (`axios`) — desacoplado por `INotificationService`
- ✅ Fallo de cualquier integración externa no propaga excepción al flujo principal

### 9.7 Escalabilidad
- ✅ Agregar un nuevo canal (ej. Telegram, SMS) requiere solo implementar `INotificationService` y registrarlo en el orquestador
- ✅ Agregar una nueva categoría de alerta requiere solo una entrada en el mapa `TEMPLATES`
- ✅ Arquitectura Producer/Worker desacoplada: escalar el Worker es independiente del Producer

### 9.8 Usabilidad
- El frontend consume los endpoints REST del Producer para perfil y preferencias
- Las notificaciones WebSocket llevan toda la información necesaria en un solo payload para renderizado inmediato

---

## 10. Inventario de archivos implementados

### Backend — Producer

```
src/application/use-cases/
├── GetAdminProfileUseCase.ts
├── UpdateAdminProfileUseCase.ts
├── GetNotificationPreferencesUseCase.ts
└── SaveNotificationPreferencesUseCase.ts

src/domain/entities/
└── NotificationPreferences.ts

src/domain/ports/
└── NotificationPreferencesRepository.ts

src/infrastructure/http/controllers/
├── profile.controller.ts               ← GET/PATCH /api/profile
└── profile-notifications.controller.ts ← GET/PUT /api/profile/notification-preferences

src/infrastructure/http/validators/
├── updateProfile.schema.ts
└── saveNotifPreferences.schema.ts

src/infrastructure/persistence/
└── RedisNotificationPreferencesRepository.ts
```

### Backend — Worker

```
src/notifications/
├── notification.types.ts          ← Contratos: NotifPayload, NotifResult, INotificationService
├── notification.orchestrator.ts   ← Patrón Adapter: dispatch paralelo con Promise.allSettled
├── email.adapter.ts               ← SendGrid + retry backoff exponencial
├── whatsapp.adapter.ts            ← Meta Graph API + retry backoff exponencial
└── category-template.strategy.ts ← Patrón Strategy: 5 plantillas por categoría

src/websocket.ts                   ← Patrón Observer: WebSocket server + historial Redis
```

---

## 11. Diagramas

> Los diagramas C4, de secuencia y de componentes del diseño original aplican directamente a la implementación. Se recomienda actualizarlos con los archivos reales citados en la sección 10.

**Flujo de notificación implementado (resumen):**

```
[Admin] ──POST /api/threats──► [Producer]
                                    │
                               PostgreSQL
                                    │
                              RabbitMQ Queue
                                    │
                               [Worker]
                               /    |    \
                          WS bcast Email WhatsApp
                          (Redis) (SG)  (Meta)
```

**Flujo de preferencias:**

```
[Admin] ──PUT /api/profile/notification-preferences──► [Producer] ──► Redis
[Admin] ──GET /api/profile/notification-preferences──► [Producer] ◄── Redis
         [Worker] ──► GET prefs from Redis ──► dispatch() con prefs
```
