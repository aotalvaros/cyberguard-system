# 📋 Plan de Pruebas del Sprint - CyberGuard System


**Versión:** 1.1  
**Fecha:** 9 de marzo de 2026  
**Responsable QA:** QA Senior Engineer  
**Sprint:** Detección y Respuesta a Amenazas v1.0

---

## 1. Propósito del plan

Este plan define la estrategia de pruebas para el sprint enfocado en capacidades clave del negocio de CyberGuard: acceso seguro al sistema, detección temprana de actividad sospechosa, registro manual de incidentes y visualización de información para la toma de decisiones.

El objetivo principal de QA en este sprint no es validar tecnologías de forma aislada, sino asegurar que el producto entregue valor de negocio con un nivel de riesgo aceptable, especialmente en funcionalidades relacionadas con seguridad, monitoreo y trazabilidad de amenazas.

---

## 2. Objetivos de calidad del sprint

Durante este sprint, el equipo buscará asegurar que:

- los usuarios autorizados puedan autenticarse de forma segura y consistente;
- el sistema identifique eventos sospechosos relevantes para el negocio;
- las alertas críticas sean visibles oportunamente para el administrador;
- los reportes manuales de amenazas puedan registrarse sin afectar la integridad de la información;
- la información visual del sistema permita entender el estado de la seguridad sin ambigüedad;
- los defectos de alto impacto sobre seguridad, continuidad operativa o confianza del usuario sean detectados tempranamente.

---

## 3. Alcance funcional del sprint

### 3.1 Historias de usuario en alcance

#### HU-01: Inicio de sesión seguro
Como usuario, quiero iniciar sesión de forma segura para acceder al sistema.

**Valor de negocio:** proteger el acceso a la plataforma y evitar accesos indebidos.  
**Riesgo de negocio:** alto.

#### HU-02: Detección de inicios de sesión sospechosos en tiempo real
Como administrador, quiero que el sistema detecte inicios de sesión sospechosos y los muestre en tiempo real.

**Valor de negocio:** respuesta temprana ante posibles amenazas.  
**Riesgo de negocio:** muy alto.

#### HU-03: Registro manual de reportes de amenazas
Como administrador, quiero agregar reportes manuales de amenazas.

**Valor de negocio:** complementar la detección automática con criterio operativo.  
**Riesgo de negocio:** medio.

#### HU-04: Visualización gráfica de datos de seguridad
Como administrador, quiero visualizar los datos de amenazas de manera más gráfica y comprensible.

**Valor de negocio:** facilitar análisis, seguimiento y priorización.  
**Riesgo de negocio:** medio-bajo.

---

## 4. Fuera de alcance del sprint

Para este sprint no se considerarán como parte del compromiso principal de QA:

- pruebas formales de pentesting;
- validaciones avanzadas de accesibilidad o cumplimiento WCAG;
- certificación completa multi-navegador o multi-dispositivo;
- pruebas de carga a escala productiva;
- validaciones de internacionalización;
- hardening de infraestructura fuera de los criterios mínimos del sprint;
- pruebas exhaustivas de operación en ambientes productivos reales.

Estas actividades pueden recomendarse como trabajo posterior, pero no condicionan el cierre funcional del sprint salvo que se identifique un riesgo crítico.

### 4.1 Supuestos y dependencias del sprint

Este plan asume que:

- las historias de usuario cuentan con criterios de aceptación mínimos definidos;
- el equipo de desarrollo entregará una versión funcional e instalable para validación;
- existirán ambientes o medios controlados para ejecutar validaciones funcionales, técnicas y exploratorias;
- el producto dispondrá de datos mínimos de prueba para validar alertas, autenticación, reportes y visualización;
- las dependencias críticas del flujo, aunque no sean objetivo principal del plan, estarán disponibles durante la ejecución de QA.

### 4.2 Exclusiones operativas adicionales

Tampoco forman parte del alcance de este documento:

- definición detallada de scripts automatizados;
- documentación técnica de arquitectura;
- procedimientos de despliegue productivo;
- manuales operativos o de soporte de usuario.

---

## 5. Enfoque de pruebas recomendado

### 5.1 Estrategia principal: pruebas basadas en riesgos

La estrategia dominante del sprint será **Risk-Based Testing**, porque el producto opera sobre un contexto de ciberseguridad y monitoreo, donde no todas las funcionalidades tienen el mismo impacto.

Se priorizarán los escenarios cuya falla pueda provocar:

- acceso no autorizado;
- pérdida de visibilidad ante eventos sospechosos;
- información incompleta o engañosa para el administrador;
- fallos de confianza en la operación diaria del sistema.

### 5.2 Estrategias complementarias

Además del enfoque basado en riesgos, se usarán las siguientes estrategias:

- **Model-Based Testing:** para flujos con estados claros, como autenticación, bloqueo y ciclo de vida de alertas.
- **Boundary Value Analysis:** para entradas con restricciones definidas, como campos obligatorios, severidad, fechas y longitudes.
- **Equivalence Partitioning:** para reducir combinaciones de datos sin perder cobertura funcional.
- **Exploratory Testing:** para detectar inconsistencias de experiencia, visualización, sincronización y comportamiento no previsto.
- **Pruebas orientadas a seguridad:** como línea transversal, especialmente en login, entradas manuales y visualización de datos sensibles.

---

## 6. Priorización de riesgos del negocio

| Funcionalidad | Riesgo de negocio | Motivo de prioridad |
|---|---|---|
| Inicio de sesión | Alto | Es la puerta de entrada al sistema y compromete la seguridad del acceso |
| Alertas de login sospechoso en tiempo real | Muy alto | Es parte del valor central del producto y afecta la capacidad de reacción |
| Reportes manuales de amenazas | Medio | Impacta la trazabilidad y la operación del administrador |
| Visualización gráfica y estadísticas | Medio-bajo | Afecta análisis y comprensión, pero no impide la operación básica |

### Distribución sugerida del esfuerzo de testing

- Inicio de sesión seguro: **30%**
- Detección y visualización de alertas en tiempo real: **35%**
- Registro manual de reportes: **20%**
- Visualización gráfica y dashboard: **15%**

### 6.1 Criterios de priorización para ejecución

La ejecución de QA debe priorizarse considerando estos factores:

- impacto al negocio;
- probabilidad de falla;
- criticidad para seguridad;
- frecuencia de uso del flujo;
- dependencia con otros componentes del sistema;
- visibilidad del defecto para el usuario final o el administrador.

---

## 7. Niveles de prueba

### 7.1 Pruebas unitarias

**Objetivo:** validar reglas de negocio, validaciones y comportamientos aislados.

En este nivel se priorizará la confiabilidad de la lógica que soporta:

- validación de credenciales y reglas de autenticación;
- clasificación o marcación de eventos sospechosos;
- validación de datos ingresados en reportes manuales;
- cálculo, agrupación o preparación de datos para visualización.

**Cobertura esperada:**

- mínimo **85%** en lógica crítica de negocio;
- mínimo **70%** de cobertura general en los módulos bajo alcance del sprint.

**Criterio QA:** las pruebas unitarias deben proteger las reglas, no los detalles de implementación.

---

### 7.2 Pruebas de integración

**Objetivo:** validar que los flujos de negocio no se rompan al pasar de un componente a otro.

En este sprint interesan especialmente las integraciones que soportan:

- autenticación completa;
- emisión y recepción de eventos sospechosos;
- persistencia de historial;
- actualización de información visible para el administrador;
- consistencia entre registro manual, consulta y visualización.

**Criterio QA:** las integraciones deben comprobar que el dato correcto viaja, se procesa y termina en el punto esperado del flujo.

---

### 7.3 Pruebas de sistema

**Objetivo:** validar el comportamiento del producto como una capacidad de negocio completa.

Escenarios prioritarios:

- un usuario accede correctamente al sistema;
- un intento sospechoso genera una alerta visible para el administrador;
- el historial permanece disponible tras recarga o continuidad operativa;
- un administrador registra una amenaza manualmente y esta queda disponible para consulta;
- el dashboard muestra información comprensible, consistente y actualizada;
- el sistema se comporta de forma controlada ante fallos de dependencias críticas.

**Criterio QA:** este nivel debe demostrar que la historia de usuario funciona como experiencia real del sistema.

---

### 7.4 Pruebas end-to-end (E2E)

**Objetivo:** validar los recorridos de mayor valor desde la perspectiva del usuario final.

Flujos E2E sugeridos:

1. acceso exitoso al sistema;
2. intentos fallidos de acceso y bloqueo esperado;
3. generación de alerta sospechosa y visualización en tiempo real;
4. creación de reporte manual y verificación posterior en el sistema;
5. actualización de dashboard con información consistente;
6. persistencia de alertas después de refrescar la interfaz.

**Criterio QA:** solo deben automatizarse primero los recorridos de mayor impacto y frecuencia.

### 7.5 Matriz de cobertura por historia y nivel

| Historia de usuario | Unitarias | Integración | Sistema | E2E |
|---|---|---|---|---|
| HU-01 Inicio de sesión seguro | reglas de validación, bloqueo, expiración | autenticación entre componentes | acceso completo con políticas activas | login, rechazo, bloqueo, expiración |
| HU-02 Alertas sospechosas en tiempo real | clasificación, deduplicación, límites | flujo de generación, propagación y recuperación | visibilidad de alerta y persistencia | alerta visible en recorrido real |
| HU-03 Reportes manuales | validación de campos y reglas | registro, consulta y consistencia del dato | registro completo en producto | creación y verificación del reporte |
| HU-04 Visualización gráfica | preparación y agrupación de datos | entrega de información a la vista | visualización coherente y estable | consulta visual desde perspectiva de usuario |

---

## 8. Tipos de prueba por funcionalidad

| Funcionalidad | Tipos de prueba recomendados |
|---|---|
| Inicio de sesión | funcionales, negativas, seguridad, integración, E2E |
| Alertas sospechosas en tiempo real | funcionales, integración, sistema, E2E, resiliencia |
| Reporte manual de amenazas | funcionales, validación de datos, negativas, integración, E2E |
| Dashboard y visualización | funcionales, consistencia de datos, exploratorias, sistema, E2E |

---

## 9. Técnicas de diseño de pruebas a aplicar

Para que el plan no se limite a validar flujos generales, QA aplicará técnicas de diseño de pruebas que permitan optimizar cobertura, detectar defectos relevantes temprano y justificar la selección de escenarios.

### 9.1 Partición de equivalencias

Se utilizará para agrupar entradas con comportamiento esperado similar y evitar casos redundantes.

**Aplicación sugerida en el sprint:**

- credenciales válidas vs inválidas en inicio de sesión;
- roles autorizados vs no autorizados;
- reportes manuales completos vs incompletos vs malformados;
- severidades válidas vs no válidas en amenazas;
- datos gráficos disponibles vs ausencia de datos vs datos parciales.

**Ejemplos de clases de equivalencia:**

| Flujo | Clases válidas | Clases inválidas |
|---|---|---|
| Login | usuario existente + contraseña correcta | usuario inexistente, contraseña incorrecta, campos vacíos |
| Reporte manual | título, tipo y severidad válidos | campos obligatorios nulos, formato inválido, severidad fuera del catálogo |
| Dashboard | datos completos y consistentes | datos vacíos, datos incompletos, datos inconsistentes |

### 9.2 Análisis de valores frontera

Se aplicará cuando existan límites de negocio o restricciones de datos, ya que los defectos suelen concentrarse alrededor de esos bordes.

**Aplicación sugerida en el sprint:**

- longitud mínima y máxima de campos de login o formularios;
- cantidad de intentos fallidos antes del bloqueo;
- cantidad máxima de alertas en historial visible;
- límites de fechas, rangos o períodos en estadísticas;
- tamaños mínimos y máximos permitidos en descripciones de reportes.

**Ejemplos de valores frontera:**

| Regla | Casos frontera sugeridos |
|---|---|
| Bloqueo por intentos fallidos | 4, 5 y 6 intentos |
| Campo obligatorio con longitud mínima 1 | 0, 1 y 2 caracteres |
| Campo con máximo 255 caracteres | 254, 255 y 256 caracteres |
| Historial máximo de alertas | 199, 200 y 201 alertas |

### 9.3 Pruebas basadas en estados o modelo

Se usarán en flujos donde la respuesta del sistema cambia según el estado previo.

**Aplicación sugerida en el sprint:**

- autenticación: no autenticado, autenticado, bloqueado, sesión expirada;
- alertas: generada, recibida, visualizada, persistida, eliminada;
- dashboard: sin datos, con datos, con actualización en tiempo real.

**Transiciones críticas a validar:**

- de intento fallido repetido a usuario bloqueado;
- de evento sospechoso detectado a alerta visible;
- de recarga de interfaz a recuperación de historial;
- de eliminación individual a actualización de la vista.

### 9.4 Pruebas exploratorias

Se usarán para encontrar defectos no previstos por los casos formales, especialmente en:

- comportamiento visual del dashboard;
- sincronización en tiempo real;
- consistencia entre vistas y filtros;
- mensajes de error o ayuda al usuario.

---

## 10. Casos de prueba representativos por historia de usuario

Esta sección define ejemplos de casos de prueba diseñados con técnicas formales. No pretende ser el inventario completo de ejecución, sino una guía base para construir la suite del sprint.

### 10.1 HU-01 - Inicio de sesión seguro

| ID | Técnica | Condición a validar | Resultado esperado |
|---|---|---|---|
| CP-LG-01 | Partición de equivalencias | usuario válido y contraseña válida | acceso permitido |
| CP-LG-02 | Partición de equivalencias | usuario válido y contraseña inválida | acceso rechazado con mensaje controlado |
| CP-LG-03 | Partición de equivalencias | usuario inexistente | acceso rechazado sin revelar información sensible |
| CP-LG-04 | Valores frontera | campo usuario vacío | validación de obligatoriedad |
| CP-LG-05 | Valores frontera | contraseña con longitud mínima permitida | comportamiento conforme a regla |
| CP-LG-06 | Valores frontera | contraseña por debajo del mínimo permitido | rechazo del campo |
| CP-LG-07 | Basada en estados | 4 intentos fallidos consecutivos | usuario aún no bloqueado |
| CP-LG-08 | Basada en estados | 5 intentos fallidos consecutivos | usuario bloqueado según política |
| CP-LG-09 | Basada en estados | sesión expirada | redirección o rechazo controlado |

### 10.2 HU-02 - Alertas de inicio de sesión sospechoso en tiempo real

| ID | Técnica | Condición a validar | Resultado esperado |
|---|---|---|---|
| CP-AL-01 | Partición de equivalencias | evento clasificado como sospechoso | alerta generada y visible |
| CP-AL-02 | Partición de equivalencias | evento no sospechoso | no se genera alerta indebida |
| CP-AL-03 | Basada en estados | alerta detectada y sistema en operación normal | alerta visible en tiempo aceptable |
| CP-AL-04 | Basada en estados | alerta generada y recarga de interfaz | historial recuperado correctamente |
| CP-AL-05 | Valores frontera | historial con 199 alertas | se conservan sin truncamiento indebido |
| CP-AL-06 | Valores frontera | historial con 200 alertas | se respeta límite configurado |
| CP-AL-07 | Valores frontera | ingreso de alerta 201 | se conserva política definida de rotación o reemplazo |
| CP-AL-08 | Partición de equivalencias | mismo evento reprocesado | no aparecen duplicados no deseados |

### 10.3 HU-03 - Registro manual de reportes de amenazas

| ID | Técnica | Condición a validar | Resultado esperado |
|---|---|---|---|
| CP-RP-01 | Partición de equivalencias | reporte con todos los datos válidos | registro exitoso |
| CP-RP-02 | Partición de equivalencias | reporte con campos obligatorios faltantes | rechazo y mensaje claro |
| CP-RP-03 | Partición de equivalencias | severidad válida del catálogo | aceptación correcta |
| CP-RP-04 | Partición de equivalencias | severidad fuera del catálogo | rechazo del dato |
| CP-RP-05 | Valores frontera | título con longitud mínima | aceptación si cumple regla |
| CP-RP-06 | Valores frontera | título vacío | rechazo por obligatoriedad |
| CP-RP-07 | Valores frontera | descripción en límite máximo permitido | aceptación controlada |
| CP-RP-08 | Valores frontera | descripción por encima del máximo | rechazo o truncamiento según regla definida |

### 10.4 HU-04 - Visualización gráfica de datos

| ID | Técnica | Condición a validar | Resultado esperado |
|---|---|---|---|
| CP-DH-01 | Partición de equivalencias | datos completos disponibles | dashboard muestra información consistente |
| CP-DH-02 | Partición de equivalencias | ausencia de datos | dashboard informa estado vacío sin error |
| CP-DH-03 | Partición de equivalencias | datos parciales | vista controlada sin inconsistencias críticas |
| CP-DH-04 | Valores frontera | período mínimo consultable | datos renderizados correctamente |
| CP-DH-05 | Valores frontera | período máximo definido por negocio | respuesta dentro de comportamiento esperado |
| CP-DH-06 | Exploratoria | actualización de datos mientras usuario navega | gráficos y métricas se mantienen coherentes |

### 10.5 Relación de casos y técnicas con niveles de prueba

Para asegurar trazabilidad completa, cada técnica y caso representativo debe ejecutarse en el nivel donde aporta más valor. No todos los casos pertenecen a un único nivel: algunos inician en pruebas unitarias y se extienden a integración, sistema o E2E según el riesgo del flujo.

| Flujo / Caso representativo | Técnica principal | Unitaria | Integración | Sistema | E2E |
|---|---|---|---|---|---|
| Validación de credenciales y obligatoriedad en login | Partición de equivalencias / valores frontera | Sí | Sí | No | No |
| Política de bloqueo por intentos fallidos | Valores frontera / estados | Sí | Sí | Sí | Sí |
| Sesión expirada o inválida | Estados | Sí | Sí | Sí | Sí |
| Clasificación de evento sospechoso | Partición de equivalencias | Sí | Sí | Sí | No |
| Generación y consumo de alerta | Estados / integración | No | Sí | Sí | Sí |
| Persistencia y recuperación de historial | Valores frontera / estados | Sí | Sí | Sí | Sí |
| Deduplicación de alertas | Partición de equivalencias / estados | Sí | Sí | Sí | No |
| Registro manual con datos válidos e inválidos | Partición de equivalencias / valores frontera | Sí | Sí | Sí | Sí |
| Visualización correcta de dashboard con y sin datos | Partición de equivalencias | Sí | Sí | Sí | Sí |
| Coherencia visual y actualización en tiempo real | Exploratoria / sistema | No | Sí | Sí | Sí |

#### Cobertura esperada por nivel

**Pruebas de integración**

En integración deben quedar cubiertos, como mínimo:

- validación del flujo de autenticación entre componentes;
- propagación de eventos sospechosos entre los módulos involucrados;
- persistencia y recuperación del historial de alertas;
- registro y consulta de reportes manuales;
- consistencia de datos entregados a la capa de visualización.

**Pruebas de sistema**

En sistema deben ejecutarse escenarios completos que validen:

- acceso al sistema con políticas de seguridad activas;
- detección de evento sospechoso y visualización funcional en el producto;
- persistencia de información tras recarga o continuidad operativa;
- registro manual y disponibilidad posterior del dato;
- dashboard útil, coherente y actualizado.

**Pruebas E2E**

En E2E deben quedar automatizados o definidos prioritariamente estos recorridos:

1. login exitoso;
2. login fallido con bloqueo tras el umbral definido;
3. detección y visualización de alerta en tiempo real;
4. creación de reporte manual;
5. visualización de dashboard con datos esperados;
6. persistencia visible de alertas tras refresco.

---

## 11. Pruebas funcionales prioritarias

Las pruebas funcionales del sprint se enfocarán en validar que cada historia de usuario cumpla su propósito de negocio, que los flujos principales operen de extremo a extremo y que las reglas funcionales respondan de forma consistente ante condiciones válidas e inválidas.

Dentro de este bloque, los siguientes escenarios deben tratarse como prioritarios:

### 11.1 Acceso seguro
- login exitoso con credenciales válidas;
- rechazo de credenciales inválidas;
- bloqueo tras múltiples intentos fallidos;
- expiración o invalidez de sesión controlada.

### 11.2 Monitoreo y visibilidad de amenaza
- un evento sospechoso debe reflejarse en la vista del administrador en tiempo aceptable;
- no deben mostrarse alertas duplicadas cuando el mismo evento se reprocesa;
- el historial relevante debe mantenerse disponible después de recargar.

### 11.3 Registro manual operativo
- el administrador debe poder registrar amenazas con información válida;
- el sistema debe rechazar datos incompletos o inconsistentes;
- el reporte debe quedar disponible para consulta posterior.

### 11.4 Toma de decisiones con datos visibles
- la información gráfica debe corresponder con la información registrada;
- la visualización debe ser clara, consistente y útil para seguimiento;
- no deben presentarse cifras contradictorias entre vistas relacionadas.

---

## 12. Pruebas no funcionales prioritarias

### 12.1 Seguridad

Dado el contexto del producto, la seguridad se considera una dimensión obligatoria del sprint.

Se validará al menos:

- manejo seguro del acceso;
- control ante intentos repetidos de autenticación;
- rechazo de entradas maliciosas o inválidas;
- no exposición innecesaria de información sensible;
- comportamiento seguro ante sesiones inválidas o manipuladas.

### 12.2 Rendimiento ligero del sprint

Sin entrar en pruebas de rendimiento de escala productiva, se espera validar:

- respuesta aceptable en login;
- latencia razonable desde la generación de alerta hasta su visualización;
- carga fluida del dashboard con volumen representativo de datos del sprint.

Umbrales sugeridos:

- login: menor a **500 ms** en condiciones controladas;
- alerta visible extremo a extremo: menor a **3 segundos**;
- carga usable del dashboard con historial representativo: menor a **2 segundos**.

### 12.3 Usabilidad y claridad operativa

Aunque no se contempla una evaluación formal de UX, se validará como mínimo que:

- los mensajes de error sean comprensibles;
- las alertas críticas sean visibles y distinguibles;
- el dashboard no induzca a interpretaciones erróneas;
- los formularios de reporte sean comprensibles para el rol administrador.

---

## 13. Ambiente y datos de prueba

### 13.1 Ambiente de ejecución esperado

Las pruebas del sprint deberían ejecutarse, como mínimo, sobre un ambiente controlado que represente el flujo funcional completo del producto.

Se recomienda disponer de:

- un entorno local o integrado estable para pruebas del sprint;
- servicios dependientes operativos para validar autenticación, alertas y persistencia;
- acceso al front y back en condiciones equivalentes a las usadas por el equipo durante desarrollo;
- capacidad de generar datos o eventos controlados para simular actividad sospechosa.

### 13.2 Datos de prueba mínimos

Para cubrir el alcance funcional, QA debería contar con:

- usuarios válidos e inválidos;
- usuarios con diferentes roles cuando aplique;
- eventos normales y sospechosos;
- reportes manuales válidos, incompletos y malformados;
- datos vacíos, parciales y completos para el dashboard;
- datos en los límites definidos por negocio para campos y volúmenes.

---

## 14. Criterios de entrada

QA podrá iniciar ejecución formal del sprint cuando:

- las historias tengan criterios de aceptación entendibles;
- exista una versión funcional desplegable en ambiente de pruebas o local controlado;
- el equipo haya entregado una build estable para validación;
- las dependencias mínimas para el flujo estén operativas;
- los defectos bloqueantes previos no impidan el inicio del ciclo.

### 14.1 Criterios de suspensión y reanudación

La ejecución podrá suspenderse temporalmente cuando:

- exista inestabilidad severa del ambiente;
- no sea posible validar un flujo crítico por fallas externas al alcance inmediato de QA;
- aparezcan defectos bloqueantes que invaliden múltiples ejecuciones posteriores;
- los datos de prueba no permitan continuar con evidencia confiable.

La ejecución podrá reanudarse cuando:

- el ambiente recupere estabilidad mínima;
- el defecto bloqueante haya sido corregido o exista workaround aprobado;
- los datos de prueba vuelvan a estar disponibles;
- el equipo confirme una nueva versión apta para revalidación.

---

## 15. Criterios de salida

El sprint podrá considerarse probado cuando:

- las historias críticas hayan sido cubiertas por pruebas funcionales y de riesgo;
- los flujos críticos E2E estén aprobados;
- no existan defectos abiertos de severidad crítica o alta relacionados con seguridad o negocio;
- la cobertura acordada para pruebas automatizadas se haya alcanzado;
- la evidencia de pruebas quede documentada;
- el riesgo residual sea aceptado por el equipo del sprint.

### Objetivos cuantitativos sugeridos

- pruebas unitarias críticas: **100% pasando**;
- pruebas de integración críticas: **100% pasando**;
- E2E críticos: **100% pasando**;
- cobertura de lógica crítica: **≥ 85%**;
- cobertura general acordada del sprint: **≥ 70%**;
- defectos críticos abiertos: **0**;
- defectos altos abiertos: **0**.

---

## 16. Gestión de defectos

### 16.1 Severidad sugerida

| Severidad | Definición |
|---|---|
| Bloqueante | Impide continuar el flujo principal o compromete gravemente la seguridad |
| Crítica | Rompe una capacidad clave del negocio sin workaround razonable |
| Mayor | Afecta una capacidad relevante, pero existe alternativa temporal |
| Menor | Impacto visual, de claridad o de bajo riesgo operativo |

### 16.2 Criterio de priorización

En este sprint se priorizarán primero los defectos que:

- comprometan autenticación o control de acceso;
- impidan ver alertas críticas;
- generen inconsistencia en reportes o dashboard;
- degraden significativamente la confianza del administrador en los datos.

### 16.3 Información mínima por defecto reportado

Cada defecto registrado debería incluir al menos:

- identificador;
- resumen claro del problema;
- severidad y prioridad;
- historia de usuario o flujo afectado;
- pasos de reproducción;
- resultado actual y esperado;
- evidencia;
- ambiente y versión probada.

---

## 17. Roles y responsabilidades

| Rol | Responsabilidad principal |
|---|---|
| QA Lead / QA Senior | definir estrategia, priorizar riesgos, validar cobertura y cierre |
| QA Engineer | diseñar, ejecutar, evidenciar y reportar defectos |
| Desarrollo | corregir defectos, aclarar reglas y apoyar análisis técnico |
| Tech Lead | validar riesgos técnicos y apoyar priorización |
| Product Owner | aclarar criterios de aceptación y aceptar riesgo residual |

---

## 18. Entregables QA del sprint

- plan de pruebas del sprint;
- matriz de escenarios prioritarios;
- evidencia de ejecución;
- reporte de defectos;
- estado de cobertura de automatización;
- resumen de riesgos residuales al cierre.

---

## 19. Riesgos del plan de pruebas

| Riesgo del plan | Impacto | Mitigación sugerida |
|---|---|---|
| cambios frecuentes de alcance durante el sprint | retrabajo y pérdida de foco | revalidar prioridades con PO y QA Lead |
| ambiente inestable | interrupción de ejecución | definir ventanas de prueba y criterios de reanudación |
| datos de prueba insuficientes | baja cobertura real | preparar dataset mínimo antes de la ejecución fuerte |
| alta dependencia entre componentes | defectos difíciles de aislar | reforzar integración y trazabilidad por flujo |
| automatización parcial al inicio del sprint | cobertura tardía | priorizar primero los recorridos críticos |

---

## 20. Trazabilidad técnica mínima de apoyo

Aunque el plan está orientado al negocio, QA reconoce que los principales flujos del sprint dependen de varios puntos de integración. Esta sección no define el objetivo del plan, pero sí ayuda a mapear riesgo y cobertura.

### Dependencias técnicas relevantes

- capa de autenticación y acceso;
- procesamiento de eventos sospechosos;
- mensajería y consumo de alertas;
- persistencia de historial;
- actualización de información en tiempo real;
- interfaz de consulta, registro y visualización.

### Uso recomendado de esta trazabilidad

Esta capa técnica debe utilizarse para:

- entender dónde puede romperse un flujo de negocio;
- priorizar pruebas de integración;
- apoyar el análisis de causa raíz de defectos;
- definir qué automatizar primero.

---

## 21. Conclusión

Este plan propone una ejecución de QA alineada con el negocio: proteger el acceso, asegurar visibilidad temprana de amenazas, mantener la confiabilidad operativa del sistema y garantizar que la información presentada al administrador sea útil y consistente.

La tecnología involucrada es importante, pero aparece en este documento solo como soporte para comprender el riesgo. La prioridad del sprint debe mantenerse en la experiencia funcional, el impacto al negocio y la reducción de defectos críticos.

---

## 22. Aprobaciones

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| QA Lead |  |  |  |
| Tech Lead |  |  |  |
| Product Owner |  |  |  |

---

> **Nota:** Este documento es vivo y puede ajustarse si cambian las prioridades del sprint, aparecen nuevos riesgos o el equipo redefine el alcance funcional.
