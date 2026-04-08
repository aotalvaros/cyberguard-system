# Proyecto: Cyberguard System

**Autor:** Jhonathan Samuel Aparicio Lindarte

**Estado:** Implementado.

**Iniciativa:** "Necesitamos que el administrador siempre esté al tanto de las alertas que vayan llegando".

---

## 1. Introducción y Objetivos

### 1.1 Problema actual

El personal encargado del sistema puede estar concentrado en otras tareas que también vayan alineadas a su rol, por lo cual no siempre la persona estará pendiente de lo que está sucediendo.

### 1.2 Solución implementada

El sistema envía notificaciones al personal interesado, personalizando la notificación según su categoría, esto para percibir más rápidamente el tipo de alerta reportada. Se implementaron tres canales: notificaciones en tiempo real dentro de la plataforma mediante WebSocket, y notificaciones externas por correo electrónico y WhatsApp. Adicionalmente, se habilitó la autogestión de datos personales y preferencias de notificación del administrador desde una sección dedicada en la plataforma.

### 1.3 Valor de negocio

Al ser un sistema basado en el reporte de riesgos, los principales atributos de calidad que debemos asegurar son seguridad, fiabilidad y disponibilidad. Con esta implementación se priorizan respuestas más tempranas a gestiones de alerta, se reducen errores humanos al momento de saber si hay una nueva alerta, y también permite llevar un historial limpio por otro medio diferente a la plataforma, esto favorece mucho la seguridad y disponibilidad de la información, ya que si el sistema llegara a caerse, el administrador podrá consultar los reportes vía correo electrónico o WhatsApp.

### 1.4 Glosario de términos

| Término | Definición |
|---------|-----------|
| **Sistema** | Plataforma tecnológica utilizada para el registro, gestión y notificación de alertas de seguridad de la organización. |
| **Administrador** | Persona encargada de recibir, crear y gestionar los nuevos reportes de alertas registradas en el sistema a través de los inicios de sesión. |
| **Seguridad** | Conjunto de medidas y prácticas implementadas para proteger la información y los recursos del sistema frente a accesos no autorizados. |
| **Disponibilidad** | Capacidad del sistema para estar operativo y accesible para los usuarios autorizados en el momento que lo requieran, minimizando tiempos de inactividad. |
| **Fiabilidad** | Grado en que el sistema realiza sus funciones de manera constante y precisa, asegurando la integridad y exactitud de la información gestionada. |
| **Notificación** | Mensaje automático enviado por el sistema a los usuarios interesados para informar sobre la ocurrencia de una nueva alerta o evento relevante. |
| **Alerta** | Evento o acción que puede poner en riesgo la seguridad, integridad o disponibilidad de los recursos gestionados por el sistema. |
| **Categoría** | Clasificación asignada a cada alerta: `malware`, `phishing`, `ddos`, `intrusion`, `other`. Determina la plantilla de notificación utilizada. |
| **Preferencias de notificación** | Configuración por usuario que indica si desea recibir notificaciones por email y/o WhatsApp, junto con sus datos de contacto. Persistidas en Redis. |
| **Logs** | Mensajes emitidos por el sistema a nivel interno para llevar trazabilidad de los casos exitosos y fallidos. Implementado con `pino`. |
| **Producer** | Punto de entrada principal del sistema. Recibe y registra alertas, las persiste en PostgreSQL y las publica en RabbitMQ. Expone los endpoints de perfil y preferencias de notificación. |
| **Worker** | Motor que trabaja en segundo plano. Consume mensajes de RabbitMQ, los transmite en tiempo real al frontend mediante WebSocket y dispara notificaciones externas por email y WhatsApp. |
| **Frontend** | Interfaz visual donde el administrador puede ver las alertas en vivo, gestionar sus datos personales y configurar sus preferencias de notificación. |
| **Backend** | Sistema central donde se ejecutan todas las operaciones y se procesa la lógica de negocio. |
| **API** | Conjunto de reglas y protocolos REST (y WebSocket) para la comunicación entre frontend, producer y worker. |

---

## 2. Especificaciones Funcionales (Historias de usuario)

### EP-01 Gestión de datos personales y contacto

**HU-01: Consultar y editar datos personales**

```
Como:   Administrador
Quiero: Acceder a mis datos personales para consultarlos o modificarlos.
Para:   Garantizar que la información del sistema sea precisa y actualizada.

Estimación T-Shirt: S
```

Criterios de Aceptación:

```gherkin
Feature: Gestión de perfil personal

  Scenario: Visualización de datos del perfil personal
    Given un administrador autenticado en el sistema
    When accede a la sección "Perfil Personal" desde el menú principal
    Then el sistema muestra sus datos personales actuales: username, email, rol y fecha de creación

  Scenario: Edición exitosa de datos de perfil
    Given un administrador en la sección "Perfil Personal"
    When actualiza su correo electrónico con un valor válido
    And selecciona "Guardar cambios"
    Then el sistema valida y almacena los nuevos datos en PostgreSQL
    And muestra el mensaje "Perfil actualizado correctamente"

  Scenario: Intento de guardado con correo inválido
    Given un administrador editando su perfil personal
    When ingresa un correo electrónico con formato inválido
    And selecciona "Guardar cambios"
    Then el sistema muestra un error de validación inline
    And no persiste cambios en el perfil
```

---

**HU-02: Registrar número telefónico y configurar preferencias de notificación**

```
Como:   Administrador
Quiero: Agregar mi número telefónico como dato de contacto y configurar qué canales deseo activar.
Para:   Habilitar notificaciones externas y mantener datos de contacto completos.

Estimación T-Shirt: S
```

Criterios de Aceptación:

```gherkin
Feature: Registro de contacto y preferencias de notificación

  Scenario: Agregar número telefónico válido
    Given un administrador en la sección de preferencias de notificación
    And el campo "Número telefónico" está vacío
    When ingresa un número con formato E.164 válido (ej: +573001234567)
    And selecciona "Guardar cambios"
    Then el sistema almacena el número en Redis bajo su usuario
    And el cambio se refleja inmediatamente al consultar las preferencias

  Scenario: Activar canal de email
    Given un administrador con email configurado
    When activa el canal "Email" y selecciona "Guardar cambios"
    Then el sistema actualiza emailEnabled=true en sus preferencias
    And a partir de ese momento recibirá notificaciones por correo al registrarse alertas

  Scenario: Activar canal de WhatsApp
    Given un administrador con número telefónico configurado
    When activa el canal "WhatsApp" y selecciona "Guardar cambios"
    Then el sistema actualiza whatsappEnabled=true en sus preferencias
    And a partir de ese momento recibirá mensajes de WhatsApp al registrarse alertas
```

---

### EP-02 Notificación en tiempo real dentro de la plataforma

**HU-03: Recibir notificación automática en panel**

```
Como:   Administrador
Quiero: Que al llegar una nueva alerta el sistema me notifique automáticamente.
Para:   Tomar decisiones tempranas.

Estimación T-Shirt: M
```

Criterios de Aceptación:

```gherkin
Feature: Notificaciones en tiempo real en la plataforma

  Scenario: Recepción de nueva alerta en panel de notificaciones
    Given un administrador con sesión activa en el panel de control
    When se registra una nueva alerta con categoría "malware" y descripción "Nuevo troyano detectado"
    Then el panel muestra una notificación sin recargar la página
    And la notificación contiene fecha, categoría, severidad, IP de origen y descripción

  Scenario: Historial de alertas al reconectar
    Given un administrador que cierra y reabre la conexión al panel
    When el sistema establece la nueva conexión WebSocket
    Then el panel recupera y muestra las alertas previas almacenadas en Redis

  Scenario: Borrado del historial desde el panel
    Given un administrador con notificaciones acumuladas en el panel
    When ejecuta la acción "Limpiar todo"
    Then el sistema elimina el historial en Redis
    And el panel queda vacío en todos los clientes conectados
```

---

### EP-03 Notificación externa multicanal

**HU-04: Recibir notificaciones por email**

```
Como:   Administrador
Quiero: Recibir notificaciones por email.
Para:   Enterarme aun cuando no esté conectado y conservar historial externo auditable.

Estimación T-Shirt: M
```

Criterios de Aceptación:

```gherkin
Feature: Notificaciones externas por email

  Scenario: Envío exitoso de notificación por email
    Given un administrador con emailEnabled=true y email válido configurado
    When se registra una nueva alerta en el sistema
    Then el sistema envía notificación inmediata por email via SendGrid
    And el asunto es específico según la categoría de la alerta
    And el cuerpo incluye fecha, categoría, severidad, IP de origen y descripción
    And el sistema registra el envío exitoso en logs

  Scenario: Reintento automático ante fallo transitorio
    Given el servicio de email no está disponible en el primer intento
    When el sistema detecta el fallo
    Then reintenta hasta 3 veces con backoff exponencial (1s, 2s, 4s)
    And si algún reintento es exitoso el envío queda registrado como exitoso en logs

  Scenario: Falla de email no bloquea otros canales
    Given el servicio de email no está disponible
    And el servicio de WhatsApp está disponible
    And el administrador tiene número telefónico válido configurado
    When se registra una nueva alerta
    Then el sistema registra el fallo de email en logs
    And el flujo de notificación por WhatsApp continúa de forma independiente
```

---

**HU-05: Recibir notificaciones por WhatsApp**

```
Como:   Administrador en movilidad.
Quiero: Recibir notificaciones por WhatsApp.
Para:   Enterarme de riesgos de forma inmediata fuera de la plataforma.

Estimación T-Shirt: L
```

Criterios de Aceptación:

```gherkin
Feature: Notificaciones externas por WhatsApp

  Scenario: Envío exitoso de mensaje WhatsApp
    Given un administrador con whatsappEnabled=true y número telefónico válido configurado
    When el sistema procesa una nueva alerta
    Then el Worker envía el mensaje via WhatsApp Business API (Meta Graph API v18.0)
    And el mensaje contiene el asunto y cuerpo según la categoría de la alerta
    And el sistema registra el envío exitoso en logs

  Scenario: No se envía si no hay número configurado
    Given un administrador con whatsappEnabled=true pero sin número telefónico
    When se registra una nueva alerta
    Then el sistema no intenta enviar el mensaje
    And no genera ningún log de intento fallido

  Scenario: Reintento automático ante fallo
    Given la API de Meta no está disponible en el primer intento
    When el sistema detecta el fallo
    Then reintenta hasta 3 veces con backoff exponencial
    And si todos los intentos fallan registra el error en logs sin interrumpir otros canales
```

---

## 4. Validación INVEST por historia

| Historia | I | N | V | E | S | T | Observación |
|----------|---|---|---|---|---|---|-------------|
| HU-01 | Si | Si | Si | Si | Si | Si | Independiente con perfil básico. |
| HU-02 | Si | Si | Si | Si | Si | Si | Desplegable en iteración separada. |
| HU-03 | Si | Si | Si | Si | Si | Si | Valor inmediato en plataforma. |
| HU-04 | Si | Si | Si | Si | Si | Si | Integración acotada al canal email. |
| HU-05 | Parcial | Si | Si | Si | Si | Si | Depende de HU-02 para el dato de contacto. |

---

## 3. Alcance de la feature

### 3.1 Dentro del alcance

- Un administrador tiene una sección "Perfil Personal" donde puede consultar y editar sus datos.
- Un administrador puede registrar y modificar su número telefónico como dato de contacto.
- Un administrador puede activar o desactivar los canales de notificación (email y WhatsApp) desde sus preferencias.
- Un administrador recibirá notificaciones en tiempo real en la plataforma sin recargar la página.
- Un administrador recibirá notificaciones por email y WhatsApp cuando se registre una nueva alerta.
- Las notificaciones de email se personalizan según la categoría de la alerta mediante plantillas predefinidas.

### 3.2 Fuera del alcance

- Un administrador puede filtrar las notificaciones que recibirá por categoría.
- Un administrador puede silenciar las notificaciones.
- Un administrador puede personalizar el contenido de las plantillas de notificación.
- Un administrador puede desactivar las notificaciones de otro administrador.
- Las notificaciones no se persisten como entidad independiente en base de datos relacional.

---

## 4. Modelo de negocio

### 4.1 Entidades principales

| Entidad | Persistencia |
|---------|-------------|
| Administrador (`users`) | PostgreSQL |
| Alerta (`threats`) | PostgreSQL |
| Preferencias de notificación | Redis — clave `notif:prefs:<username>` |

Las notificaciones no son una entidad persistida. Son eventos transitorios que se envían y se registran en logs.

### 4.2 Relaciones

- Un administrador tiene unas preferencias de notificación.
- Un administrador puede recibir alertas y notificaciones.
- Una alerta pertenece a una categoría.
- Una alerta dispara el flujo de notificación hacia todos los canales configurados del administrador.

---

## 5. Reglas de negocio

- Toda alerta debe tener una categoría obligatoria.
- Las notificaciones se envían solo si el canal está habilitado y el dato de contacto está configurado.
- El fallo en un canal de envío no debe afectar el envío por otros canales.
- Todo intento de envío y su resultado deben quedar registrados en los logs.
- Las notificaciones deben contener información mínima: fecha, categoría y descripción.
- El sistema debe garantizar que cada alerta sea procesada al menos una vez.
- Si un envío falla, el sistema debe reintentar hasta 3 veces con backoff exponencial.

---

## 6. Consideraciones arquitectónicas

### 6.1 Impacto en arquitectura existente

El sistema sigue un modelo desacoplado y tolerante a fallos, donde el registro de alertas es independiente del proceso de notificación, garantizando que ninguna alerta se pierda incluso si los canales de comunicación fallan.

En el producer tendremos un impacto alto, ya que se habilitaron capacidades de autogestión de datos personales del administrador y configuración de preferencias de notificación, con nuevos endpoints `GET/PATCH /api/profile` y `GET/PUT /api/profile/notification-preferences`.

En el frontend veremos un impacto alto, ya que se creó la sección "Perfil Personal" con formulario reactivo y validaciones E.164, la sección de preferencias de notificación, y el panel de alertas en tiempo real via WebSocket.

En el worker tendremos un impacto muy alto, ya que ahora cuando recibe una nueva alerta consulta las preferencias del administrador en Redis e integra SendGrid para email y WhatsApp Business API para mensajería, con manejo de errores independiente por canal y registros en logs.

En la persistencia tendremos un impacto medio, ya que se agregaron las columnas `full_name` e `is_active` a la tabla `users` en PostgreSQL, y se usa Redis para las preferencias de notificación.

### 6.2 Patrones de diseño clave

**Observer**: El Worker actúa como observador de la cola RabbitMQ. Cuando el Producer publica una alerta, el Worker la consume y desencadena el flujo de notificaciones sin que el Producer tenga ningún conocimiento de ello. Este patrón permitió añadir los canales de email y WhatsApp sin tocar el Producer.

**Adapter**: `EmailAdapter` y `WhatsAppAdapter` implementan el contrato `INotificationService`, desacoplando el `NotificationOrchestrator` de SendGrid y de la API de Meta. En el futuro, cambiar de proveedor o pasar de WhatsApp a Telegram solo requiere implementar `INotificationService` sin tocar el orquestador.

**Strategy**: `CategoryTemplateStrategy` define lógica flexible de generación de contenido de notificaciones basada en la categoría de la alerta. Selecciona la plantilla adecuada e interpola las variables del payload. Agregar una nueva categoría es tan simple como agregar una entrada al mapa de plantillas.

---

## 7. Estimación de historias de usuario

Para la estimación de las historias de usuario se utilizó la técnica T-Shirt Sizing, la cual permite clasificar el esfuerzo relativo de implementación de cada historia de forma rápida y colaborativa.

| Historia de Usuario | Estimación |
|--------------------|------------|
| HU-01: Consultar y editar datos personales | S |
| HU-02: Registrar número telefónico y configurar preferencias | S |
| HU-03: Notificaciones en tiempo real (sistema) | M |
| HU-04: Notificaciones externas por email | M |
| HU-05: Notificaciones externas por WhatsApp | L |

---

## 8. Requerimientos no funcionales

### 8.1 Seguridad

- Solo usuarios autenticados pueden acceder al sistema.
- La información sensible debe viajar de forma segura.
- Las integraciones externas deben usar credenciales protegidas en variables de entorno.

### 8.2 Rendimiento

- Registrar una alerta no debe demorar más de dos segundos.
- Las notificaciones en el sistema deben aparecer en menos de 3 segundos.

### 8.3 Disponibilidad

- El sistema debe estar disponible el 99% del tiempo.
- Si fallan los servicios externos, el sistema debe seguir funcionando.

### 8.4 Fiabilidad

- Ninguna alerta debe perderse.
- Si una notificación falla, debe quedar registrada.
- El sistema debe garantizar que cada alerta sea procesada al menos una vez.

### 8.5 Logs

- El sistema debe guardar lo que pasa: alertas, envíos y errores.
- Debe ser fácil revisar qué falló y qué funcionó.
- Los logs deben permitir rastrear cada alerta desde su registro hasta el intento de notificación.

### 8.6 Integraciones

- El sistema no debe depender de un solo proveedor externo.
- Si un servicio falla, no debe afectar todo el flujo.

### 8.7 Escalabilidad

- El sistema debe soportar más alertas sin volverse lento.
- Debe ser fácil agregar nuevos canales de notificación en el futuro.

### 8.8 Usabilidad

- Las alertas deben ser fáciles de entender.
- El administrador debe poder usar el sistema sin complicaciones.

---

## 9. Diagrama C4 arquitectónico

Ver archivo `docs/diagrams/c4-threat-statistics.drawio.xml` — pendiente de actualizar con los nuevos componentes de notificación.

---

## 10. Diagrama de secuencia

Ver archivo `docs/diagrams/sequence-threat-statistics.drawio.xml` — pendiente de actualizar con el flujo de notificación multicanal.

---

## 11. Diagrama de componentes

Ver archivo `docs/diagrams/component-notification-feature.drawio.xml` — pendiente de actualizar con `EmailAdapter`, `WhatsAppAdapter`, `NotificationOrchestrator` y `CategoryTemplateStrategy`.


