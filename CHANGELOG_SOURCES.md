Hoy quise aplicar el concepto Human First, y saque mi propia FEATURE basandome en las necesidades del negocio, sin embargo, al analizarla exhaustivamente me di cuenta que podria ser considerada un refactor o deuda tecnica, la feature era la siguiente:

- **Feature**: Independizar la categoria de las amenazas para que modificar una ya existente o implementar una nueva no afecte directamente el sistema.

Como podemos observar esto involucraria cambiar la estructura de las amenazadas, donde antes era un atributo propio de la amenaza ahora sera una relacion con una  categoria, pero considere que esto realmente seria una deuda tecnica o refactor porque es algo que se debio tener en cuenta antes de implementar la estructura de las amenazas.

Entonces, use la IA para proponerme features basandose en las necesidades del negocio y que realmente aporten algun valor, me sugirio varias, pero me decidi por una que considere sustanciosa y paso siguiente a lo ya hecho:

- **Feature**: Implementar un sistema de notificaciones para alertar a los usuarios interesados sobre reportes personalizados en las amenazas o categorías.

