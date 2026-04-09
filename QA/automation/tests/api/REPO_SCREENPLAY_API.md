# 🎭 Repo 1 — Screenplay API: Perfil y Preferencias de Notificación (HU-01 + HU-02)

**Patrón:** Screenplay  
**Capa:** API (sin browser, solo HTTP)  
**Conectar a:** `http://localhost:3000`

---

## Conexión

| Variable | Valor default |
|---|---|
| `API_URL` | `http://localhost:3000` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `Admin123!` |

### Autenticación

1. `POST /api/auth/login` con body `{ "username": "admin", "password": "Admin123!" }`
2. Extraer campo `token` de la respuesta
3. Incluir en todos los requests: `Authorization: Bearer <token>`

---

## Endpoints bajo prueba

### Perfil del Administrador (HU-01)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/admin/profile` | Obtener datos del perfil (username, email, phone, role, createdAt) |
| `PATCH` | `/api/admin/profile` | Actualizar perfil (username, email, phone) |

**Body de actualización:**

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `username` | string | No | min 3, max 50 |
| `email` | string | No | formato email válido |
| `phone` | string \| null | No | E.164: `+` seguido de 7-15 dígitos |

### Preferencias de Notificación (HU-02)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/profile/notification-preferences` | Obtener preferencias actuales (emailEnabled, email, whatsappEnabled, phone) |
| `PUT` | `/api/profile/notification-preferences` | Guardar preferencias |

**Body de guardado:**

| Campo | Tipo | Descripción |
|---|---|---|
| `emailEnabled` | boolean | Activar/desactivar canal email |
| `email` | string | Dirección de destino |
| `whatsappEnabled` | boolean | Activar/desactivar canal WhatsApp |
| `phone` | string | Número E.164 de destino |

---

## Escenarios asignados

### Perfil (HU-01) — Capa API

| ID | Escenario | Tipo | Endpoint | HTTP esperado |
|---|---|---|---|---|
| **CP-PF-01-API** | Obtener datos del perfil | Happy Path | `GET /api/admin/profile` | 200 |
| **CP-PF-02-API** | Actualizar email con valor válido | Happy Path | `PATCH /api/admin/profile` | 200 |
| **CP-PF-03-API** | Rechazo por email inválido | Error Path | `PATCH /api/admin/profile` | 400 |
| **CP-PF-04-API** | Actualizar teléfono E.164 válido | Happy Path | `PATCH /api/admin/profile` | 200 |
| **CP-PF-04b-API** | Rechazo por teléfono sin formato E.164 | Error Path | `PATCH /api/admin/profile` | 400 |
| **CP-PF-06-API** | Petición sin token retorna 401 | Seguridad | `GET /api/admin/profile` | 401 |

### Preferencias de Notificación (HU-02) — Capa API

| ID | Escenario | Tipo | Endpoint | HTTP esperado |
|---|---|---|---|---|
| **CP-NP-01-API** | Obtener preferencias actuales | Happy Path | `GET /api/profile/notification-preferences` | 200 |
| **CP-NP-02-API** | Activar canal de email | Happy Path | `PUT /api/profile/notification-preferences` | 200 |
| **CP-NP-03-API** | Activar canal de WhatsApp | Happy Path | `PUT /api/profile/notification-preferences` | 200 |
| **CP-NP-02b-API** | Desactivar canal de email | Happy Path | `PUT /api/profile/notification-preferences` | 200 |
| **CP-NP-03b-API** | Desactivar canal de WhatsApp | Happy Path | `PUT /api/profile/notification-preferences` | 200 |

---

## Gherkin de referencia

### Perfil (HU-01)

**CP-PF-01-API — Obtener datos del perfil**  
- Given: Administrador autenticado con JWT válido  
- When: GET `/api/admin/profile`  
- Then: HTTP 200  
- And: Body contiene username, email, role, createdAt  
- And: El campo role tiene un valor asignado

**CP-PF-02-API — Actualizar email con valor válido**  
- Given: Administrador autenticado  
- When: PATCH `/api/admin/profile` con `{ "email": "nuevo@cyberguard.com" }`  
- Then: HTTP 200  
- And: Body refleja el email actualizado  
- And: Un GET posterior confirma la persistencia

**CP-PF-03-API — Rechazo por email inválido**  
- Given: Administrador autenticado  
- When: PATCH `/api/admin/profile` con `{ "email": "correo-invalido" }`  
- Then: HTTP 400  
- And: Mensaje descriptivo del error de validación

**CP-PF-04-API — Actualizar teléfono E.164 válido**  
- Given: Administrador autenticado  
- When: PATCH `/api/admin/profile` con `{ "phone": "+573217390751" }`  
- Then: HTTP 200  
- And: Body refleja el teléfono actualizado

**CP-PF-04b-API — Rechazo por teléfono sin formato E.164**  
- Given: Administrador autenticado  
- When: PATCH `/api/admin/profile` con `{ "phone": "3217390751" }` (sin `+`)  
- Then: HTTP 400  
- And: Mensaje de error de validación

**CP-PF-06-API — Petición sin token retorna 401**  
- Given: Request sin header Authorization  
- When: GET `/api/admin/profile`  
- Then: HTTP 401, "Unauthorized"

### Preferencias de Notificación (HU-02)

**CP-NP-01-API — Obtener preferencias actuales**  
- Given: Administrador autenticado  
- When: GET `/api/profile/notification-preferences`  
- Then: HTTP 200  
- And: Body contiene emailEnabled, email, whatsappEnabled, phone

**CP-NP-02-API — Activar canal de email**  
- Given: Administrador autenticado  
- When: PUT `/api/profile/notification-preferences` con `{ "emailEnabled": true, "email": "admin@cyberguard.com", "whatsappEnabled": false, "phone": "" }`  
- Then: HTTP 200  
- And: Un GET posterior confirma emailEnabled=true

**CP-NP-03-API — Activar canal de WhatsApp**  
- Given: Administrador autenticado  
- When: PUT con `{ "emailEnabled": false, "email": "", "whatsappEnabled": true, "phone": "+573217390751" }`  
- Then: HTTP 200  
- And: Un GET posterior confirma whatsappEnabled=true

**CP-NP-02b-API — Desactivar canal de email**  
- Given: emailEnabled=true actualmente  
- When: PUT con `{ "emailEnabled": false, ... }`  
- Then: HTTP 200  
- And: Un GET posterior confirma emailEnabled=false

**CP-NP-03b-API — Desactivar canal de WhatsApp**  
- Given: whatsappEnabled=true actualmente  
- When: PUT con `{ "whatsappEnabled": false, ... }`  
- Then: HTTP 200  
- And: Un GET posterior confirma whatsappEnabled=false

---

## Datos de prueba

### Perfil

| Campo | Valor válido | Valor inválido |
|---|---|---|
| email | `nuevo@cyberguard.com` | `correo-invalido` |
| phone | `+573217390751` | `3217390751` (sin `+`) |
| username | `admin_updated` | — |

### Preferencias

| Campo | Activar | Desactivar |
|---|---|---|
| emailEnabled | `true` + email: `admin@cyberguard.com` | `false` |
| whatsappEnabled | `true` + phone: `+573217390751` | `false` |

---

## Flujo sugerido del test suite

1. **beforeAll**: login → obtener JWT → crear contexto HTTP autenticado
2. GET `/api/admin/profile` → verificar 200, campos presentes (CP-PF-01-API)
3. PATCH perfil con email válido → verificar 200 + persistencia (CP-PF-02-API)
4. PATCH perfil con email inválido → verificar 400 (CP-PF-03-API)
5. PATCH perfil con teléfono E.164 válido → verificar 200 (CP-PF-04-API)
6. PATCH perfil con teléfono sin `+` → verificar 400 (CP-PF-04b-API)
7. GET profile sin token → verificar 401 (CP-PF-06-API)
8. GET `/api/profile/notification-preferences` → verificar 200, campos presentes (CP-NP-01-API)
9. PUT preferencias con emailEnabled=true → verificar 200 + GET confirma (CP-NP-02-API)
10. PUT preferencias con whatsappEnabled=true → verificar 200 + GET confirma (CP-NP-03-API)
11. PUT preferencias con emailEnabled=false → verificar 200 + GET confirma (CP-NP-02b-API)
12. PUT preferencias con whatsappEnabled=false → verificar 200 + GET confirma (CP-NP-03b-API)
13. **afterAll**: restaurar perfil y preferencias al estado original (cleanup)