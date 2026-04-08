# 🧪 Casos de Prueba — Sprint 2: Notificaciones, Perfil, Usuarios e Incidentes

**Versión:** 1.0
**Fecha:** 8 de abril de 2026
**Basado en:** `notificaciones-y-perfil.md` (HU-01 a HU-05), `SPEC-001` (HU-008), `SPEC-002` (HU-001)

---

## Índice

1. [HU-01: Perfil Personal](#hu-01-perfil-personal)
2. [HU-02: Preferencias de Notificación](#hu-02-preferencias-de-notificación)
3. [HU-03: Notificaciones en Tiempo Real](#hu-03-notificaciones-en-tiempo-real)
4. [HU-04: Notificaciones por Email](#hu-04-notificaciones-por-email)
5. [HU-05: Notificaciones por WhatsApp](#hu-05-notificaciones-por-whatsapp)
6. [HU-008.1: Creación de Usuarios](#hu-0081-creación-de-usuarios)
7. [HU-008.2: Modificación de Usuarios](#hu-0082-modificación-de-usuarios)
8. [HU-008.3: Desactivación y Reactivación](#hu-0083-desactivación-y-reactivación)
9. [HU-001: Crear Incidente desde Amenaza](#hu-001-crear-incidente-desde-amenaza)

---

## HU-01: Perfil Personal

### CP-PF-01: Visualización de datos del perfil

| Campo | Valor |
|---|---|
| **ID** | CP-PF-01 |
| **Historia** | HU-01 |
| **Tipo** | Funcional / Happy Path |
| **Prioridad** | Alta |
| **Precondición** | Administrador autenticado en el sistema |

```gherkin
Scenario: Visualización de datos del perfil personal
  Given un administrador autenticado en el sistema
  When accede a la sección "Perfil Personal" desde el menú principal
  Then el sistema muestra sus datos personales actuales: username, email, rol y fecha de creación
  And el campo "Rol" aparece en modo solo lectura
  And los datos provienen de GET /api/admin/profile
```

**Resultado esperado:** Se muestran username, email, phone, rol (readonly) y fecha de creación.

---

### CP-PF-02: Edición exitosa de datos de perfil

| Campo | Valor |
|---|---|
| **ID** | CP-PF-02 |
| **Historia** | HU-01 |
| **Tipo** | Funcional / Happy Path |
| **Prioridad** | Alta |
| **Precondición** | Administrador en la sección "Perfil Personal" |

```gherkin
Scenario: Edición exitosa de datos de perfil
  Given un administrador en la sección "Perfil Personal"
  When actualiza su correo electrónico con un valor válido "nuevo@test.com"
  And selecciona "Guardar cambios"
  Then el sistema envía PATCH /api/admin/profile con los datos modificados
  And el backend persiste los cambios en PostgreSQL
  And muestra el mensaje "Perfil actualizado correctamente"
  And el botón vuelve al estado "Guardar cambios" (no se queda en "Guardando...")
```

**Resultado esperado:** Datos actualizados, toast de éxito visible, botón sale de loading.

---

### CP-PF-03: Validación de correo inválido

| Campo | Valor |
|---|---|
| **ID** | CP-PF-03 |
| **Historia** | HU-01 |
| **Tipo** | Error Path |
| **Prioridad** | Media |
| **Precondición** | Administrador editando su perfil |

```gherkin
Scenario: Intento de guardado con correo inválido
  Given un administrador editando su perfil personal
  When ingresa "correo-invalido" en el campo email
  And el campo pierde foco
  Then el sistema muestra un error de validación inline "Formato de correo inválido"
  And el botón "Guardar cambios" permanece deshabilitado
  And no se envía ninguna petición al backend
```

**Resultado esperado:** Validación inline, botón deshabilitado.

---

### CP-PF-04: Validación de teléfono E.164

| Campo | Valor |
|---|---|
| **ID** | CP-PF-04 |
| **Historia** | HU-01 |
| **Tipo** | Validación / Boundary |
| **Prioridad** | Alta |
| **Datos de prueba** | `+573217390751` (válido), `3217390751` (inválido), `+12` (muy corto) |

```gherkin
Scenario: Teléfono válido en formato E.164
  Given un administrador editando su perfil
  When ingresa "+573217390751" en el campo teléfono
  Then no se muestra error de validación
  And el botón "Guardar cambios" se habilita si hay cambios

Scenario: Teléfono inválido sin prefijo +
  Given un administrador editando su perfil
  When ingresa "3217390751" en el campo teléfono
  Then el sistema muestra "Formato inválido. Use E.164: +57XXXXXXXXXX"
  And el botón "Guardar cambios" permanece deshabilitado
```

**Resultado esperado:** Validación E.164 inline funcional.

---

### CP-PF-05: Botón guardar sin cambios

| Campo | Valor |
|---|---|
| **ID** | CP-PF-05 |
| **Historia** | HU-01 |
| **Tipo** | Edge Case |
| **Prioridad** | Media |

```gherkin
Scenario: Botón deshabilitado si no hay cambios
  Given un administrador con perfil cargado
  When no modifica ningún campo
  Then el botón "Guardar cambios" permanece deshabilitado
  And la función hasChanges() retorna false
```

---

### CP-PF-06: Botón guardar vuelve a estado idle tras error de red

| Campo | Valor |
|---|---|
| **ID** | CP-PF-06 |
| **Historia** | HU-01 |
| **Tipo** | Error Path / Resiliencia |
| **Prioridad** | Alta |

```gherkin
Scenario: Botón sale de "Guardando..." tras error de red
  Given un administrador editando su perfil
  And el backend no está disponible
  When selecciona "Guardar cambios"
  Then el botón muestra "Guardando..." momentáneamente
  And al recibir el error, el botón vuelve a "Guardar cambios"
  And se muestra un mensaje de error descriptivo
```

---

## HU-02: Preferencias de Notificación

### CP-NP-01: Visualización de preferencias actuales

| Campo | Valor |
|---|---|
| **ID** | CP-NP-01 |
| **Historia** | HU-02 |
| **Tipo** | Funcional / Happy Path |
| **Prioridad** | Alta |

```gherkin
Scenario: Visualización de preferencias de notificación
  Given un administrador en la sección de preferencias de notificación
  When la página carga
  Then se obtienen las preferencias GET /api/profile/notification-preferences
  And los toggles de email y WhatsApp reflejan el estado guardado en Redis
  And los campos de contacto están habilitados/deshabilitados según el toggle
```

---

### CP-NP-02: Activar canal de email

| Campo | Valor |
|---|---|
| **ID** | CP-NP-02 |
| **Historia** | HU-02 |
| **Tipo** | Funcional / Happy Path |
| **Prioridad** | Alta |

```gherkin
Scenario: Activar canal de email
  Given un administrador con emailEnabled=false
  When activa el toggle "Email" e ingresa "admin@cyberguard.com"
  And selecciona "Guardar Preferencias"
  Then el sistema envía PUT /api/profile/notification-preferences con emailEnabled=true
  And el backend persiste en Redis bajo notif:prefs:<username>
  And muestra "Preferencias guardadas correctamente"
  And el botón vuelve a "Guardar Preferencias" (no se queda en "Guardando...")
```

---

### CP-NP-03: Activar canal de WhatsApp

| Campo | Valor |
|---|---|
| **ID** | CP-NP-03 |
| **Historia** | HU-02 |
| **Tipo** | Funcional / Happy Path |
| **Prioridad** | Alta |

```gherkin
Scenario: Activar canal de WhatsApp
  Given un administrador con whatsappEnabled=false y número telefónico configurado
  When activa el toggle "WhatsApp"
  And selecciona "Guardar Preferencias"
  Then el sistema actualiza whatsappEnabled=true en Redis
  And a partir de ese momento recibirá mensajes de WhatsApp al registrarse alertas
```

---

### CP-NP-04: Toggle deshabilita campo de contacto

| Campo | Valor |
|---|---|
| **ID** | CP-NP-04 |
| **Historia** | HU-02 |
| **Tipo** | Funcional / UX |
| **Prioridad** | Media |

```gherkin
Scenario: Campo email se deshabilita cuando el toggle está off
  Given un administrador con emailEnabled=true
  When desactiva el toggle "Email"
  Then el campo de email se deshabilita (readonly/disabled)
  And permanece visible con el valor actual
```

---

### CP-NP-05: Botón guardar preferencias sale de loading

| Campo | Valor |
|---|---|
| **ID** | CP-NP-05 |
| **Historia** | HU-02 |
| **Tipo** | UX / Change Detection |
| **Prioridad** | Alta |

```gherkin
Scenario: Botón "Guardar Preferencias" no se queda en "Guardando..."
  Given un administrador que modifica sus preferencias
  When selecciona "Guardar Preferencias"
  And el backend responde HTTP 200 OK
  Then el botón cambia de "Guardando..." a "Guardar Preferencias"
  And Angular detecta el cambio de estado (signal, no boolean plano)
```

**Nota técnica:** `saving` debe ser un `signal()` para que Angular sin zone.js detecte el cambio.

---

## HU-03: Notificaciones en Tiempo Real

### CP-RT-01: Recepción de nueva alerta en panel

| Campo | Valor |
|---|---|
| **ID** | CP-RT-01 |
| **Historia** | HU-03 |
| **Tipo** | Funcional / Happy Path |
| **Prioridad** | Muy Alta |

```gherkin
Scenario: Recepción de nueva alerta en panel de notificaciones
  Given un administrador con sesión activa en el panel de control
  When se registra una nueva alerta POST /api/threats con categoría "malware"
  Then el panel muestra la notificación sin recargar la página
  And la notificación contiene fecha, categoría, severidad, IP de origen y descripción
  And el indicador de conexión muestra "Conectado"
```

---

### CP-RT-02: Historial de alertas al reconectar

| Campo | Valor |
|---|---|
| **ID** | CP-RT-02 |
| **Historia** | HU-03 |
| **Tipo** | Funcional / Edge Case |
| **Prioridad** | Alta |

```gherkin
Scenario: Historial de alertas al reconectar
  Given un administrador que cierra y reabre la conexión al panel
  When el sistema establece la nueva conexión WebSocket
  Then el panel recupera y muestra las alertas previas almacenadas en Redis
  And el conteo total refleja las alertas históricas
```

---

### CP-RT-03: Borrado del historial

| Campo | Valor |
|---|---|
| **ID** | CP-RT-03 |
| **Historia** | HU-03 |
| **Tipo** | Funcional |
| **Prioridad** | Media |

```gherkin
Scenario: Borrado del historial desde el panel
  Given un administrador con notificaciones acumuladas
  When ejecuta la acción "Limpiar Todo"
  Then el sistema elimina el historial en Redis
  And el panel queda vacío
  And el conteo total muestra 0
```

---

## HU-04: Notificaciones por Email

### CP-EM-01: Envío exitoso de email

| Campo | Valor |
|---|---|
| **ID** | CP-EM-01 |
| **Historia** | HU-04 |
| **Tipo** | Funcional / Happy Path |
| **Prioridad** | Alta |
| **Precondición** | emailEnabled=true, email verificado en SendGrid |

```gherkin
Scenario: Envío exitoso de notificación por email
  Given un administrador con emailEnabled=true y email válido configurado
  When se registra una nueva alerta con categoría "malware"
  Then el Worker envía notificación inmediata por email via SendGrid
  And el asunto es específico según la categoría (ej: "🦠 Alerta de Malware")
  And el cuerpo incluye fecha, categoría, severidad, IP de origen y descripción
  And el log del Worker registra "Email sent successfully"
```

---

### CP-EM-02: Reintento automático ante fallo transitorio

| Campo | Valor |
|---|---|
| **ID** | CP-EM-02 |
| **Historia** | HU-04 |
| **Tipo** | Resiliencia |
| **Prioridad** | Alta |

```gherkin
Scenario: Reintento automático ante fallo transitorio
  Given el servicio de SendGrid no está disponible en el primer intento
  When el Worker detecta el fallo
  Then reintenta hasta 3 veces con backoff exponencial (1s, 2s, 4s)
  And si algún reintento es exitoso el envío queda registrado como exitoso en logs
```

---

### CP-EM-03: Falla de email no bloquea WhatsApp

| Campo | Valor |
|---|---|
| **ID** | CP-EM-03 |
| **Historia** | HU-04 |
| **Tipo** | Resiliencia / Independencia de canales |
| **Prioridad** | Muy Alta |

```gherkin
Scenario: Falla de email no bloquea otros canales
  Given el servicio de SendGrid retorna HTTP 403 Forbidden
  And el servicio de Twilio (WhatsApp) está disponible
  When se registra una nueva alerta
  Then el Worker registra el fallo de email en logs
  And el flujo de notificación por WhatsApp continúa de forma independiente
  And el log muestra "WhatsApp message sent successfully via Twilio"
```

---

### CP-EM-04: Email no se envía si canal está deshabilitado

| Campo | Valor |
|---|---|
| **ID** | CP-EM-04 |
| **Historia** | HU-04 |
| **Tipo** | Negativa |
| **Prioridad** | Media |

```gherkin
Scenario: No se envía email si emailEnabled=false
  Given un administrador con emailEnabled=false
  When se registra una nueva alerta
  Then el Worker no intenta enviar email
  And no aparece ningún log de intento de email
```

---

## HU-05: Notificaciones por WhatsApp

### CP-WA-01: Envío exitoso de mensaje WhatsApp

| Campo | Valor |
|---|---|
| **ID** | CP-WA-01 |
| **Historia** | HU-05 |
| **Tipo** | Funcional / Happy Path |
| **Prioridad** | Alta |
| **Precondición** | whatsappEnabled=true, phone E.164 válido, Twilio sandbox activo |

```gherkin
Scenario: Envío exitoso de mensaje WhatsApp
  Given un administrador con whatsappEnabled=true y número "+573217390751"
  When se registra una nueva alerta con categoría "phishing"
  Then el Worker envía el mensaje via Twilio WhatsApp API
  And el mensaje contiene asunto y cuerpo según la categoría de la alerta
  And el log muestra "WhatsApp message sent successfully via Twilio" con to="+573217390751"
```

---

### CP-WA-02: No se envía si no hay número configurado

| Campo | Valor |
|---|---|
| **ID** | CP-WA-02 |
| **Historia** | HU-05 |
| **Tipo** | Edge Case |
| **Prioridad** | Media |

```gherkin
Scenario: No se envía si no hay número configurado
  Given un administrador con whatsappEnabled=true pero sin número telefónico
  When se registra una nueva alerta
  Then el Worker no intenta enviar el mensaje
  And no genera ningún log de intento fallido de WhatsApp
```

---

### CP-WA-03: Reintento de WhatsApp ante fallo

| Campo | Valor |
|---|---|
| **ID** | CP-WA-03 |
| **Historia** | HU-05 |
| **Tipo** | Resiliencia |
| **Prioridad** | Alta |

```gherkin
Scenario: Reintento automático ante fallo de Twilio
  Given la API de Twilio no está disponible en el primer intento
  When el Worker detecta el fallo
  Then reintenta hasta 3 veces con backoff exponencial
  And si todos los intentos fallan, registra el error en logs
  And el flujo de email no se ve afectado
```

---

## HU-008.1: Creación de Usuarios

### CP-CU-01: Creación exitosa de usuario

| Campo | Valor |
|---|---|
| **ID** | CP-CU-01 |
| **Historia** | HU-008.1 |
| **Tipo** | Happy Path |
| **Prioridad** | Alta |

```gherkin
Scenario: Creación exitosa de usuario
  Given un Administrador autenticado
  When hace POST /api/admin/users con:
    | fullName | email                   | role         | username    |
    | Ana Torres | ana.torres@example.com | soc_analyst | ana.torres |
  Then el sistema retorna HTTP 201 con los datos del usuario
  And el usuario tiene isActive=true
  And se registra en audit_logs con action='USER_CREATED'
```

---

### CP-CU-02: Rechazo por email duplicado

| Campo | Valor |
|---|---|
| **ID** | CP-CU-02 |
| **Historia** | HU-008.1 |
| **Tipo** | Error Path |
| **Prioridad** | Alta |

```gherkin
Scenario: Rechazo por email duplicado
  Given el email "ana.torres@example.com" ya existe en la base de datos
  When el Administrador intenta crear un usuario con ese mismo email
  Then el sistema retorna HTTP 409
  And el mensaje es "El correo electrónico ya está en uso"
  And no se crea ningún registro en la BD
```

---

### CP-CU-03: Validación de campos obligatorios

| Campo | Valor |
|---|---|
| **ID** | CP-CU-03 |
| **Historia** | HU-008.1 |
| **Tipo** | Validación |
| **Prioridad** | Media |

```gherkin
Scenario: Validación de campos obligatorios
  Given el Administrador envía el body sin el campo "fullName"
  When hace POST /api/admin/users
  Then el sistema retorna HTTP 400 con mensaje descriptivo del campo faltante
  And no se crea ningún registro en la BD
```

---

### CP-CU-04: Rechazo por rol inválido

| Campo | Valor |
|---|---|
| **ID** | CP-CU-04 |
| **Historia** | HU-008.1 |
| **Tipo** | Error Path |
| **Prioridad** | Media |

```gherkin
Scenario: Rechazo por rol inválido
  Given el Administrador envía role="superuser" (no existe en el sistema)
  When hace POST /api/admin/users
  Then el sistema retorna HTTP 400 con mensaje "Rol no válido"
```

---

### CP-CU-05: Acceso denegado a no-administradores

| Campo | Valor |
|---|---|
| **ID** | CP-CU-05 |
| **Historia** | HU-008.1 |
| **Tipo** | Seguridad |
| **Prioridad** | Alta |

```gherkin
Scenario: Acceso denegado a no-administradores
  Given un usuario con rol "soc_analyst" tiene JWT válido
  When intenta hacer POST /api/admin/users
  Then el sistema retorna HTTP 403 "Forbidden: admin role required"
```

---

## HU-008.2: Modificación de Usuarios

### CP-MU-01: Actualización exitosa de perfil

| Campo | Valor |
|---|---|
| **ID** | CP-MU-01 |
| **Historia** | HU-008.2 |
| **Tipo** | Happy Path |
| **Prioridad** | Alta |

```gherkin
Scenario: Actualización exitosa de perfil
  Given un usuario con id="uuid-abc" y nombre "Ana Torres"
  When el Administrador hace PUT /api/admin/users/uuid-abc con fullName="Ana Maria Torres"
  Then el sistema retorna HTTP 200 con los datos actualizados
  And registra en audit_logs el cambio con previousName y newName
```

---

### CP-MU-02: Cambio de rol con trazabilidad forense

| Campo | Valor |
|---|---|
| **ID** | CP-MU-02 |
| **Historia** | HU-008.2 |
| **Tipo** | Happy Path + Auditoría |
| **Prioridad** | Alta |

```gherkin
Scenario: Cambio de rol con trazabilidad forense
  Given un usuario con role="soc_analyst"
  When el Administrador cambia su rol a "incident_handler"
  Then el sistema actualiza el rol
  And en audit_logs registra: previousRole="soc_analyst", newRole="incident_handler"
  And el changedBy es el id del Administrador que realizó el cambio
```

---

### CP-MU-03: Prevención de auto-cambio de rol

| Campo | Valor |
|---|---|
| **ID** | CP-MU-03 |
| **Historia** | HU-008.2 |
| **Tipo** | Error Path / Seguridad |
| **Prioridad** | Alta |

```gherkin
Scenario: Prevención de auto-cambio de rol
  Given el Administrador autenticado tiene id="uuid-admin"
  When hace PUT /api/admin/users/uuid-admin con role="soc_analyst"
  Then el sistema retorna HTTP 400
  And el mensaje es "No puede modificar su propio rol"
  And el rol NO cambia en la BD
```

---

### CP-MU-04: Email es inmutable

| Campo | Valor |
|---|---|
| **ID** | CP-MU-04 |
| **Historia** | HU-008.2 |
| **Tipo** | Edge Case |
| **Prioridad** | Media |

```gherkin
Scenario: Email es inmutable
  Given el Administrador envía el body con campo "email" modificado
  When hace PUT /api/admin/users/:id
  Then el sistema ignora el campo email del body
  And NO modifica el email en la BD
  And retorna HTTP 200 con los demás cambios aplicados
```

---

## HU-008.3: Desactivación y Reactivación

### CP-DU-01: Desactivación exitosa con reasignación de incidentes

| Campo | Valor |
|---|---|
| **ID** | CP-DU-01 |
| **Historia** | HU-008.3 |
| **Tipo** | Happy Path |
| **Prioridad** | Alta |

```gherkin
Scenario: Desactivación exitosa con reasignación de incidentes
  Given un usuario activo con 2 incidentes asignados (status != 'closed')
  When el Administrador hace PATCH /api/admin/users/:id/status con isActive=false
  Then el usuario queda con isActive=false
  And los 2 incidentes quedan con assigned_to=null
  And retorna HTTP 200 con reassignedIncidents=2
  And registra en audit_logs action='USER_DEACTIVATED'
```

---

### CP-DU-02: Reactivación exitosa

| Campo | Valor |
|---|---|
| **ID** | CP-DU-02 |
| **Historia** | HU-008.3 |
| **Tipo** | Happy Path |
| **Prioridad** | Alta |

```gherkin
Scenario: Reactivación exitosa con registro de auditoría
  Given un usuario con isActive=false
  When el Administrador hace PATCH /api/admin/users/:id/status con isActive=true
  Then el usuario queda con isActive=true
  And retorna HTTP 200
  And registra en audit_logs action='USER_REACTIVATED'
```

---

### CP-DU-03: Prevención de auto-desactivación

| Campo | Valor |
|---|---|
| **ID** | CP-DU-03 |
| **Historia** | HU-008.3 |
| **Tipo** | Seguridad |
| **Prioridad** | Alta |

```gherkin
Scenario: Prevención de auto-desactivación
  Given el Administrador autenticado tiene id="uuid-admin"
  When hace PATCH /api/admin/users/uuid-admin/status con isActive=false
  Then el sistema retorna HTTP 400
  And el mensaje es "No puede desactivar su propia cuenta"
  And isActive NO cambia en la BD
```

---

### CP-DU-04: Idempotencia en estado ya aplicado

| Campo | Valor |
|---|---|
| **ID** | CP-DU-04 |
| **Historia** | HU-008.3 |
| **Tipo** | Edge Case |
| **Prioridad** | Baja |

```gherkin
Scenario: Usuario ya en el estado solicitado
  Given un usuario con isActive=false
  When el Administrador hace PATCH /api/admin/users/:id/status con isActive=false
  Then el sistema retorna HTTP 200 (idempotente)
  And no registra entrada duplicada en audit_logs
```

---

## HU-001: Crear Incidente desde Amenaza

### CP-IN-01: Creación exitosa desde amenaza HIGH

| Campo | Valor |
|---|---|
| **ID** | CP-IN-01 |
| **Historia** | HU-001 |
| **Tipo** | Happy Path |
| **Prioridad** | Muy Alta |

```gherkin
Scenario: Creación exitosa de incidente desde amenaza de severidad alta
  Given una amenaza con threatId="uuid-t1", severity="high", type="malware"
  And el usuario autenticado tiene role="admin"
  When hace POST /api/incidents con body { "threatId": "uuid-t1" }
  Then el sistema crea un incidente con status="open"
  And el incidente hereda: severity="high", type="malware", sourceIp de la amenaza
  And retorna HTTP 201 con los datos completos del incidente
  And el incidentId es un UUID nuevo (no el mismo que threatId)
```

---

### CP-IN-02: Creación exitosa desde amenaza CRITICAL

| Campo | Valor |
|---|---|
| **ID** | CP-IN-02 |
| **Historia** | HU-001 |
| **Tipo** | Happy Path |
| **Prioridad** | Muy Alta |

```gherkin
Scenario: Creación exitosa desde amenaza con severidad crítica
  Given una amenaza con severity="critical"
  When hace POST /api/incidents con body { "threatId": "<id>" }
  Then el incidente se crea correctamente con status="open"
  And retorna HTTP 201
```

---

### CP-IN-03: Rechazo por severidad insuficiente

| Campo | Valor |
|---|---|
| **ID** | CP-IN-03 |
| **Historia** | HU-001 |
| **Tipo** | Error Path |
| **Prioridad** | Alta |
| **Datos de prueba** | severity="low", severity="medium" |

```gherkin
Scenario: Rechazo por severidad insuficiente
  Given una amenaza con severity="low"
  When hace POST /api/incidents con el threatId de esa amenaza
  Then el sistema retorna HTTP 422
  And el mensaje es "Solo amenazas con severidad ALTA o CRÍTICA pueden generar incidentes"
  And no se crea ningún registro en la tabla incidents
```

---

### CP-IN-04: Rechazo por incidente duplicado

| Campo | Valor |
|---|---|
| **ID** | CP-IN-04 |
| **Historia** | HU-001 |
| **Tipo** | Error Path |
| **Prioridad** | Alta |

```gherkin
Scenario: Rechazo por incidente duplicado (idempotencia)
  Given ya existe un incidente activo (status != 'closed') para la amenaza "uuid-t1"
  When el usuario intenta crear otro incidente con el mismo threatId="uuid-t1"
  Then el sistema retorna HTTP 409
  And el mensaje es "Ya existe un incidente activo para esta amenaza"
  And no se crea un registro duplicado
```

---

### CP-IN-05: Amenaza no encontrada

| Campo | Valor |
|---|---|
| **ID** | CP-IN-05 |
| **Historia** | HU-001 |
| **Tipo** | Error Path |
| **Prioridad** | Media |

```gherkin
Scenario: Amenaza no encontrada
  Given no existe ninguna amenaza con el threatId enviado
  When hace POST /api/incidents con body { "threatId": "uuid-inexistente" }
  Then el sistema retorna HTTP 404 "Threat not found"
```

---

### CP-IN-06: Acceso no autorizado

| Campo | Valor |
|---|---|
| **ID** | CP-IN-06 |
| **Historia** | HU-001 |
| **Tipo** | Seguridad |
| **Prioridad** | Alta |

```gherkin
Scenario: Acceso no autorizado
  Given la petición no incluye el header Authorization
  When hace POST /api/incidents
  Then el sistema retorna HTTP 401 "Unauthorized"
```

---

### CP-IN-07: Reapertura tras incidente cerrado

| Campo | Valor |
|---|---|
| **ID** | CP-IN-07 |
| **Historia** | HU-001 |
| **Tipo** | Edge Case |
| **Prioridad** | Media |

```gherkin
Scenario: Reapertura permitida si incidente previo está cerrado
  Given un incidente con status="closed" para la amenaza "uuid-t1"
  When el usuario hace POST /api/incidents con threatId="uuid-t1"
  Then el sistema permite crear un nuevo incidente
  And retorna HTTP 201 con el nuevo incidentId
```

---

### CP-IN-08: Listado de incidentes accesible para todos los roles

| Campo | Valor |
|---|---|
| **ID** | CP-IN-08 |
| **Historia** | HU-001 |
| **Tipo** | Happy Path |
| **Prioridad** | Media |

```gherkin
Scenario: Listado de incidentes accesible para todos los roles
  Given un usuario con role="ciso" y JWT válido
  When hace GET /api/incidents
  Then el sistema retorna HTTP 200 con la lista de incidentes
```

---

## Resumen de Casos de Prueba

| Historia | Total Casos | Happy Path | Error Path | Edge Case | Seguridad |
|---|---|---|---|---|---|
| HU-01 Perfil | 6 | 2 | 2 | 1 | 1 |
| HU-02 Preferencias | 5 | 3 | 0 | 1 | 1 |
| HU-03 Tiempo Real | 3 | 1 | 0 | 1 | 1 |
| HU-04 Email | 4 | 1 | 1 | 1 | 1 |
| HU-05 WhatsApp | 3 | 1 | 0 | 1 | 1 |
| HU-008.1 Crear Usuario | 5 | 1 | 2 | 1 | 1 |
| HU-008.2 Modificar Usuario | 4 | 2 | 1 | 1 | 0 |
| HU-008.3 Desactivar/Reactivar | 4 | 2 | 0 | 1 | 1 |
| HU-001 Incidentes | 8 | 3 | 2 | 1 | 2 |
| **TOTAL** | **42** | **16** | **8** | **9** | **9** |

---

> **Nota:** Este catálogo de casos de prueba está alineado con los criterios de aceptación definidos en las specs SPEC-001, SPEC-002 y el requirement `notificaciones-y-perfil.md`. Cada caso es trazable a su historia de usuario de origen.
