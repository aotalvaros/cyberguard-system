# 🤖 Automatización E2E — CyberGuard System

**Versión:** 1.0  
**Fecha:** 8 de abril de 2026  
**Basado en:** `QA/TEST_CASES_SPRINT2.md`  
**Propósito:** Documento de delegación para 3 repositorios de automatización independientes.

---

## Índice

1. [Contexto General](#1-contexto-general)
2. [Conexión con Servicios](#2-conexión-con-servicios)
3. [Autenticación](#3-autenticación)
4. [Delegación de Escenarios por Repositorio](#4-delegación-de-escenarios-por-repositorio)
   - 4.1 [Repo Screenplay API](#41-repo-screenplay-api--perfil-y-preferencias-hu-01--hu-02)
   - 4.2 [Repo POM Frontend](#42-repo-pom-frontend--preferencias-de-notificación-hu-02)
   - 4.3 [Repo Screenplay Frontend](#43-repo-screenplay-frontend--perfil-personal-hu-01)
5. [Selectores y Estructura del DOM](#5-selectores-y-estructura-del-dom)
6. [Datos de Prueba](#6-datos-de-prueba)
7. [Cómo Levantar el Entorno](#7-cómo-levantar-el-entorno)

---

## 1. Contexto General

CyberGuard System es una plataforma de ciberseguridad compuesta por:

- **Backend**: Express + TypeScript, PostgreSQL, Redis, RabbitMQ (puerto `3000`)
- **Frontend**: Angular 21 standalone, servido por Nginx (puerto `4200`)
- **Worker**: Notificaciones en tiempo real vía WebSocket (puerto `8081`)

Todo se orquesta con `docker-compose`. Los 3 repos de automatización se conectan a los mismos servicios levantados localmente.

```
┌──────────────────────────────────────────────────────────────────┐
│                     docker-compose up -d                         │
│                                                                  │
│   ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐  │
│   │ PostgreSQL │  │   Redis    │  │ RabbitMQ │  │   Worker   │  │
│   │   :5432    │  │   :6379   │  │  :5672   │  │   :8081    │  │
│   └────────────┘  └────────────┘  └──────────┘  └────────────┘  │
│                                                                  │
│   ┌────────────────────┐     ┌──────────────────────┐            │
│   │   Backend (API)    │     │   Frontend (Angular)  │            │
│   │   :3000            │     │   :4200               │            │
│   └────────────────────┘     └──────────────────────┘            │
└──────────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
   Repo Screenplay API          Repo POM Frontend
                                Repo Screenplay Frontend
```

---

## 2. Conexión con Servicios

### URLs de conexión

| Servicio | URL | Uso |
|---|---|---|
| **Backend REST API** | `http://localhost:3000` | Todos los endpoints REST |
| **Frontend App** | `http://localhost:4200` | Navegación UI con browser |
| **WebSocket (Worker)** | `ws://localhost:8081` | Notificaciones en tiempo real |

### Variables de entorno recomendadas

Cada repo debe leer estas variables para no hardcodear URLs. Si no están definidas, usar los defaults:

```env
API_URL=http://localhost:3000
BASE_URL=http://localhost:4200
WS_URL=ws://localhost:8081
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123!
```

### Endpoints de la API disponibles

#### Autenticación

| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{ "username": "admin", "password": "Admin123!" }` | `{ "token": "<JWT>" }` |

> El token JWT se incluye en todos los requests subsiguientes como header:  
> `Authorization: Bearer <token>`

#### Gestión de Usuarios (`/api/admin/users`)

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `POST` | `/api/admin/users` | Crear usuario | Admin JWT |
| `GET` | `/api/admin/users` | Listar todos los usuarios | Admin JWT |
| `GET` | `/api/admin/users/:id` | Obtener usuario por ID | Admin JWT |
| `PUT` | `/api/admin/users/:id` | Actualizar usuario (fullName, role) | Admin JWT |
| `PATCH` | `/api/admin/users/:id/status` | Activar/desactivar usuario `{ "isActive": bool }` | Admin JWT |

**Body de creación:**
```json
{
  "fullName": "Ana Torres",
  "email": "ana.torres@example.com",
  "role": "soc_analyst",
  "username": "ana.torres"
}
```

**Roles válidos:** `admin`, `soc_analyst`, `incident_handler`, `ciso`

#### Perfil del Administrador (`/api/admin/profile`)

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/admin/profile` | Obtener datos del perfil | JWT |
| `PATCH` | `/api/admin/profile` | Actualizar perfil (username, email, phone) | JWT |

#### Preferencias de Notificación (`/api/profile/notification-preferences`)

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/profile/notification-preferences` | Obtener preferencias actuales | JWT |
| `PUT` | `/api/profile/notification-preferences` | Guardar preferencias | JWT |

**Body de guardado:**
```json
{
  "emailEnabled": true,
  "email": "admin@cyberguard.com",
  "whatsappEnabled": false,
  "phone": "+573217390751"
}
```

### Rutas del Frontend

| Ruta | Vista | Guards | Descripción |
|---|---|---|---|
| `/autenticacion` | Login | `noAuthGuard` | Formulario de inicio de sesión |
| `/dashboard` | Dashboard | `authGuard` | Pantalla principal (redirect post-login) |
| `/profile` | Perfil Personal | `authGuard` | Formulario de perfil + preferencias notificación |
| `/users` | Gestión de Usuarios | `authGuard` + `adminGuard` | CRUD de usuarios (solo admin) |
| `/incidents` | Incidentes | `authGuard` | Listado de incidentes |

---

## 3. Autenticación

### Para repos de API (Screenplay API)

```
1. POST http://localhost:3000/api/auth/login
   Body: { "username": "admin", "password": "Admin123!" }

2. Extraer el campo "token" de la respuesta JSON

3. Incluir en todos los requests:
   Header: Authorization: Bearer <token>
```

### Para repos de UI (POM y Screenplay Frontend)

```
1. Navegar a http://localhost:4200/autenticacion

2. Llenar los campos:
   - #username → "admin"
   - #password → "Admin123!"

3. Click en button[type="submit"]

4. Esperar redirect a /dashboard (confirma sesión activa)

5. Desde ahí navegar a la vista bajo prueba
```

**Selectores del login:**

| Elemento | Selector |
|---|---|
| Campo usuario | `#username` |
| Campo contraseña | `#password` |
| Botón submit | `button[type="submit"]` |
| Checkbox recordar | `input[type="checkbox"][formcontrolname="remember"]` |
| Error de login | `.alert-error` |

---

## 4. Delegación de Escenarios por Repositorio

### 4.1 Repo Screenplay API — Perfil y Preferencias (HU-01 + HU-02)

**Patrón:** Screenplay  
**Capa:** API (sin browser, solo HTTP)  
**Conectar a:** `http://localhost:3000`

#### Endpoints bajo prueba

| Método | Endpoint | Descripción | HU |
|---|---|---|---|
| `GET` | `/api/admin/profile` | Obtener datos del perfil | HU-01 |
| `PATCH` | `/api/admin/profile` | Actualizar perfil | HU-01 |
| `GET` | `/api/profile/notification-preferences` | Obtener preferencias actuales | HU-02 |
| `PUT` | `/api/profile/notification-preferences` | Guardar preferencias | HU-02 |

#### Escenarios asignados

| ID | Escenario | HU | Tipo | Endpoint | HTTP esperado |
|---|---|---|---|---|---|
| **CP-PF-01-API** | Obtener datos del perfil | HU-01 | Happy Path | `GET /api/admin/profile` | 200 |
| **CP-PF-02-API** | Actualizar email con valor válido | HU-01 | Happy Path | `PATCH /api/admin/profile` | 200 |
| **CP-PF-03-API** | Rechazo por email inválido | HU-01 | Error Path | `PATCH /api/admin/profile` | 400 |
| **CP-PF-04-API** | Actualizar teléfono E.164 válido | HU-01 | Happy Path | `PATCH /api/admin/profile` | 200 |
| **CP-PF-04b-API** | Rechazo por teléfono sin formato E.164 | HU-01 | Error Path | `PATCH /api/admin/profile` | 400 |
| **CP-PF-06-API** | Petición sin token retorna 401 | HU-01 | Seguridad | `GET /api/admin/profile` | 401 |
| **CP-NP-01-API** | Obtener preferencias actuales | HU-02 | Happy Path | `GET /api/profile/notification-preferences` | 200 |
| **CP-NP-02-API** | Activar canal de email | HU-02 | Happy Path | `PUT /api/profile/notification-preferences` | 200 |
| **CP-NP-03-API** | Activar canal de WhatsApp | HU-02 | Happy Path | `PUT /api/profile/notification-preferences` | 200 |
| **CP-NP-02b-API** | Desactivar canal de email | HU-02 | Happy Path | `PUT /api/profile/notification-preferences` | 200 |
| **CP-NP-03b-API** | Desactivar canal de WhatsApp | HU-02 | Happy Path | `PUT /api/profile/notification-preferences` | 200 |

#### Gherkin de referencia

```gherkin
# CP-PF-01-API
Scenario: Obtener datos del perfil
  Given Administrador autenticado con JWT válido
  When GET /api/admin/profile
  Then HTTP 200
  And Body contiene username, email, role, createdAt

# CP-PF-02-API
Scenario: Actualizar email con valor válido
  Given Administrador autenticado
  When PATCH /api/admin/profile con { "email": "nuevo@cyberguard.com" }
  Then HTTP 200
  And Body refleja el email actualizado
  And Un GET posterior confirma la persistencia

# CP-PF-03-API
Scenario: Rechazo por email inválido
  Given Administrador autenticado
  When PATCH /api/admin/profile con { "email": "correo-invalido" }
  Then HTTP 400
  And Mensaje descriptivo del error de validación

# CP-PF-04-API
Scenario: Actualizar teléfono E.164 válido
  Given Administrador autenticado
  When PATCH /api/admin/profile con { "phone": "+573217390751" }
  Then HTTP 200
  And Body refleja el teléfono actualizado

# CP-PF-04b-API
Scenario: Rechazo por teléfono sin formato E.164
  Given Administrador autenticado
  When PATCH /api/admin/profile con { "phone": "3217390751" }
  Then HTTP 400
  And Mensaje de error de validación

# CP-PF-06-API
Scenario: Petición sin token retorna 401
  Given Request sin header Authorization
  When GET /api/admin/profile
  Then HTTP 401, "Unauthorized"

# CP-NP-01-API
Scenario: Obtener preferencias actuales
  Given Administrador autenticado
  When GET /api/profile/notification-preferences
  Then HTTP 200
  And Body contiene emailEnabled, email, whatsappEnabled, phone

# CP-NP-02-API
Scenario: Activar canal de email
  Given Administrador autenticado
  When PUT /api/profile/notification-preferences con { "emailEnabled": true, "email": "admin@cyberguard.com", "whatsappEnabled": false, "phone": "" }
  Then HTTP 200
  And Un GET posterior confirma emailEnabled=true

# CP-NP-03-API
Scenario: Activar canal de WhatsApp
  Given Administrador autenticado
  When PUT con { "emailEnabled": false, "email": "", "whatsappEnabled": true, "phone": "+573217390751" }
  Then HTTP 200
  And Un GET posterior confirma whatsappEnabled=true

# CP-NP-02b-API
Scenario: Desactivar canal de email
  Given emailEnabled=true actualmente
  When PUT con { "emailEnabled": false, ... }
  Then HTTP 200
  And Un GET posterior confirma emailEnabled=false

# CP-NP-03b-API
Scenario: Desactivar canal de WhatsApp
  Given whatsappEnabled=true actualmente
  When PUT con { "whatsappEnabled": false, ... }
  Then HTTP 200
  And Un GET posterior confirma whatsappEnabled=false
```

#### Flujo sugerido del test suite

```
beforeAll: login → obtener JWT → crear contexto HTTP autenticado
  test 1: GET /api/admin/profile → verificar 200, campos presentes (CP-PF-01-API)
  test 2: PATCH perfil con email válido → verificar 200 + persistencia (CP-PF-02-API)
  test 3: PATCH perfil con email inválido → verificar 400 (CP-PF-03-API)
  test 4: PATCH perfil con teléfono E.164 válido → verificar 200 (CP-PF-04-API)
  test 5: PATCH perfil con teléfono sin + → verificar 400 (CP-PF-04b-API)
  test 6: GET profile sin token → verificar 401 (CP-PF-06-API)
  test 7: GET /api/profile/notification-preferences → verificar 200 (CP-NP-01-API)
  test 8: PUT preferencias con emailEnabled=true → verificar 200 + GET confirma (CP-NP-02-API)
  test 9: PUT preferencias con whatsappEnabled=true → verificar 200 + GET confirma (CP-NP-03-API)
  test 10: PUT preferencias con emailEnabled=false → verificar 200 (CP-NP-02b-API)
  test 11: PUT preferencias con whatsappEnabled=false → verificar 200 (CP-NP-03b-API)
afterAll: restaurar perfil y preferencias al estado original (cleanup)
```

---

### 4.2 Repo POM Frontend — Preferencias de Notificación (HU-02)

**Patrón:** Page Object Model  
**Capa:** Frontend (browser)  
**Conectar a:** `http://localhost:4200`

#### Por qué esta vista para POM

La vista de Preferencias de Notificación es compacta: 2 toggles, 2 campos de contacto y 1 botón. Un solo Page Object cubre toda la interacción sin convertirse en un God Object.

#### Escenarios asignados

| ID | Escenario | HU | Tipo |
|---|---|---|---|
| **CP-NP-01** | Visualización de preferencias actuales | HU-02 | Happy Path |
| **CP-NP-02** | Activar canal de email | HU-02 | Happy Path |
| **CP-NP-03** | Activar canal de WhatsApp | HU-02 | Happy Path |
| **CP-NP-04** | Toggle deshabilita campo de contacto | HU-02 | UX |
| **CP-NP-05** | Botón guardar sale de loading | HU-02 | UX |

#### Selectores del DOM

La vista se renderiza dentro de la ruta `/profile`. El componente `<app-notification-preferences>` tiene esta estructura:

```html
<section class="notification-preferences">
  <h3>Preferencias de Notificación</h3>
  <form [formGroup]="form" (ngSubmit)="save()">

    <!-- Toggle Email -->
    <input type="checkbox" formControlName="emailEnabled" />
    <span>Notificaciones por Email</span>
    <input id="email" type="email" formControlName="email" />

    <!-- Toggle WhatsApp -->
    <input type="checkbox" formControlName="whatsappEnabled" />
    <span>Notificaciones por WhatsApp</span>
    <input id="phone" type="tel" formControlName="phone" />

    <!-- Botón guardar -->
    <button type="submit">
      {{ saving() ? 'Guardando...' : 'Guardar Preferencias' }}
    </button>
  </form>

  <!-- Mensajes feedback -->
  <p class="msg-success">Preferencias guardadas correctamente.</p>
  <p class="msg-error">{{ savingError() }}</p>
</section>
```

**Tabla de selectores para el Page Object:**

| Elemento | Selector | Notas |
|---|---|---|
| Contenedor raíz | `.notification-preferences` | Esperar visible para confirmar carga |
| Toggle email | `input[formcontrolname="emailEnabled"]` | Checkbox |
| Toggle WhatsApp | `input[formcontrolname="whatsappEnabled"]` | Checkbox |
| Campo email | `#email` | Se deshabilita si toggle off |
| Campo teléfono | `#phone` | Se deshabilita si toggle off |
| Botón guardar | `button[type="submit"]` | Texto cambia a "Guardando..." |
| Mensaje éxito | `.msg-success` | Visible solo tras guardado exitoso |
| Mensaje error | `.msg-error` | Visible solo si hay error |

#### Gherkin de referencia

```gherkin
# CP-NP-01
Scenario: Visualización de preferencias de notificación
  Given un administrador en la sección de preferencias de notificación
  When la página carga
  Then se obtienen las preferencias GET /api/profile/notification-preferences
  And los toggles de email y WhatsApp reflejan el estado guardado
  And los campos de contacto están habilitados/deshabilitados según el toggle

# CP-NP-02
Scenario: Activar canal de email
  Given un administrador con emailEnabled=false
  When activa el toggle "Email" e ingresa "admin@cyberguard.com"
  And selecciona "Guardar Preferencias"
  Then muestra "Preferencias guardadas correctamente"
  And el botón vuelve a "Guardar Preferencias"

# CP-NP-03
Scenario: Activar canal de WhatsApp
  Given un administrador con whatsappEnabled=false y número telefónico configurado
  When activa el toggle "WhatsApp"
  And selecciona "Guardar Preferencias"
  Then el sistema actualiza whatsappEnabled=true

# CP-NP-04
Scenario: Campo email se deshabilita cuando el toggle está off
  Given un administrador con emailEnabled=true
  When desactiva el toggle "Email"
  Then el campo de email se deshabilita (readonly/disabled)
  And permanece visible con el valor actual

# CP-NP-05
Scenario: Botón "Guardar Preferencias" no se queda en "Guardando..."
  Given un administrador que modifica sus preferencias
  When selecciona "Guardar Preferencias"
  And el backend responde HTTP 200 OK
  Then el botón cambia de "Guardando..." a "Guardar Preferencias"
```

#### Flujo sugerido del test suite

```
beforeEach: login vía UI → navegar a /profile → esperar .notification-preferences visible
  test 1: verificar toggles y campos visibles (CP-NP-01)
  test 2: activar email toggle → llenar email → guardar → verificar éxito (CP-NP-02)
  test 3: activar WhatsApp toggle → llenar phone → guardar → verificar éxito (CP-NP-03)
  test 4: activar toggle → verificar campo enabled → desactivar → verificar disabled (CP-NP-04)
  test 5: guardar → verificar que botón no queda en "Guardando..." (CP-NP-05)
```

---

### 4.3 Repo Screenplay Frontend — Perfil Personal (HU-01)

**Patrón:** Screenplay  
**Capa:** Frontend (browser)  
**Conectar a:** `http://localhost:4200`

#### Por qué esta vista para Screenplay

El formulario de Perfil tiene validaciones complejas (email, teléfono E.164, campo readonly) y múltiples estados del botón guardar. El patrón Screenplay permite modelar cada interacción como un Task y cada verificación como un Question, logrando tests muy legibles.

#### Escenarios asignados

| ID | Escenario | HU | Tipo |
|---|---|---|---|
| **CP-PF-01** | Visualización de datos del perfil | HU-01 | Happy Path |
| **CP-PF-02** | Edición exitosa de datos de perfil | HU-01 | Happy Path |
| **CP-PF-03** | Validación de correo inválido | HU-01 | Error Path |
| **CP-PF-04** | Validación de teléfono E.164 (válido e inválido) | HU-01 | Boundary |
| **CP-PF-05** | Botón guardar sin cambios | HU-01 | Edge Case |
| **CP-PF-06** | Botón guardar vuelve a estado idle tras error | HU-01 | Resiliencia |

#### Selectores del DOM

La vista se renderiza en la ruta `/profile`. El componente `<app-profile>` tiene template inline:

```html
<div class="profile-container">
  <h2>Perfil Personal</h2>

  <!-- Skeleton mientras carga -->
  <div class="skeleton-loader" role="status" aria-label="Cargando perfil..."></div>

  <!-- Formulario -->
  <form [formGroup]="profileForm" (ngSubmit)="onSave()">
    <input id="username" type="text" formControlName="username" />
    <input id="email" type="email" formControlName="email" />
    <input id="phone" type="tel" formControlName="phone" />
    <input id="role" type="text" formControlName="role" readonly />

    <!-- Toasts -->
    <div class="toast success" role="alert">Perfil actualizado correctamente.</div>
    <div class="toast error" role="alert">{{ errorMessage() }}</div>

    <!-- Botón guardar -->
    <button type="submit" class="btn-save"
            [disabled]="profileForm.invalid || !hasChanges() || saving()">
      {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
    </button>
  </form>
</div>
```

**Tabla de selectores para Tasks y Questions:**

| Elemento | Selector | Notas |
|---|---|---|
| Contenedor raíz | `.profile-container` | Esperar visible para confirmar carga |
| Skeleton loader | `.skeleton-loader` | Esperar hidden antes de interactuar |
| Campo username | `#username` | Requerido, min 3, max 50 |
| Campo email | `#email` | Requerido, validación email |
| Campo teléfono | `#phone` | Opcional, validación E.164 (`+` + 7-15 dígitos) |
| Campo rol | `#role` | **readonly** — no editable |
| Botón guardar | `button.btn-save` | Disabled si form inválido o sin cambios |
| Toast éxito | `.toast.success` | "Perfil actualizado correctamente." |
| Toast error | `.toast.error` | Mensaje dinámico |
| Error de campo | `.field-error` | Inline debajo del campo con error |

**Validaciones del formulario:**

| Campo | Regla | Mensaje de error visible |
|---|---|---|
| username | required, minLength(3), maxLength(50) | "El nombre de usuario es requerido." / "Mínimo 3 caracteres." |
| email | required, email | "El correo es requerido." / "Formato de correo inválido." |
| phone | E.164: `/^\+[1-9]\d{6,14}$/` | "Formato inválido. Use E.164: +57XXXXXXXXXX" |
| role | readonly | No editable desde el formulario |

#### Gherkin de referencia

```gherkin
# CP-PF-01
Scenario: Visualización de datos del perfil personal
  Given un administrador autenticado en el sistema
  When accede a la sección "Perfil Personal" desde el menú principal
  Then el sistema muestra sus datos personales: username, email, rol y fecha de creación
  And el campo "Rol" aparece en modo solo lectura
  And los datos provienen de GET /api/admin/profile

# CP-PF-02
Scenario: Edición exitosa de datos de perfil
  Given un administrador en la sección "Perfil Personal"
  When actualiza su correo electrónico con un valor válido "nuevo@test.com"
  And selecciona "Guardar cambios"
  Then muestra el mensaje "Perfil actualizado correctamente"
  And el botón vuelve al estado "Guardar cambios"

# CP-PF-03
Scenario: Intento de guardado con correo inválido
  Given un administrador editando su perfil personal
  When ingresa "correo-invalido" en el campo email
  And el campo pierde foco
  Then el sistema muestra un error de validación inline "Formato de correo inválido"
  And el botón "Guardar cambios" permanece deshabilitado

# CP-PF-04
Scenario: Teléfono válido en formato E.164
  Given un administrador editando su perfil
  When ingresa "+573217390751" en el campo teléfono
  Then no se muestra error de validación

Scenario: Teléfono inválido sin prefijo +
  Given un administrador editando su perfil
  When ingresa "3217390751" en el campo teléfono
  Then el sistema muestra "Formato inválido. Use E.164: +57XXXXXXXXXX"
  And el botón "Guardar cambios" permanece deshabilitado

# CP-PF-05
Scenario: Botón deshabilitado si no hay cambios
  Given un administrador con perfil cargado
  When no modifica ningún campo
  Then el botón "Guardar cambios" permanece deshabilitado

# CP-PF-06
Scenario: Botón sale de "Guardando..." tras completar
  Given un administrador editando su perfil
  When selecciona "Guardar cambios"
  Then el botón muestra "Guardando..." momentáneamente
  And al completar, el botón vuelve a "Guardar cambios"
```

#### Flujo sugerido del test suite

```
beforeEach: login vía UI → crear Actor con BrowseTheWeb → NavigateToProfile
  test 1: verificar campos cargados y rol readonly (CP-PF-01)
  test 2: editar email → guardar → verificar toast éxito + botón idle (CP-PF-02)
  test 3: ingresar email inválido → verificar error inline + botón disabled (CP-PF-03)
  test 4a: ingresar teléfono E.164 válido → sin error (CP-PF-04)
  test 4b: ingresar teléfono sin + → error visible + botón disabled (CP-PF-04)
  test 5: sin cambios → botón disabled (CP-PF-05)
  test 6: editar + guardar → botón vuelve a idle (CP-PF-06)
```

---

## 5. Selectores y Estructura del DOM

### Resumen consolidado de selectores

Referencia rápida para los 3 repos:

#### Login (usado por los 2 repos de UI)

| Elemento | Selector |
|---|---|
| Campo usuario | `#username` |
| Campo contraseña | `#password` |
| Botón login | `button[type="submit"]` |

#### Perfil Personal (Screenplay Frontend)

| Elemento | Selector |
|---|---|
| Contenedor | `.profile-container` |
| Username | `#username` |
| Email | `#email` |
| Teléfono | `#phone` |
| Rol | `#role` (readonly) |
| Botón guardar | `button.btn-save` |
| Toast éxito | `.toast.success` |
| Toast error | `.toast.error` |
| Error inline | `.field-error` |
| Skeleton | `.skeleton-loader` |

#### Preferencias de Notificación (POM)

| Elemento | Selector |
|---|---|
| Contenedor | `.notification-preferences` |
| Toggle email | `input[formcontrolname="emailEnabled"]` |
| Toggle WhatsApp | `input[formcontrolname="whatsappEnabled"]` |
| Campo email | `#email` |
| Campo teléfono | `#phone` |
| Botón guardar | `button[type="submit"]` (dentro de `.notification-preferences`) |
| Mensaje éxito | `.msg-success` |
| Mensaje error | `.msg-error` |

---

## 6. Datos de Prueba

### Credenciales

| Usuario | Password | Rol | Uso |
|---|---|---|---|
| `admin` | `Admin123!` | `admin` | Todos los tests |

### Datos para crear usuario (Screenplay API)

```json
{
  "fullName": "QA Test User <timestamp>",
  "email": "qa.test.<timestamp>@cyberguard.com",
  "role": "soc_analyst",
  "username": "qa_test_<timestamp>"
}
```

> Usar timestamp (`Date.now()`) para garantizar unicidad y evitar conflictos entre ejecuciones.

### Datos para preferencias de notificación (POM)

| Campo | Valor válido |
|---|---|
| Email | `admin@cyberguard.com` |
| Teléfono E.164 | `+573217390751` |

### Datos para perfil (Screenplay Frontend)

| Campo | Valor válido | Valor inválido |
|---|---|---|
| Email | `nuevo-test@cyberguard.com` | `correo-invalido` |
| Teléfono | `+573217390751` | `3217390751` (sin `+`) |

---

## 7. Cómo Levantar el Entorno

```bash
# 1. Clonar el repo principal de CyberGuard
git clone <repo-url> cyberguard-system
cd cyberguard-system

# 2. Levantar todos los servicios
docker-compose up -d

# 3. Verificar que los servicios estén sanos
curl http://localhost:3000/health     # Backend → { "status": "ok" }
curl http://localhost:4200            # Frontend → HTML de Angular

# 4. Verificar acceso a la API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
# → Debe retornar JSON con "token"
```

### Verificar servicios individuales

```bash
# PostgreSQL
docker exec cyberguard-postgres pg_isready

# Redis
docker exec cyberguard-redis redis-cli ping   # → PONG

# RabbitMQ
curl -u guest:guest http://localhost:15672/api/healthchecks/node
```

---

## Resumen de Delegación

| Repo | Patrón | Capa | Conectar a | HU | Total Escenarios |
|---|---|---|---|---|---|
| **Repo 1** | Screenplay | API | `http://localhost:3000` | HU-01 + HU-02 (Perfil + Preferencias) | **11** |
| **Repo 2** | POM | Frontend | `http://localhost:4200` | HU-02 (Preferencias Notificación) | **5** |
| **Repo 3** | Screenplay | Frontend | `http://localhost:4200` | HU-01 (Perfil Personal) | **6** |
| | | | | **Total** | **22** |

---

> **Instrucciones para cada repo:** Toma la sección que te corresponde (4.1, 4.2 o 4.3), usa la información de conexión de la sección 2, los selectores de la sección 5, los datos de prueba de la sección 6, y arranca a implementar los escenarios asignados.