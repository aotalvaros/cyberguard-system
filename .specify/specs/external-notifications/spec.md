# Spec: External Notifications
**Feature ID:** `external-notifications`
**Epic:** EP-03 — Notificaciones externas por Canal
**Versión:** 1.0.0
**Fecha:** 06 Abr 2026
**Estimación:** L
**Estado:** `ready`

---

## 1. Contexto

Una vez que la alerta llega al Worker (vía RabbitMQ), el sistema DEBE notificar
al administrador por canales externos **email** y **WhatsApp** si el administrador
ha activado esos canales en su perfil.

El flujo extiende la cadena ya implementada en EP-02:

```
POST /api/threats (JWT)
  └─ BackendProducer → RabbitMQ (exchange: cyberguard.events)
       └─ Worker (consumer)
            ├─ Redis (historial)  → WebSocket :8081  → Dashboard  [EP-02 ✅]
            └─ [EP-03 NUEVO]
                ├─ consultarPreferencias(username) → Redis → {email, phone, channels}
                ├─ CategoryTemplateStrategy.select(type) → contenido por categoría
                ├─ EmailAdapter.send()    → SendGrid API     (si email activado)
                └─ WhatsAppAdapter.send() → WA Business API  (si whatsapp activado)
```

**Tolerancia a fallos por canal** (regla crítica de negocio):
- Si un canal falla, el otro DEBE intentarse de forma independiente.
- El fallo de un canal NO interrumpe el broadcast WebSocket ni el otro canal.
- Los resultados (éxito / error) se registran en Redis para trazabilidad.

---

## 2. Historias de Usuario

| ID | Historia | Estimación |
|----|----------|-----------|
| HU-04 | Como administrador quiero recibir notificaciones automáticas por email y WhatsApp cuando se registre una nueva amenaza, para poder actuar rápidamente y que el contenido incluya la categoría de la amenaza para priorizar mi respuesta. | M |
| HU-05 | Como administrador quiero configurar mis preferencias de canal (activar/desactivar email y WhatsApp) y mis datos de contacto (dirección de correo y número de teléfono), para controlar cómo y dónde recibo las alertas críticas del sistema. | M |

---

## 3. Análisis de Gaps — Estado Actual vs. Requerido

### Worker (`backend/worker/`)

| Componente | Estado actual | Brecha |
|-----------|--------------|--------|
| `INotificationService` (port) | ❌ No existe | Crear interfaz con `send(payload: NotifPayload): Promise<NotifResult>` |
| `EmailAdapter` | ❌ No existe | Crear usando SendGrid SDK + exponential backoff |
| `WhatsAppAdapter` | ❌ No existe | Crear usando WA Business API (HTTP) + exponential backoff |
| `CategoryTemplateStrategy` | ❌ No existe | Crear estrategia de selección de plantilla por `type` |
| `NotificationOrchestrator` | ❌ No existe | Orquestar canales, independencia de fallos, log resultado |
| `handler.ts` | ✅ Existe — solo limpia/valida | Añadir dispatch a `NotificationOrchestrator` tras broadcast |
| `config.ts` | ✅ Tiene Redis/RabbitMQ | Añadir `SENDGRID_API_KEY`, `WA_TOKEN`, `WA_PHONE_NUMBER_ID` |

### Backend API (`backend/producer/`)

| Componente | Estado actual | Brecha |
|-----------|--------------|--------|
| `NotificationPreferencesRepository` (port) | ❌ No existe | Crear port abstracto |
| `RedisNotificationPreferencesRepository` | ❌ No existe | Implementar con Redis: `key = notif:prefs:{username}` |
| `GetNotificationPreferencesUseCase` | ❌ No existe | Crear use case |
| `SaveNotificationPreferencesUseCase` | ❌ No existe | Crear use case |
| `ProfileController` | ❌ No existe | Crear: `GET /api/profile/notification-preferences`, `PUT /api/profile/notification-preferences` |
| `ServiceFactory` | ✅ Existe | Registrar nuevos use cases y repository |
| `server.ts` | ✅ Existe | Registrar router `/api/profile` |

### Frontend (`frontend/cyberguard-system-appv2/`)

| Componente | Estado actual | Brecha |
|-----------|--------------|--------|
| `NotificationPreferencesRepository` (port) | ❌ No existe | Crear port abstracto HTTP |
| `HttpNotificationPreferencesRepository` | ❌ No existe | Crear HTTP adapter |
| `GetNotificationPreferencesUseCase` | ❌ No existe | Crear use case |
| `SaveNotificationPreferencesUseCase` | ❌ No existe | Crear use case |
| `NotificationPreferencesComponent` | ❌ No existe | Crear standalone component (formulario reactivo) |
| `ProfileComponent` | ⚠️ Existe/Pendiente EP-01 | Incluir `NotificationPreferencesComponent` |
| `app.config.ts` | ✅ Existe | Registrar provider del nuevo repository |

---

## 4. Requerimientos Funcionales

### 4.1 Worker — Envío de notificaciones externas

| ID | Capa | Requerimiento |
|----|------|---------------|
| R-WK-07 | Domain | El Worker SHALL definir el port `INotificationService` con método `send(payload: NotifPayload): Promise<NotifResult>`. |
| R-WK-08 | Infrastructure | `EmailAdapter` SHALL enviar el mensaje usando SendGrid SDK con credenciales desde la variable de entorno `SENDGRID_API_KEY`. |
| R-WK-09 | Infrastructure | `WhatsAppAdapter` SHALL enviar el mensaje vía WhatsApp Business API (HTTPS) con `WA_TOKEN` y `WA_PHONE_NUMBER_ID` desde env vars. |
| R-WK-10 | Infrastructure | Ambos adapters SHALL implementar reintento con backoff exponencial: `min(1000 × 2^n, 30000)ms`, máximo 3 reintentos. |
| R-WK-11 | Infrastructure | `CategoryTemplateStrategy` SHALL seleccionar el contenido/asunto del mensaje según `threat.type` (`malware`, `phishing`, `ddos`, `intrusion`, `other`). |
| R-WK-12 | Infrastructure | `NotificationOrchestrator` SHALL consultar las preferencias del admin en Redis antes de despachar. |
| R-WK-13 | Infrastructure | `NotificationOrchestrator` SHALL despachar Email y WhatsApp de forma independiente: el fallo de un canal NO bloquea el otro. |
| R-WK-14 | Infrastructure | `NotificationOrchestrator` SHALL registrar el resultado de cada canal en Redis (`key = notif:log:{eventId}:{canal}`, TTL 7 días). |
| R-WK-15 | Infrastructure | El dispatch de notificaciones externas SHALL ocurrir DESPUÉS del broadcast WebSocket, en paralelo y sin bloquear el ACK de RabbitMQ. |

### 4.2 Backend API — Gestión de preferencias

| ID | Capa | Requerimiento |
|----|------|---------------|
| R-BE-01 | Infrastructure | `GET /api/profile/notification-preferences` SHALL devolver las preferencias del usuario autenticado (extraído del JWT). |
| R-BE-02 | Infrastructure | `PUT /api/profile/notification-preferences` SHALL validar el body con Joi y persistir en Redis (`key = notif:prefs:{username}`). |
| R-BE-03 | Infrastructure | Ambos endpoints SHALL requerir JWT válido (`authMiddleware`). |
| R-BE-04 | Domain | `NotificationPreferences` SHALL incluir: `emailEnabled: boolean`, `whatsappEnabled: boolean`, `email: string`, `phone: string`. |
| R-BE-05 | Infrastructure | `email` SHALL ser un email válido si `emailEnabled = true`. |
| R-BE-06 | Infrastructure | `phone` SHALL ser un número E.164 (`+` seguido de 10-15 dígitos) si `whatsappEnabled = true`. |
| R-BE-07 | Application | Si no existen preferencias guardadas, `GET` SHALL devolver defaults: `emailEnabled: false`, `whatsappEnabled: false`, `email: ''`, `phone: ''`. |

### 4.3 Frontend — Formulario de preferencias

| ID | Capa | Requerimiento |
|----|------|---------------|
| R-FE-16 | Presentation | `NotificationPreferencesComponent` SHALL mostrar toggles para activar/desactivar email y WhatsApp. |
| R-FE-17 | Presentation | Los campos de email y teléfono SHALL habilitarse/deshabilitarse dinámicamente según el toggle correspondiente. |
| R-FE-18 | Presentation | El botón "Guardar" SHALL estar deshabilitado mientras `loading$` sea `true` (§8.2 constitución). |
| R-FE-19 | Application | `SaveNotificationPreferencesUseCase` SHALL invocar `PUT /api/profile/notification-preferences` con el body validado. |
| R-FE-20 | Application | `GetNotificationPreferencesUseCase` SHALL invocar `GET /api/profile/notification-preferences` al montar el componente. |
| R-FE-21 | Presentation | El componente SHALL mostrar feedback de éxito tras guardar (`snackbar` / `mensaje inline`). |
| R-FE-22 | Presentation | El componente SHALL mostrar errores inline si la validación del backend falla (§4.4 constitución). |
| R-FE-23 | Presentation | Solo el rol `admin` SHALL ver el componente `NotificationPreferencesComponent`. |

---

## 5. Requerimientos No Funcionales

| ID | Requerimiento |
|----|---------------|
| R-NF-06 | Las credenciales `SENDGRID_API_KEY`, `WA_TOKEN`, `WA_PHONE_NUMBER_ID` SHALL almacenarse en variables de entorno. NUNCA hardcodeadas (§6.1 constitución). |
| R-NF-07 | El envío de notificaciones externas NO SHALL bloquear el ACK de RabbitMQ ni el broadcast WebSocket. |
| R-NF-08 | El Worker SHALL loguear con Winston el resultado de cada intento de envío (canal, estado, reintentos usados). |
| R-NF-09 | La cobertura de tests en Worker SHALL ser ≥ 80% para los nuevos módulos (`EmailAdapter`, `WhatsAppAdapter`, `CategoryTemplateStrategy`, `NotificationOrchestrator`). |
| R-NF-10 | La cobertura de tests en Backend SHALL ser ≥ 90% para los nuevos use cases y controller. |
| R-NF-11 | La cobertura de tests en Frontend SHALL ser ≥ 80% para `NotificationPreferencesComponent` y use cases. |
| R-NF-12 | El Worker SHALL validar que las variables de entorno requeridas estén presentes al arrancar; advertir (no fallar) si no están (consistente con `config.ts` actual). |

---

## 6. Contratos de API

### `GET /api/profile/notification-preferences`

**Auth:** `Bearer <JWT>` (cualquier usuario autenticado)

**Response 200:**
```json
{
  "emailEnabled": false,
  "whatsappEnabled": true,
  "email": "",
  "phone": "+573001234567"
}
```

**Response 401:** JWT inválido o ausente.

---

### `PUT /api/profile/notification-preferences`

**Auth:** `Bearer <JWT>`

**Body (Joi):**
```json
{
  "emailEnabled": true,
  "whatsappEnabled": false,
  "email": "admin@cyberguard.com",
  "phone": ""
}
```

**Validación:**
- `emailEnabled`: `boolean`, requerido
- `whatsappEnabled`: `boolean`, requerido
- `email`: `string`, requerido si `emailEnabled = true`, formato email
- `phone`: `string`, requerido si `whatsappEnabled = true`, patrón `^\+[1-9]\d{9,14}$`

**Response 200:**
```json
{ "message": "Notification preferences updated successfully" }
```

**Response 400:** Error de validación Joi con mensaje descriptivo.
**Response 401:** JWT inválido o ausente.

---

## 7. Escenarios BDD

### Feature: Envío de notificaciones externas (HU-04)

```gherkin
Scenario: Administrador recibe email al registrarse nueva amenaza
  Given el worker recibe un evento de amenaza tipo "malware" con severidad "critical"
  And las preferencias del admin tienen emailEnabled=true y email="admin@cyberguard.com"
  When el NotificationOrchestrator procesa el evento
  Then se invoca EmailAdapter con la plantilla de "malware"
  And el resultado del envío se registra en Redis con estado "success"

Scenario: Fallo de email no impide envío por WhatsApp
  Given el worker recibe un evento de amenaza
  And las preferencias del admin tienen emailEnabled=true y whatsappEnabled=true
  When el EmailAdapter lanza un error tras 3 reintentos
  Then el WhatsAppAdapter igualmente intenta el envío
  And el log de Redis registra "error" para email y el resultado real para whatsapp

Scenario: Plantilla varía según categoría de amenaza
  Given un evento de tipo "phishing"
  When CategoryTemplateStrategy.select("phishing") es invocado
  Then retorna el asunto y cuerpo específicos para "phishing"
  And el asunto es diferente al de tipo "malware"

Scenario: Worker NO envía notificación si ambos canales están desactivados
  Given las preferencias del admin tienen emailEnabled=false y whatsappEnabled=false
  When el NotificationOrchestrator procesa un evento de amenaza
  Then ni EmailAdapter ni WhatsAppAdapter son invocados
```

### Feature: Configuración de preferencias de notificación (HU-05)

```gherkin
Scenario: Administrador activa notificaciones por email
  Given un administrador autenticado en la sección de perfil
  When activa el toggle "Notificaciones por Email" e ingresa "admin@cyberguard.com"
  And hace clic en "Guardar"
  Then se invoca PUT /api/profile/notification-preferences con emailEnabled=true
  And el formulario muestra mensaje de confirmación "Preferencias guardadas"

Scenario: Guardar con email activado pero campo vacío falla validación
  Given el toggle "Notificaciones por Email" está activo
  And el campo de email está vacío
  When el administrador hace clic en "Guardar"
  Then el botón "Guardar" está deshabilitado por validación Reactive Form
  And se muestra el error "Correo requerido cuando la notificación está activa"

Scenario: Cargar preferencias al abrir el componente
  Given el administrador tiene preferencias guardadas (whatsappEnabled=true, phone="+573001234567")
  When el componente NotificationPreferencesComponent se monta
  Then los toggles y campos reflejan los valores almacenados en el backend

Scenario: Campo teléfono deshabilitado cuando toggle WhatsApp está OFF
  Given el toggle "Notificaciones por WhatsApp" está desactivado
  Then el campo de número de teléfono aparece deshabilitado en el formulario
```

---

## 8. Patrones de Diseño Aplicados

| Patrón | Componente | Justificación |
|--------|-----------|---------------|
| **Adapter** | `EmailAdapter`, `WhatsAppAdapter` | Desacopla la lógica del Worker de los SDKs/APIs externos (`INotificationService`). |
| **Strategy** | `CategoryTemplateStrategy` | Selección dinámica de plantilla por tipo de amenaza sin modificar el orquestador. |
| **Repository** | `NotificationPreferencesRepository` | Abstrae el almacenamiento (Redis) de las preferencias de la lógica de aplicación. |
| **Use Case** | `GetNotificationPreferencesUseCase`, `SaveNotificationPreferencesUseCase` | Orquestadores con un único `execute()`. |
| **Factory/DI** | `ServiceFactory` (backend), `app.config.ts` (frontend) | Conecta ports con implementaciones concretas. |

---

## 9. Variables de Entorno Nuevas

| Variable | Servicio | Descripción |
|----------|---------|-------------|
| `SENDGRID_API_KEY` | Worker | API Key de SendGrid para envío de emails. |
| `WA_TOKEN` | Worker | Bearer token de WhatsApp Business API. |
| `WA_PHONE_NUMBER_ID` | Worker | ID del número de teléfono en la plataforma Meta. |
| `SENDGRID_FROM_EMAIL` | Worker | Dirección remitente de los emails (ej: `noreply@cyberguard.com`). |

---

## 10. Dependencias

| Dependencia | Servicio | Uso |
|------------|---------|-----|
| `@sendgrid/mail` | Worker | SDK oficial de SendGrid para envío de emails. |
| `node-fetch` o `axios` | Worker | Cliente HTTP para WhatsApp Business API. |

---

## 11. Flows Alternos (Tolerancia a Fallos)

| Escenario | Comportamiento esperado |
|-----------|------------------------|
| Email falla (todos los reintentos) | Logger registra error + continúa con WhatsApp + log en Redis `notif:log:{eventId}:email = ERROR` |
| WhatsApp falla (todos los reintentos) | Logger registra error + continúa con Email + log en Redis `notif:log:{eventId}:whatsapp = ERROR` |
| Ambos fallan | Logger registra ambos errores + alerta permanece visible en WebSocket dashboard |
| Preferencias no encontradas en Redis | Worker no despachá por ningún canal externo (default `emailEnabled=false`, `whatsappEnabled=false`) |
| `SENDGRID_API_KEY` no configurada | Worker advierte en log al arrancar + `EmailAdapter.send()` arroja error controlado sin crashear |

---

## 12. Dependencia con EP-01 (admin-profile)

> La feature `external-notifications` **no depende** de los endpoints de perfil de EP-01
> (`GET/PUT /api/profile/me`). Las preferencias de notificación se almacenan bajo una
> clave Redis separada (`notif:prefs:{username}`) y son gestionadas por su propio
> Controller, UseCase y Repository. Ambas features son independientes y paralelas.
