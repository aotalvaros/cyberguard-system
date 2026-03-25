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


Le dije a la IA que me sugiriera, teniendo en cuenta el bussines context y readme.md como podriamos implementar estos cambios, la arquitectura, los patrones de diseño y que me diera las fuentas que utilizo para responderme:

### Arquitectura Recomendada para las 4 Historias de Usuario

#### 1. **Gestión y edición de datos personales**
- Implementa endpoints REST en el **backend (Express.js)** para consultar y actualizar datos personales del administrador.
- Usa **Joi** para validar los datos (nombre, correo, número telefónico).
- Almacena los datos en **Redis** (según tu stack actual) o considera una base de datos relacional si necesitas consultas más complejas.
- El **frontend Angular** debe tener un panel de perfil donde el usuario pueda ver y editar sus datos, usando Angular Material para formularios y validaciones.

#### 2. **Agregar datos de contacto adicionales**
- Extiende el modelo de usuario en el backend para incluir el número telefónico.
- Asegura validación y actualización vía API.
- El frontend debe permitir agregar y editar este campo.

#### 3. **Notificaciones automáticas en tiempo real**
- Cuando se registre una nueva amenaza en el backend, publica un mensaje en **RabbitMQ**.
- El **worker** (Node.js Consumer) escucha estos eventos y procesa el envío de notificaciones.
- El frontend puede recibir notificaciones en tiempo real usando **WebSocket** (puerto 8081) o mediante polling si es necesario.

#### 4. **Notificaciones por correo electrónico y WhatsApp**
- El **worker** debe integrar servicios externos:
  - Para correo: usa nodemailer, SendGrid, o similar.
  - Para WhatsApp: integra la **API de WhatsApp Business**.
- El worker toma los datos de contacto del administrador desde Redis y envía la notificación por ambos canales.
- El backend debe registrar el resultado del envío para trazabilidad.

---

### Fuentes y buenas prácticas utilizadas

- [12 Factor App](https://12factor.net/) — Separación de configuración, desacoplamiento de servicios.
- [RabbitMQ Best Practices](https://www.rabbitmq.com/best-practices.html) — Uso de colas para desacoplar procesos y escalar notificaciones.
- [Node.js Microservices with RabbitMQ](https://dev.to/abiodunjames/building-microservices-with-nodejs-and-rabbitmq-3g1b) — Ejemplo de arquitectura event-driven.
- [Angular Material Forms](https://material.angular.io/components/form-field/overview) — Formularios reactivos y validación.
- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/) — Envío de mensajes programáticos.
- [Nodemailer](https://nodemailer.com/about/) — Envío de correos desde Node.js.
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) — Validación y protección de datos personales.

---

Estas sugerencias están alineadas a tu monorepo, arquitectura event-driven y uso de microservicios, asegurando escalabilidad, mantenibilidad y cumplimiento de los requisitos funcionales.

### Patrones de Diseño Recomendados

1. **Observer (Publicador/Suscriptor)**
   - Útil para el sistema de notificaciones: el backend publica eventos (nuevas amenazas) y los workers/subscriptores reaccionan enviando notificaciones.
   - Implementado naturalmente con RabbitMQ en tu arquitectura.

2. **Factory**
   - Para crear instancias de servicios de notificación (correo, WhatsApp) según el canal requerido, facilitando la extensión a nuevos canales en el futuro.

3. **Strategy**
   - Permite seleccionar dinámicamente el método de envío de notificaciones (correo, WhatsApp, SMS, etc.) según la preferencia del usuario o la configuración.

4. **Singleton**
   - Para la conexión a servicios externos como Redis, RabbitMQ o clientes de correo, asegurando una única instancia compartida en toda la aplicación.

5. **DTO (Data Transfer Object)**
   - Para estructurar y validar los datos que viajan entre frontend, backend y workers, asegurando consistencia y seguridad.

6. **Command**
   - Útil para encapsular acciones como “enviar notificación”, permitiendo colas, logs y reintentos automáticos en caso de fallo.

7. **Adapter**
   - Para integrar APIs externas (WhatsApp, correo), adaptando sus interfaces a la lógica interna del sistema.

---

**Fuentes:**
- [Refactoring Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Node.js Design Patterns Book](https://www.nodejsdesignpatterns.com/)
- [Microservices Patterns - Chris Richardson](https://microservices.io/patterns/index.html)



### Desicion de implementación por humano: