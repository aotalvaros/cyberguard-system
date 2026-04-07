# Bitacora de Decisiones — Cyberguard

> Documento de uso personal y tecnico. Registra tanto las fuentes consultadas como
> el razonamiento detrás de cada decision tomada durante el diseño de la feature.
> Las decisiones marcadas con **[APLICADA]** tienen evidencia directa en el documento oficial del proyecto.

---

## Como use este documento

Este archivo me sirvio como dos cosas al mismo tiempo: una **fuente de informacion** donde fui
recopilando referencias tecnicas y conceptuales, y una **bitacora personal** donde fui
documentando paso a paso lo que iba haciendo, pensando y decidiendo.

No es un documento formal. Es el rastro de mi proceso de pensamiento.

---

## Registro de Decisiones

| # | Decision Tomada | Estado | Enlace de Referencia | Que utilice de ahi |
|---|:----------------|:------:|:---------------------|:-------------------|
| 01 | Identificar la necesidad de notificaciones | **APLICADA** | [Product Discovery](https://www.productplan.com/glossary/product-discovery/) | Entender como descubrir problemas reales de negocio y validar la necesidad de la funcionalidad. |
| 02 | Definir historias de usuario | **APLICADA** | [User Stories — Atlassian](https://www.atlassian.com/agile/project-management/user-stories) | Estructura "Como [rol], quiero [objetivo] para [beneficio]" para definir funcionalidades desde la perspectiva del usuario. |
| 03 | Definir criterios de aceptacion (BDD) | **APLICADA** | [Gherkin Reference — Cucumber](https://cucumber.io/docs/gherkin/reference/) | Escenarios `Given / When / Then` para especificar y validar el comportamiento esperado del sistema. |
| 04 | Modelar arquitectura orientada a eventos | **APLICADA** | [Event-Driven Architecture — Microservices.io](https://microservices.io/patterns/data/event-driven-architecture.html) | Separacion entre Producer y Worker mediante eventos para mejorar el desacoplamiento. |
| 05 | Implementar procesamiento desacoplado con colas | **APLICADA** | [Queue-Based Load Leveling — Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling) | Usar colas para gestionar picos de carga, desacoplar tareas y mejorar la disponibilidad del sistema. |
| 06 | Aplicar patron Observer | **APLICADA** | [Observer Pattern — Refactoring Guru](https://refactoring.guru/design-patterns/observer) | Disparar acciones (notificaciones) cuando ocurre una alerta, sin tocar el Producer. |
| 07 | Aplicar patron Adapter | **APLICADA** | [Adapter Pattern — Refactoring Guru](https://refactoring.guru/design-patterns/adapter) | Abstraer integraciones externas (correo, WhatsApp) bajo un contrato comun para poder cambiar de proveedor sin afectar la logica interna. |
| 08 | Aplicar patron Strategy | **APLICADA** | [Strategy Pattern — Refactoring Guru](https://refactoring.guru/design-patterns/strategy) | Personalizar el contenido de las notificaciones segun la categoria de la alerta. |
| 09 | Seleccion de API de correo electronico | **APLICADA** | [SendGrid Documentation](https://sendgrid.com/docs/) | Entender los requerimientos tecnicos para la integracion de envio de correos electronicos de forma programatica. |
| 10 | Seleccion de API de WhatsApp | **APLICADA** | [WhatsApp Business Platform — Meta](https://developers.facebook.com/docs/whatsapp) | Envio de mensajes automatizados a traves del canal oficial de WhatsApp. |
| 11 | Definir atributos de calidad | **APLICADA** | [ISO/IEC 25010](https://iso25000.com/index.php/en/iso-25000-standards/iso-25010) | Identificar seguridad, disponibilidad y fiabilidad como pilares no funcionales del diseño. |
| 12 | Asegurar alta disponibilidad | **APLICADA** | [AWS Well-Architected Framework](https://aws.amazon.com/architecture/) | Principios para diseñar sistemas tolerantes a fallos con disponibilidad del 99%. |
| 13 | Implementar observabilidad y logs | **APLICADA** | [The Twelve-Factor App: Logs](https://12factor.net/logs) | Tratar los logs como flujos de eventos centralizados e independientes de la logica de la aplicacion. |
| 14 | Monitoreo del sistema | En evaluacion | [OpenTelemetry Documentation](https://opentelemetry.io/docs/) | Recoleccion de metricas y trazabilidad. Consultado como referencia, aun no aplicado explicitamente en el documento oficial. |
| 15 | Manejo de fallos con reintentos | **APLICADA** | [Retry Pattern — Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry) | Reintentar envios fallidos sin afectar el flujo general del sistema. |
| 16 | Garantizar procesamiento confiable | **APLICADA** | [Idempotent Consumer — Microservices.io](https://microservices.io/post/microservices/patterns/2020/10/16/idempotent-consumer.html) | Evitar duplicidad en el procesamiento de alertas garantizando que cada una se procese al menos una vez. |
| 17 | Definir estimacion de historias | **APLICADA** | [Agile Estimation — Atlassian](https://www.atlassian.com/agile/project-management/estimation) | Tecnica T-Shirt Sizing para estimacion de esfuerzo en etapas tempranas del diseño. |
| 18 | Documentar arquitectura con C4 | **APLICADA** | [C4 Model](https://c4model.com/) | Representar el sistema en niveles de abstraccion (contexto, contenedores, componentes). |
| 19 | Modelar flujo de ejecucion | **APLICADA** | [Sequence Diagrams — UML](https://www.uml-diagrams.org/sequence-diagrams.html) | Diagramas de secuencia para visualizar la interaccion entre componentes del sistema. |

---

## Resumen

| Estado | Cantidad |
|:-------|:--------:|
| Aplicada en el documento oficial | 18 |
| En evaluacion (consultada, no aplicada aun) | 1 |
| **Total** | **19** |

---

## Notas personales del proceso

- Empece definiendo el problema desde el negocio antes de tocar cualquier concepto tecnico.
- La separacion Producer / Worker fue clave para garantizar que el registro de alertas nunca se vea afectado por fallos en las notificaciones.
- El patron Adapter fue la decision que mas valor le agrego a la arquitectura a largo plazo, ya que nos da libertad de cambiar de proveedor (por ejemplo, de WhatsApp a Telegram) sin tocar la logica interna.
- El patron Observer me permitio añadir responsabilidades al Worker sin modificar el Producer, lo cual valida el principio de abierto/cerrado.
- Decidi usar T-Shirt Sizing porque en esta etapa de diseño no tiene sentido comprometerse con horas exactas.
- Los atributos de calidad (seguridad, disponibilidad, fiabilidad) los defini desde el inicio porque este es un sistema de reporte de riesgos, no un sistema cualquiera.
- OpenTelemetry lo tuve en el radar pero no lo formalice en el documento oficial aun. Es una decision pendiente.
