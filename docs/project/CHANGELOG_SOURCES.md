# Bitacora de Decisiones — Cyberguard

> Este documento cumple dos propositos: es una **fuente de referencia tecnica** con los recursos
> consultados, y una **bitacora personal** donde fui registrando paso a paso lo que fui haciendo,
> pensando y decidiendo durante el diseño de la feature.
> Las decisiones marcadas como **Aplicada** tienen evidencia directa en el documento oficial del proyecto.

---

## Registro de Decisiones

| # | Decision Tomada | Estado | Enlace de Referencia | Justificacion de Uso |
|:-:|:----------------|:------:|:---------------------|:---------------------|
| 01 | Identificar la necesidad de notificaciones | Aplicada | [Product Discovery](https://www.productplan.com/glossary/product-discovery/) | Entender como descubrir problemas reales de negocio y validar la necesidad de la funcionalidad. |
| 02 | Definir historias de usuario | Aplicada | [User Stories](https://www.atlassian.com/agile/project-management/user-stories) | Utilizar la estructura "Como [rol], quiero [objetivo] para [beneficio]" para definir funcionalidades desde la perspectiva del usuario. |
| 03 | Definir criterios de aceptacion (BDD) | Aplicada | [Gherkin Reference](https://cucumber.io/docs/gherkin/reference/) | Aplicar escenarios `Given / When / Then` para especificar y validar el comportamiento esperado del sistema de forma clara. |
| 04 | Modelar arquitectura orientada a eventos | Aplicada | [Event-Driven Architecture](https://microservices.io/patterns/data/event-driven-architecture.html) | Separar la generacion de eventos (Producer) del procesamiento de los mismos (Worker) para mejorar el desacoplamiento. |
| 05 | Implementar procesamiento desacoplado con colas | Aplicada | [Queue-Based Load Leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling) | Usar colas para gestionar picos de carga, desacoplar tareas y mejorar la disponibilidad del sistema. |
| 06 | Aplicar patron Observer | Aplicada | [Observer Pattern](https://refactoring.guru/design-patterns/observer) | Disparar acciones (notificaciones) en respuesta a eventos especificos (generacion de una alerta) sin tocar el Producer. |
| 07 | Aplicar patron Adapter | Aplicada | [Adapter Pattern](https://refactoring.guru/design-patterns/adapter) | Abstraer integraciones externas (correo, WhatsApp) bajo un contrato comun para poder cambiar de proveedor sin afectar la logica interna. |
| 08 | Aplicar patron Strategy | Aplicada | [Strategy Pattern](https://refactoring.guru/design-patterns/strategy) | Personalizar el contenido de las notificaciones de forma dinamica segun la categoria de la alerta. |
| 09 | Seleccion de API de correo electronico | Aplicada | [SendGrid Docs](https://sendgrid.com/docs/) | Entender los requerimientos tecnicos para la integracion de envio de correos electronicos de forma programatica. |
| 10 | Seleccion de API de WhatsApp | Aplicada | [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp) | Envio de mensajes automatizados a traves del canal oficial de WhatsApp. |
| 11 | Definir atributos de calidad | Aplicada | [ISO/IEC 25010](https://iso25000.com/index.php/en/iso-25000-standards/iso-25010) | Identificar seguridad, disponibilidad y fiabilidad como pilares no funcionales del diseño. |
| 12 | Asegurar alta disponibilidad | Aplicada | [AWS Well-Architected Framework](https://aws.amazon.com/architecture/) | Principios para diseñar sistemas tolerantes a fallos con disponibilidad del 99%. |
| 13 | Implementar observabilidad y logs | Aplicada | [The Twelve-Factor App: Logs](https://12factor.net/logs) | Tratar los logs como flujos de eventos centralizados e independientes de la logica de la aplicacion. |
| 14 | Monitoreo del sistema | En evaluacion | [OpenTelemetry Docs](https://opentelemetry.io/docs/) | Recoleccion de metricas y trazabilidad. Consultado como referencia, aun no aplicado explicitamente en el documento oficial. |
| 15 | Manejo de fallos con reintentos | Aplicada | [Retry Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry) | Reintentar envios fallidos sin afectar el flujo general del sistema. |
| 16 | Garantizar procesamiento confiable | Aplicada | [Idempotent Consumer](https://microservices.io/post/microservices/patterns/2020/10/16/idempotent-consumer.html) | Evitar duplicidad en el procesamiento de alertas garantizando que cada una se procese al menos una vez. |
| 17 | Definir estimacion de historias | Aplicada | [Agile Estimation](https://www.atlassian.com/agile/project-management/estimation) | Tecnica T-Shirt Sizing para estimacion de esfuerzo en etapas tempranas del diseño. |
| 18 | Documentar arquitectura (C4) | Aplicada | [C4 Model](https://c4model.com/) | Representar el sistema en niveles de abstraccion (contexto, contenedores, componentes) para una mejor comunicacion. |
| 19 | Modelar flujo de ejecucion | Aplicada | [Sequence Diagrams](https://www.uml-diagrams.org/sequence-diagrams.html) | Crear diagramas de secuencia para visualizar la interaccion y el orden de los mensajes entre los componentes del sistema. |

---

### Resumen

| Estado | Cantidad |
|:-------|:--------:|
| Aplicada en el documento oficial | 18 |
| En evaluacion (consultada, no aplicada aun) | 1 |
| **Total** | **19** |

---

## Bitacora Personal

---

Hoy quise aplicar el concepto Human First, y saque mi propia FEATURE basandome en las necesidades del negocio, sin embargo, al analizarla exhaustivamente me di cuenta que podria ser considerada un refactor o deuda tecnica, la feature era la siguiente:

- **Feature**: Independizar la categoria de las amenazas para que modificar una ya existente o implementar una nueva no afecte directamente el sistema.

Como podemos observar esto involucraria cambiar la estructura de las amenazadas, donde antes era un atributo propio de la amenaza ahora sera una relacion con una  categoria, pero considere que esto realmente seria una deuda tecnica o refactor porque es algo que se debio tener en cuenta antes de implementar la estructura de las amenazas.

Entonces, use la IA para proponerme features basandose en las necesidades del negocio y que realmente aporten algun valor, me sugirio varias, pero me decidi por una que considere sustanciosa y paso siguiente a lo ya hecho:

- **Feature**: Implementar un sistema de notificaciones para alertar a los usuarios interesados sobre reportes personalizados en las amenazas o categorías.


Teniendo esto en cuenta procedo a definir las historias de usaurio, lo hare basandome en los principios invest. 

Use la IA para que me sugiriera las posibles historias de usuario para esa feature; me dio lo siguiente:

### Historias de Usuario para la Funcionalidad de Notificaciones

1. **Como administrador**, quiero recibir notificaciones automáticas cuando se registre una nueva amenaza, para poder actuar rápidamente y minimizar riesgos.

2. **Como administrador**, quiero que las notificaciones incluyan la categoría de la amenaza, para priorizar mi respuesta según el nivel de riesgo.

3. **Como administrador**, quiero poder elegir el canal por el cual recibir notificaciones (correo electrónico o WhatsApp), para asegurarme de recibir la información de la manera más conveniente para mí.

4. **Como administrador**, quiero que las notificaciones sean personalizables según mi rol y preferencias, para recibir solo la información relevante y evitar sobrecarga de mensajes.

5. **Como administrador**, quiero que el sistema mantenga un historial de notificaciones enviadas, para poder consultar eventos pasados en caso de auditoría o caída del sistema.



Alucino y extendió el comportamiento de la feature, añadiendo cosas que  nunca se especificaron: así que basandome en los principios invest y unicamente en lo que esta dentro del alance hice un refinamiento a esas historias de usuario:


**Yo** como administrador
**Necesito** agregar datos de contacto adicionales como mi numero telefonico
**Para** que el sistema se alimente posteriormente de estos datos.


**Yo** como administrador
**Necesito** que al llegar una nueva amenaza el sistema me lo notifique de manera automatica
**Para** poder tomar desiciones tempranas


**Yo** como administrador
**Necesito** que se me envien las notificaciones via correo electronico y email
**Para** Recibirlas en caso de no estar conectado en la pagina, ademas de llevar un historial diferente al del sistema.

Durante un pensamiento exhaustivo me di cuenta que primero se debe garantizar la disponibilidad de estos datos como numero de telefono y correo electronico para actualizarlos o consultarlos cuando se requiera, por lo cual surge una nueva necesidad lo que se traduce a una nueva historia de usuario:

**Yo** Como administrador
**Necesito** poder acceder a mis datos personales para consultarlos o modificarlos.
**Para** garantizar que la información que tiene de mí el sistema  sea precisa y concisa. 

Le decimos a SKAI que con el contexto de aplicacion ya existente, el bussines context y el readme.md nos identifique que componentes se veran afectados en la arquitectura por la nueva funcionalidad y que patrones de diseño seran necesarios o como detectar los ya implementados. El objetivo es obtener una estimación de impacto antes de iniciar el desarrollo, nos responde lo siguiente:

Entendido. El objetivo es realizar un análisis de impacto técnico detallado sobre la arquitectura existente de CyberGuard para estimar el esfuerzo y los riesgos asociados a la implementación de la nueva funcionalidad de notificaciones, antes de comenzar el desarrollo.

A continuación, presento un desglose del impacto por componente arquitectónico y una evaluación de los patrones de diseño involucrados.

---

### Análisis de Impacto Arquitectónico: Funcionalidad de Notificaciones Externas

#### Resumen Ejecutivo del Impacto

El impacto global de esta nueva funcionalidad en la arquitectura se estima como **Medio**. No requiere un rediseño fundamental del sistema, ya que se acopla de manera natural a la **Arquitectura Orientada a Eventos (EDA)** existente. Sin embargo, afecta a componentes clave (`Backend`, `Worker`, `Frontend`) e introduce nuevas dependencias externas y complejidades en la lógica de negocio, especialmente en el `Worker`.

---

#### 1. Desglose de Impacto por Componente Arquitectónico

| Componente Afectado | Nivel de Impacto | Descripcion Detallada de los Cambios Necesarios |
| :--- | :--- | :--- |
| **Backend API (Producer)** | **Medio** | Nuevos endpoints REST para gestion de perfil. Persistencia de datos de contacto en Redis. Enriquecimiento del mensaje publicado en RabbitMQ. Proteccion con JWT y validacion con Joi. |
| **Worker (Consumer)** | **Alto** | Modificacion de la logica de consumo. Integracion con SDKs de terceros (SendGrid, WhatsApp). Gestion de secretos via variables de entorno. Manejo de errores y reintentos. Orquestacion multi-canal. |
| **Frontend (Angular App)** | **Medio** | Nueva seccion de Perfil de Usuario. Nuevo ProfileService. Formularios reactivos con validaciones de cliente. |
| **Infraestructura (Docker)** | **Bajo** | Actualizacion de docker-compose.yml y archivos .env con nuevas variables de entorno. Verificacion de conectividad de red del Worker hacia internet. |

---

#### 2. Analisis de Patrones de Diseño (Existentes y Nuevos)

##### Patrones Existentes a Potenciar

1. **Arquitectura Orientada a Eventos (EDA) / Publicador-Suscriptor:** El Backend sigue publicando el evento `threat.created`. El Worker añade nuevas responsabilidades sin romper el desacoplamiento existente.

2. **Inyeccion de Dependencias (DI):** Presente en Backend y Frontend. Se debe utilizar para inyectar los nuevos servicios de notificacion y el ProfileService.

##### Nuevos Patrones de Diseño a Implementar

1. **Patron Adaptador (Adapter):** Definir una interfaz generica `INotificationService` con un metodo `send()`. Crear adaptadores concretos: `WhatsAppAdapter` y `EmailAdapter`.

2. **Patron de Reintentos con Backoff Exponencial:** Si una llamada a una API externa falla, reintentar con tiempos de espera crecientes (1s, 2s, 4s, 8s) hasta un maximo de intentos.

3. **Patron de Cola de Mensajes Fallidos (Dead Letter Queue):** Configurar una DLQ en RabbitMQ para mensajes que fallen repetidamente, evitando que bloqueen la cola principal.

---

#### Estimacion de Impacto Consolidada

| Area | Esfuerzo Estimado | Riesgo Tecnico | Justificacion |
| :--- | :--- | :--- | :--- |
| **Backend** | Medio | Bajo | Tareas bien definidas: endpoints CRUD y enriquecimiento de mensajes. Bajo riesgo de regresion. |
| **Worker** | Alto | Alto | Nucleo del cambio. Integraciones externas, gestion de fallos y seguridad de credenciales. |
| **Frontend** | Medio | Bajo | Tareas estandar de Angular. Riesgo minimo de afectar otras partes de la aplicacion. |
| **Infraestructura** | Bajo | Bajo | Solo gestion de configuracion (variables de entorno). |
| **General** | Medio | Medio | El riesgo principal es la dependencia de servicios externos. La arquitectura EDA existente es la adecuada para esta expansion. |

---

### Decisiones humanas sobre los posibles riesgos e impactos, incluyendo los patrones de diseño

**Patrones a implementar**

Decidiremos implementar el patron **Adapter**, esto porque al día de mañana el sistema podrá cambiar de servicios externos dependiendo sus necesidades.

Si el envío o contenido de la notificación depende de la categoría de la amenaza, el patrón que mejor se adapta es **Strategy**. Nos permite definir una estrategia por categoría (por ejemplo, crítica, media o baja) y elegirla dinámicamente cuando llega el evento, manteniendo el código más limpio, escalable y fácil de mantener.

**Impacto a tener en cuenta**

El impacto seria medio-alto, esto porque afectamos el comportamiento del sistema ya existente, debemos modificar la entidad del usuario para agregar un nuevo campo, y las nuevas implementaciones tocan todos los microservicios.

---

### Sugerencia de implementacion tecnica por IA

Le dije a la IA que me sugiriera, teniendo en cuenta el bussines context y readme.md como podriamos implementar estos cambios, la arquitectura, los patrones de diseño y que me diera las fuentes que utilizo para responderme:

#### Arquitectura Recomendada para las 4 Historias de Usuario

1. **Gestion y edicion de datos personales:** Endpoints REST en el backend (Express.js). Validacion con Joi. Almacenamiento en Redis. Panel de perfil en Angular con formularios reactivos.

2. **Agregar datos de contacto adicionales:** Extender el modelo de usuario para incluir el numero telefonico. Validacion y actualizacion via API. Campo editable en el frontend.

3. **Notificaciones automaticas en tiempo real:** Al registrar una amenaza, publicar un mensaje en RabbitMQ. El Worker escucha y procesa el envio. El frontend recibe via WebSocket (puerto 8081).

4. **Notificaciones por correo electronico y WhatsApp:** El Worker integra SendGrid para correo y la API de WhatsApp Business para mensajeria. Los datos de contacto se obtienen desde Redis. El resultado del envio se registra para trazabilidad.

**Fuentes consultadas por la IA:**
- [12 Factor App](https://12factor.net/)
- [RabbitMQ Best Practices](https://www.rabbitmq.com/best-practices.html)
- [Angular Material Forms](https://material.angular.io/components/form-field/overview)
- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/)
- [Nodemailer](https://nodemailer.com/about/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

#### Patrones de Diseño Recomendados por la IA

| Patron | Aplicacion Sugerida |
|:-------|:--------------------|
| **Observer** | Backend publica eventos, Workers reaccionan enviando notificaciones via RabbitMQ. |
| **Factory** | Crear instancias de servicios de notificacion segun el canal requerido. |
| **Strategy** | Seleccionar dinamicamente el metodo de envio segun preferencia o configuracion. |
| **Singleton** | Conexiones a Redis, RabbitMQ y clientes de correo con una unica instancia compartida. |
| **DTO** | Estructurar y validar datos entre frontend, backend y workers. |
| **Command** | Encapsular acciones como "enviar notificacion" para colas, logs y reintentos. |
| **Adapter** | Integrar APIs externas adaptando sus interfaces a la logica interna del sistema. |

---

Ayer tuvimos una reunion donde hablabamos de una manera más profunda sobre la definicion de features, por lo cual refactorizare el documento google docs para que los criterios de aceptación ahora esten en formato gherkin, ademas, agregare un valor global que encasillara el proposito de esta feature.

Definimos también los fuera de alcance de la nueva feature, para que todas las partes del negocio tengan claro realmente que es lo que se realizará durante esta nueva feature.

A continuación definiré el modelo de negocio y las reglas de negocio.

Terminé la definicion del documento, inclui un diagrama C4 para explicar como interactuan los componentes del negocio entre si, también un diagrama de secuencia donde se evidencia paso a paso que hará la nueva feature y como los diferentes componentes del sistema entran ahi, requisitos no funcionales importantes para garantizar atributos de calidad, los patrones de diseños clave, ahora, crearé en este documento una tabla donde pondré todos los links en los que me base para tomar las desiciones arquitectonicas y de negocio.