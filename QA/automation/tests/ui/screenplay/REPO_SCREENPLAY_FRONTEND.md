# 🎬 Repo 3 — Screenplay Frontend: Perfil Personal (HU-01)

**Patrón:** Screenplay  
**Capa:** Frontend (browser)  
**Conectar a:** `http://localhost:4200`

---

## Conexión

| Variable | Valor default |
|---|---|
| `BASE_URL` | `http://localhost:4200` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `Admin123!` |

### Autenticación (vía UI)

1. Navegar a `/autenticacion`
2. Llenar `#username` → `"admin"`, `#password` → `"Admin123!"`
3. Click en `button[type="submit"]`
4. Esperar redirect a `/dashboard`
5. Navegar a `/profile` para acceder a la vista bajo prueba

---

## Vista bajo prueba

**Ruta:** `/profile`  
**Componente:** `<app-profile>`  
**API que consume:** `GET /api/admin/profile` y `PATCH /api/admin/profile`

---

## Selectores del DOM

| Elemento | Selector | Notas |
|---|---|---|
| Contenedor raíz | `.profile-container` | Esperar visible para confirmar carga |
| Skeleton loader | `.skeleton-loader` | Esperar hidden antes de interactuar |
| Campo username | `#username` | Requerido, min 3, max 50 |
| Campo email | `#email` | Requerido, validación formato email |
| Campo teléfono | `#phone` | Opcional, validación E.164 (`+` + 7-15 dígitos) |
| Campo rol | `#role` | **readonly** — no editable |
| Botón guardar | `button.btn-save` | Disabled si form inválido o sin cambios |
| Toast éxito | `.toast.success` | Texto: "Perfil actualizado correctamente." |
| Toast error | `.toast.error` | Mensaje dinámico |
| Error de campo | `.field-error` | Inline, debajo del campo con error |

### Selectores del login (para el beforeEach)

| Elemento | Selector |
|---|---|
| Campo usuario | `#username` |
| Campo contraseña | `#password` |
| Botón login | `button[type="submit"]` |

---

## Validaciones del formulario

| Campo | Regla | Mensaje de error visible |
|---|---|---|
| username | required, minLength(3), maxLength(50) | "El nombre de usuario es requerido." / "Mínimo 3 caracteres." |
| email | required, email format | "El correo es requerido." / "Formato de correo inválido." |
| phone | E.164: `/^\+[1-9]\d{6,14}$/` | "Formato inválido. Use E.164: +57XXXXXXXXXX" |
| role | readonly | No editable desde el formulario |

### Comportamiento del botón "Guardar cambios"

- **Disabled** si: formulario inválido, o no hay cambios respecto al original
- **Enabled** si: al menos un campo cambió y el formulario es válido
- **Texto "Guardando..."** mientras se procesa la petición PATCH
- **Vuelve a "Guardar cambios"** al completar (éxito o error)

---

## Escenarios asignados

| ID | Escenario | HU | Tipo |
|---|---|---|---|
| **CP-PF-01** | Visualización de datos del perfil | HU-01 | Happy Path |
| **CP-PF-02** | Edición exitosa de datos de perfil | HU-01 | Happy Path |
| **CP-PF-03** | Validación de correo inválido | HU-01 | Error Path |
| **CP-PF-04** | Validación de teléfono E.164 (válido e inválido) | HU-01 | Boundary |
| **CP-PF-05** | Botón guardar sin cambios | HU-01 | Edge Case |
| **CP-PF-06** | Botón guardar vuelve a estado idle | HU-01 | Resiliencia |

---

## Gherkin de referencia

**CP-PF-01 — Visualización de datos del perfil**  
- Given: Administrador autenticado  
- When: Accede a `/profile`  
- Then: Se muestran username, email, phone, rol y fecha de creación  
- And: El campo "Rol" (`#role`) está en modo readonly  
- And: Los datos provienen de `GET /api/admin/profile`

**CP-PF-02 — Edición exitosa de datos de perfil**  
- Given: Administrador en la sección "Perfil Personal"  
- When: Actualiza el email con `"nuevo-test@cyberguard.com"`, click en "Guardar cambios"  
- Then: Se muestra toast `.toast.success` con "Perfil actualizado correctamente."  
- And: El botón vuelve a "Guardar cambios"

**CP-PF-03 — Validación de correo inválido**  
- Given: Administrador editando su perfil  
- When: Ingresa `"correo-invalido"` en `#email` y el campo pierde foco  
- Then: Aparece `.field-error` con "Formato de correo inválido."  
- And: `button.btn-save` permanece disabled

**CP-PF-04 — Validación de teléfono E.164**  
- *Caso válido:*  
  - When: Ingresa `"+573217390751"` en `#phone`  
  - Then: No aparece `.field-error`

- *Caso inválido:*  
  - When: Ingresa `"3217390751"` (sin `+`) en `#phone`  
  - Then: Aparece `.field-error` con "Formato inválido. Use E.164: +57XXXXXXXXXX"  
  - And: `button.btn-save` permanece disabled

**CP-PF-05 — Botón guardar sin cambios**  
- Given: Perfil cargado sin modificaciones  
- When: No se modifica ningún campo  
- Then: `button.btn-save` permanece disabled

**CP-PF-06 — Botón guardar vuelve a estado idle**  
- Given: Se modifica el email  
- When: Click en "Guardar cambios"  
- Then: El botón muestra "Guardando..." momentáneamente  
- And: Al completar, vuelve a "Guardar cambios"

---

## Datos de prueba

| Campo | Valor válido | Valor inválido |
|---|---|---|
| Email | `nuevo-test@cyberguard.com` | `correo-invalido` |
| Teléfono | `+573217390751` | `3217390751` (sin `+`) |

---

## Flujo sugerido del test suite

1. **beforeEach**: login vía UI → navegar a `/profile` → esperar `.profile-container` visible y `.skeleton-loader` hidden
2. Verificar campos cargados con valores y `#role` readonly (CP-PF-01)
3. Editar email → guardar → verificar toast éxito + botón idle (CP-PF-02)
4. Ingresar email inválido → blur → verificar `.field-error` + botón disabled (CP-PF-03)
5. Ingresar teléfono E.164 válido → verificar que no hay error (CP-PF-04)
6. Ingresar teléfono sin `+` → verificar `.field-error` + botón disabled (CP-PF-04)
7. Sin cambios → verificar botón disabled (CP-PF-05)
8. Editar + guardar → verificar que botón vuelve a "Guardar cambios" (CP-PF-06)
