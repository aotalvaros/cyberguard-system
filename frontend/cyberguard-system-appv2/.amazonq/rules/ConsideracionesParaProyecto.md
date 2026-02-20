Reglas:
0: Asegurate de entender primero bien la logica del negocio antes de ponerte a implementar los nuevos ajustes
1: Infraestructura Dockerfile
2: Aplicar patrones de diseño que se acoplen muy bien con la tecnologia y con la arquitectura, en este caso usaremos hexagonal
3: Respetar principios de clean code y aplicar SOLID siempre teniendo en cuenta la arquitectura, usaremos hexagonal, pero tambien tendremos como paradigma arquitectura orientada a eventos
4: Hacer pruebas unitarias que cumplan, y también pruebas de integracion, usaremos jest y testing library
5: Tener en cuenta la inversion de dependencias para alta cohesion y bajo acoplamiento
6: Iras trabajando por features, por lo tanto, no hagas todo de una sino me vas soltando por features
7: Podemos usar facade pattern, strategy pattern, decorator y factory, y si consideras otro que se pueda aplicar también.
8. En cada feature iras actualizando un archivo llamado AI_WORFLOW.md, donde describiras lo que hiciste, los cambios, el feature en el que trabajaste.

9. TODOS los componentes UI deben ser FULL RESPONSIVE para todas las pantallas (mobile, tablet, desktop). Usar clamp(), media queries y diseño flexible.

10. TODAS las URLs, puertos y configuraciones deben estar en variables de entorno (src/environments/environment.ts). Nunca hardcodear URLs en servicios.

11. CADA cambio que hagas debes verificar que las pruebas unitarias y de integración sigan pasando. Ejecutar npm test después de cada modificación importante.

12. NO usar 'any'. Todo debe estar tipado correctamente con interfaces, types o enums. Usar tipos específicos siempre.
