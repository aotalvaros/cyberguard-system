**TDD para la nueva feature `comp`**

Resumen
- Feature objetivo: flujo de reportar una amenaza desde el componente `Dashboard` (formularios, `ReportThreatUseCase`, persistencia en `ThreatRepository`) y la visualización de estadísticas en `StatisticsWidget`.
- Enfoque: aplicar TDD (Red → Green → Refactor) a nivel de unidad y de integración para asegurar comportamiento observable por el usuario y correctitud interna.

Qué pruebas añadimos y su propósito
- `src/presentation/components/dashboard/__tests__/dashboard.integration.spec.ts`
  - Tipo: Integración
  - Valida: el flujo end-to-end del reporte de amenazas desde el formulario hasta el repositorio en memoria y la actualización de la UI (mensaje de éxito). También valida que `StatisticsWidget` reciba y muestre estadísticas reales. (Prueba de aceptación / validación del comportamiento)

- `src/presentation/components/dashboard/__tests__/dashboard.component.spec.ts`
  - Tipo: Unitarias (componente)
  - Verifican: validaciones del formulario (`ipValidator`), lógica local de `onSubmit` (llamadas al `ReportThreatUseCase`, manejo de `loading`, `success`, `error`), y `logout()` (invocación del `LogoutUseCase` y navegación). Estas pruebas aíslan dependencias mediante mocks.

- `src/presentation/components/dashboard/statistics-widget/statistics-widget.component.spec.ts`
  - Tipo: Unitarias (componente standalone)
  - Verifican: que el componente suscribe correctamente al `GetStatisticsUseCase`, maneja errores con `catchError` y muestra `EMPTY_STATISTICS` en fallos.

- `src/presentation/components/alerts/__tests__/alerts.component.spec.ts`
  - Tipo: Unitarias (componente)
  - Verifican: suscripción a mensajes WebSocket, filtrado/paginación de alertas y llamadas a `DeleteThreatUseCase` cuando corresponde.

Clasificación: cuáles validan y cuáles verifican
- Pruebas de validación (aceptación): aquellas que ejercitan el comportamiento observado por el usuario y garantizan que la feature cumple el requisito. En nuestro caso la prueba de integración `dashboard.integration.spec.ts` es la principal prueba de validación: asegura que, desde el formulario, la amenaza llega al repositorio y la UI responde (mensaje de éxito, estadísticas renderizadas).

- Pruebas de verificación: pruebas unitarias que aseguran que cada pieza funciona según su contrato interno. Ejemplos: `ipValidator` y los flujos de error/success en `dashboard.component.spec.ts`, y las funciones del `AlertsDomainService` cubiertas por sus especs. Estas pruebas comprueban la implementación y mantienen regresiones bajo control.

Cómo diferenciarlas (reglas prácticas)
- Alcance de dependencias:
  - Unitarias: la unidad bajo prueba se aísla (mocks/stubs para repositorios, use-cases, servicios). Se ejecutan sin integrar otras capas.
  - Integración: varias capas reales se inyectan juntas (use-cases → domain services → repositorios en memoria o adaptadores reales) y se comprueba la interacción entre ellas.

- Velocidad y estabilidad:
  - Unitarias: rápidas, determinísticas, ejecutan en milisegundos.
  - Integración: más lentas (ej.: TestBed + DI + async observables), pero aún dentro del ciclo de CI rápido.

- Propósito:
  - Unitarias: verificar contratos y lógica (¿esto hace X correctamente?).
  - Integración: validar flujos y efectos colaterales (¿la feature completa cumple la necesidad del usuario?).

- Señales en código:
  - Tests que usan `TestBed` y registran proveedores concretos (no mocks) o in-memory adapters → integración.
  - Tests que crean instancias y proveen `useValue`/`vi.fn()` para dependencias → unitarias.

Recomendaciones prácticas para mantener TDD sano
- Escribe primero las pruebas unitarias que fallen (red) para la lógica crítica: validadores, transformaciones, reglas de negocio (`ThreatDomainService`, `AlertsDomainService`).
- Implementa lo mínimo para pasar las unitarias (green). Refactoriza. Repite.
- Añade/actualiza una prueba de integración que refleje la historia de usuario completa (form submit → persistencia → UI update). Mantén la integración breve y determinística usando adaptadores en memoria cuando sea posible.
- Mantén las pruebas de integración pocas y enfocadas en flujos críticos; confía en unitarias para cubrir combinaciones y bordes.

Cómo se aplicó aquí (resumen práctico)
- Unit tests existentes cubren validadores, domain services y componentes aislados (`dashboard.component.spec.ts`, `statistics-widget.component.spec.ts`, `alerts.component.spec.ts`).
- Se añadió `dashboard.integration.spec.ts` para validar el requisito funcional principal: reportar una amenaza y mostrar estadísticas.
 - Se añadió `dashboard.integration.spec.ts` para validar el requisito funcional principal: reportar una amenaza y mostrar estadísticas.
 - Se añadió `alerts.integration.spec.ts` para validar el flujo de `Alerts` con WebSocket en memoria, eliminación individual de alertas (`deleteAlert`) y limpieza masiva (`clearAll`).

Dónde está el archivo de pruebas relevante
- Integración: `src/presentation/components/dashboard/__tests__/dashboard.integration.spec.ts`
- Unidad (muestras):
  - `src/presentation/components/dashboard/__tests__/dashboard.component.spec.ts`
  - `src/presentation/components/dashboard/statistics-widget/statistics-widget.component.spec.ts`
  - `src/presentation/components/alerts/__tests__/alerts.component.spec.ts`

Ejecución rápida
- Ejecutar todas las pruebas con coverage:
  ```bash
  cd frontend/cyberguard-system-appv2
  npm run test:coverage -- --watch=false
  ```

Notas finales
- Mantén la regla: unitarias para lógica, integración para flujos. Usa TDD (red/green/refactor) iterativo y agrega pruebas de integración sólo cuando la funcionalidad ya tenga sus unidades verificadas.

---
Generado automáticamente en el proceso de implementación de la feature `comp`.
