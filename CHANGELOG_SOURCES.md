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