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

Le decimos SKAI que con el contexto de aplicacion ya existente, el bussines conext y el readme.md nos identifique que componentes se veran afectados en la arquitectura por la nueva funcionalidad y que patrones de diseño seran necesarios o como detectar los ya implementados. El objetivo es obtener una estimación de impacto antes de iniciar el desarrollo, nos responde lo siguiente:

Entendido. El objetivo es realizar un análisis de impacto técnico detallado sobre la arquitectura existente de CyberGuard para estimar el esfuerzo y los riesgos asociados a la implementación de la nueva funcionalidad de notificaciones, antes de comenzar el desarrollo.

A continuación, presento un desglose del impacto por componente arquitectónico y una evaluación de los patrones de diseño involucrados.

---

### **Análisis de Impacto Arquitectónico: Funcionalidad de Notificaciones Externas**

#### **Resumen Ejecutivo del Impacto**

El impacto global de esta nueva funcionalidad en la arquitectura se estima como **Medio**. No requiere un rediseño fundamental del sistema, ya que se acopla de manera natural a la **Arquitectura Orientada a Eventos (EDA)** existente. Sin embargo, afecta a componentes clave (`Backend`, `Worker`, `Frontend`) e introduce nuevas dependencias externas y complejidades en la lógica de negocio, especialmente en el `Worker`.

---

#### **1. Desglose de Impacto por Componente Arquitectónico**

| Componente Afectado | Nivel de Impacto | Descripción Detallada de los Cambios Necesarios |
| :--- | :--- | :--- |
| **`Backend API (Producer)`** | **Medio** | **1. Nuevos Endpoints:** Se debe crear un nuevo conjunto de endpoints para la gestión del perfil del administrador (ej. `GET /api/profile`, `PUT /api/profile`).<br>**2. Persistencia de Datos:** Requiere lógica para almacenar y actualizar los nuevos datos del administrador (email, teléfono) en la capa de persistencia (Redis). Se debe evaluar si Redis es adecuado para datos de usuario a largo plazo o si se debería considerar otra solución.<br>**3. Enriquecimiento de Mensajes:** El cambio más importante. Al publicar un mensaje de "nueva amenaza" en RabbitMQ, el `Backend API` ahora deberá enriquecer ese mensaje con la información de contacto del administrador. Esto mantiene al `Worker` desacoplado y sin estado, ya que no necesitará consultar una base de datos para obtener los datos del destinatario.<br>**4. Seguridad:** Los nuevos endpoints deben estar protegidos por el middleware de autenticación JWT existente.<br>**5. Validación:** Se debe extender el uso de Joi para validar los datos del perfil (formato de email, formato de teléfono). |
| **`Worker (Consumer)`** | **Alto** | **Este es el componente con el mayor impacto.**<br>**1. Lógica de Negocio Principal:** El `Worker` deberá modificar su lógica de consumo. Al recibir un mensaje, deberá parsear la información de contacto y determinar a qué canales externos enviar la notificación (email, WhatsApp).<br>**2. Integración con Servicios de Terceros:** Se deben integrar SDKs o clientes HTTP para comunicarse con las APIs de los proveedores de servicios de notificación (ej. Twilio, SendGrid). Esto introduce nuevas dependencias de red y puntos de fallo.<br>**3. Gestión de Secretos:** El `Worker` necesitará acceso a las claves de API de estos servicios, las cuales deben ser gestionadas de forma segura a través de variables de entorno.<br>**4. Manejo de Errores y Resiliencia:** La lógica de manejo de errores se vuelve crítica. Se debe implementar un sistema robusto de reintentos y gestión de fallos para cuando las APIs externas no respondan o devuelvan errores.<br>**5. Orquestación de Notificaciones:** El `Worker` deberá orquestar el envío a múltiples canales, asegurando que un fallo en el envío de email no impida el envío por WhatsApp. |
| **`Frontend (Angular App)`** | **Medio** | **1. Nuevas Vistas/Componentes:** Se debe desarrollar una nueva sección de "Perfil de Usuario" donde el administrador pueda ver y editar su información de contacto.<br>**2. Nuevos Servicios:** Se necesita crear un nuevo servicio en Angular (`ProfileService`) para interactuar con los nuevos endpoints del `Backend API` (`GET`, `PUT`).<br>**3. Gestión de Estado:** El estado del perfil del usuario deberá ser gestionado en el frontend, probablemente utilizando RxJS para manejar las operaciones asíncronas y la actualización de la UI.<br>**4. Formularios y Validación:** Implementar formularios reactivos con validaciones del lado del cliente para el email y el número de teléfono. |
| **`Infraestructura (Docker)`** | **Bajo** | **1. Variables de Entorno:** El archivo `docker-compose.yml` y los archivos `.env` deberán ser actualizados para incluir las nuevas variables de entorno requeridas por el `Worker` y el `Backend` (ej. `TWILIO_API_KEY`, `SENDGRID_API_KEY`, `TWILIO_PHONE_NUMBER`).<br>**2. Conectividad de Red:** Asegurar que el contenedor del `Worker` tenga acceso de salida a Internet para poder comunicarse con las APIs de terceros. |

---

#### **2. Análisis de Patrones de Diseño (Existentes y Nuevos)**

El éxito de esta implementación dependerá de aprovechar correctamente los patrones existentes y aplicar nuevos patrones para gestionar la complejidad añadida.

##### **Patrones Existentes a Potenciar:**

1.  **Arquitectura Orientada a Eventos (EDA) / Publicador-Suscriptor:**
    *   **Detección:** Este es el patrón central del sistema (`Backend` → `RabbitMQ` → `Worker`).
    *   **Aplicación:** La nueva funcionalidad encaja perfectamente. El `Backend` sigue publicando un evento genérico (`threat.created`). El `Worker` simplemente añade una nueva responsabilidad a su rol de suscriptor: además de notificar vía WebSocket, ahora también notificará a canales externos. El desacoplamiento se mantiene intacto.

2.  **Inyección de Dependencias (DI):**
    *   **Detección:** Presente tanto en el `Backend` (a través de la estructura de Express/Node.js) como en el `Frontend` (nativo en Angular).
    *   **Aplicación:** Se debe utilizar DI para inyectar los nuevos servicios de notificación en la lógica del `Worker` y el `ProfileService` en los componentes de Angular. Esto facilita las pruebas unitarias y la mantenibilidad.

##### **Nuevos Patrones de Diseño a Implementar:**

1.  **Patrón Adaptador (Adapter):**
    *   **Necesidad:** Para evitar un acoplamiento fuerte con un proveedor específico (ej. Twilio), se debe crear una interfaz de notificación genérica en el `Worker` (ej. `INotificationService`) con un método `send()`.
    *   **Implementación:** Luego, se crean adaptadores concretos que implementen esa interfaz: `WhatsAppAdapter` (que usa Twilio por debajo) y `EmailAdapter` (que usa SendGrid). Esto permite cambiar de proveedor en el futuro modificando únicamente el adaptador, sin afectar la lógica de negocio principal.

2.  **Patrón de Reintentos con Backoff Exponencial (Retry with Exponential Backoff):**
    *   **Necesidad:** Las llamadas a APIs externas pueden fallar por problemas transitorios de red. Un reintento inmediato puede sobrecargar el servicio.
    *   **Implementación:** En el `Worker`, si una llamada a una API de notificación falla, en lugar de descartar el mensaje, se debe implementar una lógica que reintente la operación después de un tiempo de espera que aumenta exponencialmente con cada fallo (ej. 1s, 2s, 4s, 8s), hasta un número máximo de intentos.

3.  **Patrón de Cola de Mensajes Fallidos (Dead Letter Queue - DLQ):**
    *   **Necesidad:** ¿Qué hacer si un mensaje falla repetidamente incluso después de varios reintentos? No debe perderse ni bloquear la cola principal.
    *   **Implementación:** Se debe configurar una DLQ en RabbitMQ. Si el `Worker` no puede procesar un mensaje después del número máximo de reintentos, lo rechaza (`nack`) y RabbitMQ lo enrutará a la DLQ para su posterior análisis manual o reprocesamiento.

---

### **Estimación de Impacto Consolidada**

| Área | Esfuerzo Estimado | Riesgo Técnico | Justificación |
| :--- | :--- | :--- | :--- |
| **Backend** | **Medio** | **Bajo** | Tareas bien definidas: crear endpoints CRUD y enriquecer un mensaje. La lógica es estándar y el riesgo de regresión es bajo si se siguen los patrones existentes. |
| **Worker** | **Alto** | **Alto** | Es el núcleo del cambio. La integración con APIs de terceros, la gestión de fallos, la resiliencia y la seguridad de las credenciales introducen una complejidad y un riesgo significativos. |
| **Frontend** | **Medio** | **Bajo** | Requiere trabajo de UI/UX y lógica de cliente, pero son tareas estándar dentro del framework Angular. El riesgo de afectar otras partes de la aplicación es mínimo. |
| **Infraestructura** | **Bajo** | **Bajo** | La modificación se limita a la gestión de configuración (variables de entorno), una tarea de bajo riesgo. |
| **General** | **Medio** | **Medio** | El esfuerzo se concentra en el `Worker`, pero el riesgo general se mitiga porque la arquitectura EDA existente es la adecuada para esta expansión. El principal riesgo es la dependencia y la fiabilidad de los servicios externos. |

Esta estimación previa concluye que el desarrollo es factible y se alinea bien con la arquitectura actual, pero se debe asignar tiempo y recursos significativos para garantizar que la implementación en el **`Worker`** sea robusta, resiliente y segura.

### Desicion humanas sobre los posibles riesgos e impactos, incluyendo los patrones de diseño

**Patrones a implementar**

Decidiremos implementar el patron ADAPTER, esto porque al día de mañana el sistema podrá cambiar de servicios externos dependiendo sus necesidades.

Si el envío o contenido de la notificación depende de la categoría de la amenaza, el patrón que mejor se adapta es Strategy. Nos permite definir una estrategia por categoría (por ejemplo, crítica, media o baja) y elegirla dinámicamente cuando llega el evento, manteniendo el código más limpio, escalable y fácil de mantener. 


**Impacto a tener en cuenta**

El impacto seria medio-alto, esto porque afectamos el comportamiento del sistema ya existente, debemos modificar la entidad del usuario para agregar un nuevo campo, y las nuevas implementaciones tocan todos los microservicios.



### Sugerencia de implementacion tecnica por IA


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


Ayer tuvimos una reunion donde hablabamos de una manera más profunda sobre la definicion de features, por lo cual refactorizare el documento google docs para que los criterios de aceptación ahora esten en formato gherkin, ademas, agregare un valor global que encasillara el proposito de esta feature.


Definimos también los fuera de alcance de la nueva feature, para que todas las partes del negocio tengan claro realmente que es lo que se realizará durante esta nueva feature.


A continuación definiré el modelo de negocio y las reglas de negocio.