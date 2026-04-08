# Spec: Admin Profile Management
**Feature ID:** `admin-profile`
**Epic:** EP-01 — Gestión de datos personales y contacto
**Versión:** 1.0.0
**Fecha:** 06 Abr 2026
**Estimación:** S
**Estado:** `ready`

---

## 1. Contexto

El administrador del sistema CyberGuard necesita un espacio donde pueda consultar y
modificar sus datos personales (nombre de usuario, email) y agregar datos de contacto
adicionales (número telefónico). El número telefónico es prerequisito funcional para las
notificaciones externas (EP-03 / HU-05). La autenticación está delegada a Firebase Auth;
los datos de perfil extendidos residen en PostgreSQL.

---

## 2. Historias de Usuario

| ID | Historia | Estimación |
|----|----------|-----------|
| HU-01 | Como administrador quiero acceder a mis datos personales para consultarlos o modificarlos, para garantizar que la información del sistema sea precisa y actualizada. | S |
| HU-02 | Como administrador quiero agregar mi número telefónico como dato adicional de contacto, para habilitar notificaciones externas y mantener datos de contacto completos. | S |

---

## 3. Requerimientos Funcionales

### 3.1 Backend

| ID | Capa Hexagonal | Requerimiento |
|----|---------------|---------------|
| R-BE-01 | Infrastructure | El sistema SHALL exponer `GET /api/admin/profile` protegido con `authMiddleware`. |
| R-BE-02 | Infrastructure | El sistema SHALL exponer `PATCH /api/admin/profile` protegido con `authMiddleware`. |
| R-BE-03 | Infrastructure | El endpoint `PATCH` SHALL validar el body con **Joi** antes de delegar al use case. |
| R-BE-04 | Application    | El sistema SHALL impedir la modificación del campo `role` desde este endpoint. |
| R-BE-05 | Application    | El sistema SHALL registrar toda modificación de perfil en la tabla `audit_logs`. |
| R-BE-06 | Infrastructure | El sistema SHALL retornar `409 Conflict` si el nuevo email ya está registrado. |
| R-BE-07 | Infrastructure | El sistema SHALL retornar `400 Bad Request` si el body contiene campos inválidos. |
| R-BE-08 | Infrastructure | El sistema SHALL retornar `401 Unauthorized` si el token Firebase es inválido o está expirado. |
| R-BE-09 | Domain         | La entidad `AdminProfile` SHALL exponer el campo `phone` como opcional (`string \| null`). |
| R-BE-10 | Infrastructure | El sistema SHALL validar que `phone` tenga formato internacional E.164 si se provee. |

### 3.2 Frontend

| ID | Capa Hexagonal | Requerimiento |
|----|---------------|---------------|
| R-FE-01 | Presentation  | La UI SHALL mostrar una sección "Perfil Personal" accesible desde el menú principal. |
| R-FE-02 | Presentation  | La UI SHALL pre-cargar el formulario con los datos actuales del administrador. |
| R-FE-03 | Presentation  | La UI SHALL deshabilitar el campo `role` (solo lectura). |
| R-FE-04 | Presentation  | La UI SHALL mostrar estado de carga (skeleton/spinner) mientras obtiene los datos. |
| R-FE-05 | Presentation  | La UI SHALL mostrar errores de validación **inline por campo**. |
| R-FE-06 | Presentation  | La UI SHALL deshabilitar el botón "Guardar cambios" si el formulario no tiene cambios o es inválido. |
| R-FE-07 | Presentation  | La UI SHALL mostrar snackbar "Perfil actualizado correctamente" tras un `200 OK`. |
| R-FE-08 | Presentation  | La UI SHALL mostrar snackbar de error genérico ante respuestas `4xx` / `5xx`. |
| R-FE-09 | Presentation  | El campo "Número telefónico" SHALL aceptar formato internacional E.164. |
| R-FE-10 | Application   | La UI SHALL actualizar el formulario inmediatamente tras guardar sin recargar la página. |

---

## 4. Requerimientos No Funcionales

| ID | Requerimiento |
|----|---------------|
| R-NF-01 | Latencia p95 de `GET /api/admin/profile` SHALL ser ≤ 200ms (per §7.2 constitución). |
| R-NF-02 | Latencia p95 de `PATCH /api/admin/profile` SHALL ser ≤ 300ms. |
| R-NF-03 | El token Firebase SHALL verificarse en cada request (sin cache de sesión). |
| R-NF-04 | Ningún campo sensible (`firebaseUid`, `passwordHash`) SHALL exponerse en la respuesta. |
| R-NF-05 | Cobertura de tests SHALL ser ≥ 90% en use cases y controller (per §5.1 constitución). |

---

## 5. Escenarios BDD

### Feature: Gestión de perfil personal (HU-01)

```gherkin
Scenario: Visualización de datos del perfil personal
  Given  un administrador autenticado en el sistema
  When   accede a la sección "Perfil Personal" desde el menú principal
  Then   el sistema muestra sus datos personales actuales
  And    el campo role está visible pero deshabilitado

Scenario: Edición exitosa de datos de perfil
  Given  un administrador en la sección "Perfil Personal"
  When   actualiza su correo electrónico con un valor válido
  And    selecciona "Guardar cambios"
  Then   el sistema valida y almacena los nuevos datos
  And    muestra el mensaje "Perfil actualizado correctamente"
  And    el formulario refleja los datos actualizados sin recargar la página

Scenario: Intento de guardado con correo inválido
  Given  un administrador editando su perfil personal
  When   ingresa un correo electrónico con formato inválido
  And    selecciona "Guardar cambios"
  Then   el sistema muestra un error de validación inline en el campo email
  And    no persiste cambios en el perfil

Scenario: Intento de modificar role via API
  Given  un administrador autenticado con token Firebase válido
  When   realiza PATCH /api/admin/profile con { role: "superadmin" }
  Then   recibe 400 Bad Request
  And    el body contiene { error: "ROLE_MODIFICATION_NOT_ALLOWED" }

Scenario: Token inválido o expirado
  Given  un request sin token o con token expirado
  When   realiza GET /api/admin/profile o PATCH /api/admin/profile
  Then   recibe 401 Unauthorized
```

### Feature: Registro de número telefónico en perfil (HU-02)

```gherkin
Scenario: Agregar número telefónico válido
  Given  un administrador en la sección de edición de perfil
  And    el campo "Número telefónico" está vacío
  When   ingresa un número con formato E.164 válido (ej: +573001234567)
  And    selecciona "Guardar cambios"
  Then   el sistema almacena el número telefónico
  And    el cambio se refleja inmediatamente al consultar el perfil

Scenario: Intento de guardar número con formato inválido
  Given  un administrador editando su perfil
  When   ingresa un número telefónico con formato inválido (ej: "123abc")
  And    selecciona "Guardar cambios"
  Then   el sistema muestra error de validación inline en el campo teléfono
  And    no persiste cambios

Scenario: Consultar perfil con teléfono registrado
  Given  un administrador con número telefónico almacenado
  When   realiza GET /api/admin/profile
  Then   la respuesta incluye el campo phone con el número registrado
```

---

## 6. Contrato de API

### GET /api/admin/profile
**Headers:** `Authorization: Bearer <firebase-token>`

**Response 200:**
```json
{
  "username": "string",
  "email":    "string",
  "role":     "admin",
  "phone":    "string | null",
  "createdAt": "ISO8601"
}
```

### PATCH /api/admin/profile
**Headers:** `Authorization: Bearer <firebase-token>`

**Body (todos los campos opcionales):**
```json
{
  "username": "string?",
  "email":    "string?",
  "phone":    "string?"
}
```

**Responses:**

| Status | Caso |
|--------|------|
| `200` | Actualización exitosa → retorna perfil actualizado |
| `400` | Body inválido / intento de modificar `role` |
| `401` | Token Firebase inválido o expirado |
| `409` | Email ya registrado por otro usuario |

---

## 7. Capas Hexagonales Afectadas

### Backend
| Capa | Artefactos |
|------|-----------|
| **Domain** | `AdminProfile` (entity), `AdminProfilePort` (interface), `IAdminProfileRepository` (port) |
| **Application** | `GetAdminProfileUseCase`, `UpdateAdminProfileUseCase` |
| **Infrastructure** | `AdminProfileController`, `PostgresAdminProfileRepository`, `updateProfileSchema` (Joi) |

### Frontend
| Capa | Artefactos |
|------|-----------|
| **Domain** | `AdminProfileModel` (model), `IAdminProfileRepository` (abstract class) |
| **Application** | `GetAdminProfileUseCase`, `UpdateAdminProfileUseCase`, `AdminProfileFacade` |
| **Infrastructure** | `AdminProfileHttpAdapter` |
| **Presentation** | `ProfileComponent` (standalone), `ProfileFormComponent` (standalone) |

---

## 8. Dependencias

| Dependencia | Dirección | Descripción |
|-------------|-----------|-------------|
| EP-03 / HU-05 | `admin-profile` → `external-notifications` | El campo `phone` registrado aquí es prerequisito para notificaciones por WhatsApp |
| `authMiddleware` | Existente | Verifica Firebase JWT en cada request |
| Tabla `users` (PostgreSQL) | Existente | Se añaden columnas `phone`, `updated_at` |

---

## 9. Definición de Done (DoD)

- [ ] Todos los escenarios BDD cubiertos con tests unitarios (Green)
- [ ] Cobertura ≥ 90% en use cases, controller y componentes (per §5.1)
- [ ] Cero `any` en TypeScript (per §4.1)
- [ ] Campo `role` no modificable desde ningún path (R-BE-04, R-FE-03)
- [ ] Auditoría registrada en cada `PATCH` exitoso (R-BE-05)
- [ ] Migración SQL para columna `phone` en tabla `users`
- [ ] PR con checklist de seguridad §6 completado
- [ ] `plan.md` generado y aprobado antes de escribir código
