# 🧩 Repo 2 — POM Frontend: Preferencias de Notificación (HU-02)

**Patrón:** Page Object Model  
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
**Componente:** `<app-notification-preferences>`  
**API que consume:** `GET /api/profile/notification-preferences` y `PUT /api/profile/notification-preferences`

---

## Selectores del DOM

| Elemento | Selector | Notas |
|---|---|---|
| Contenedor raíz | `.notification-preferences` | Esperar visible para confirmar carga |
| Toggle email | `input[formcontrolname="emailEnabled"]` | Checkbox |
| Toggle WhatsApp | `input[formcontrolname="whatsappEnabled"]` | Checkbox |
| Campo email | `#email` | Se deshabilita si toggle off |
| Campo teléfono | `#phone` | Se deshabilita si toggle off |
| Botón guardar | `button[type="submit"]` (dentro de `.notification-preferences`) | Texto cambia a "Guardando..." mientras guarda |
| Mensaje éxito | `.msg-success` | Visible solo tras guardado exitoso |
| Mensaje error | `.msg-error` | Visible solo si hay error |

### Selectores del login (para el beforeEach)

| Elemento | Selector |
|---|---|
| Campo usuario | `#username` |
| Campo contraseña | `#password` |
| Botón login | `button[type="submit"]` |

---

## Escenarios asignados

| ID | Escenario | HU | Tipo |
|---|---|---|---|
| **CP-NP-01** | Visualización de preferencias actuales | HU-02 | Happy Path |
| **CP-NP-02** | Activar canal de email | HU-02 | Happy Path |
| **CP-NP-03** | Activar canal de WhatsApp | HU-02 | Happy Path |
| **CP-NP-04** | Toggle deshabilita campo de contacto | HU-02 | UX |
| **CP-NP-05** | Botón guardar sale de loading | HU-02 | UX |

---

## Gherkin de referencia

**CP-NP-01 — Visualización de preferencias actuales**  
- Given: Administrador autenticado en la sección de preferencias  
- When: La página carga  
- Then: Los toggles de email y WhatsApp están visibles y reflejan el estado guardado  
- And: Los campos de contacto están habilitados/deshabilitados según su toggle  
- And: El botón muestra "Guardar Preferencias"

**CP-NP-02 — Activar canal de email**  
- Given: `emailEnabled=false`  
- When: Activa el toggle "Email", ingresa `"admin@cyberguard.com"`, click en "Guardar Preferencias"  
- Then: Se muestra "Preferencias guardadas correctamente."  
- And: El botón vuelve a "Guardar Preferencias"

**CP-NP-03 — Activar canal de WhatsApp**  
- Given: `whatsappEnabled=false`  
- When: Activa el toggle "WhatsApp", ingresa `"+573217390751"`, click en "Guardar Preferencias"  
- Then: Se muestra mensaje de éxito  
- And: El botón vuelve a "Guardar Preferencias"

**CP-NP-04 — Toggle deshabilita campo de contacto**  
- Given: Toggle email activado → campo email habilitado  
- When: Desactiva el toggle  
- Then: El campo email queda `disabled`  
- And: Permanece visible con su valor actual  
- (Aplicar lo mismo para WhatsApp/teléfono)

**CP-NP-05 — Botón guardar sale de loading**  
- Given: Se modifican preferencias  
- When: Click en "Guardar Preferencias"  
- Then: El botón muestra "Guardando..." momentáneamente  
- And: Al completar, vuelve a "Guardar Preferencias" (no se queda en loading)

---

## Datos de prueba

| Campo | Valor válido |
|---|---|
| Email | `admin@cyberguard.com` |
| Teléfono E.164 | `+573217390751` |

---

## Flujo sugerido del test suite

1. **beforeEach**: login vía UI → navegar a `/profile` → esperar `.notification-preferences` visible
2. Verificar toggles, campos y botón visibles (CP-NP-01)
3. Activar email toggle → llenar email → guardar → verificar éxito + botón idle (CP-NP-02)
4. Activar WhatsApp toggle → llenar phone → guardar → verificar éxito (CP-NP-03)
5. Activar toggle → confirmar campo enabled → desactivar → confirmar campo disabled (CP-NP-04)
6. Activar toggle → llenar campo → guardar → verificar que botón no queda en "Guardando..." (CP-NP-05)