# CyberguardSystem

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli) version 21.1.3.

## Descripcion

Frontend del sistema de alertas de ciberseguridad en tiempo real CyberGuard. Aplicacion Angular standalone con autenticacion JWT, dashboard de alertas WebSocket y reporte manual de incidentes.

## Caracteristicas

- **Autenticacion**: Login con JWT y proteccion de rutas (guard)
- **Dashboard admin**: Visualizacion de alertas en tiempo real via WebSocket
- **Reporte manual**: Formulario para reportar incidentes de seguridad
- **Historial persistente**: Alertas guardadas en localStorage y sincronizadas con Redis (backend worker)
- **Gestion de alertas**: Eliminar alertas individuales o limpiar historial completo

## Prerequisitos

- Node.js >= 20.x
- npm
- Backend API corriendo en `http://localhost:3000`
- Worker WebSocket corriendo en `ws://localhost:8081`

## Instalacion

```bash
cd frontend/cyberguard-system
npm install
```

## Configuracion

Edita `environment.ts` si necesitas cambiar las URLs del backend:

```typescript
export const environment = {
    baseUrl: 'http://localhost:3000/api/auth',
    apiBase: 'http://localhost:3000/api'
};
```

## Servidor de desarrollo

Para iniciar un servidor de desarrollo local, ejecuta:

```bash
ng serve
```

Cuando el servidor este en ejecucion, abre tu navegador y ve a `http://localhost:4200/`. La aplicacion se recargara automaticamente cuando modifiques cualquiera de los archivos fuente.

## Flujo de usuario

### 1. Login
- Ruta: `/autenticacion`
- Credenciales por defecto: `admin` / `cyberguard2024`
- Valida contra API backend y guarda token JWT en localStorage

### 2. Dashboard admin
- Ruta: `/dashboard` (protegida por `adminGuard`)
- Muestra alertas en tiempo real desde WebSocket
- Formulario de reporte manual de incidentes:
  - Type: malware, intrusion, phishing, ddos, ransomware
  - Severity: low, medium, high, critical
  - Source IP (requerido), Target IP (opcional)
  - Description (10-500 caracteres)
  - Timestamp local (Bogota) enviado en metadata
- Acciones:
  - **Submit report**: Envia incidente a API backend
  - **Delete** (×): Elimina alerta individual (sincroniza con Redis)
  - **Clear All**: Limpia todo el historial (sincroniza con Redis)

## Estructura del proyecto

```
frontend/cyberguard-system/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── admin-dashboard.component.ts   # Dashboard + formulario reporte
│   │   │   ├── admin-dashboard.component.html
│   │   │   └── admin-dashboard.component.css
│   │   ├── autenticacion/
│   │   │   ├── autenticacion.component.ts     # Login
│   │   │   ├── autenticacion.component.html
│   │   │   └── autenticacion.component.css
│   │   ├── guards/
│   │   │   └── admin.guard.ts                 # Proteccion de rutas admin
│   │   ├── services/
│   │   │   ├── auth.service.ts                # Autenticacion JWT
│   │   │   ├── ws.service.ts                  # WebSocket + historial localStorage
│   │   │   └── threat.service.ts              # API de amenazas (reporte manual)
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── app.ts
│   │   └── app.html
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── environment.ts
├── angular.json
├── package.json
└── README.md
```

## Servicios

### AuthService
- `login(username, password)`: Autenticacion con backend
- `logout()`: Cierra sesion y desconecta WebSocket
- `isAdmin()`: Verifica si el usuario tiene rol admin
- `getToken()`: Obtiene token JWT para peticiones autenticadas

### WsService
- `connect()`: Conecta WebSocket al worker
- `disconnect()`: Cierra conexion WebSocket
- `messages$`: Observable con historial de alertas
- `deleteMessage(index)`: Elimina alerta individual (sincroniza con Redis)
- `clearAll()`: Limpia historial local
- `requestClearAll()`: Envia comando al servidor para limpiar Redis

### ThreatService
- `reportThreat(payload)`: Envia reporte manual de incidente al backend

## Generacion de codigo

Angular CLI incluye herramientas potentes de generacion. Para crear un nuevo componente, ejecuta:

```bash
ng generate component component-name
```

Para una lista completa de esquemas disponibles (como `components`, `directives` o `pipes`), ejecuta:

```bash
ng generate --help
```

## Build

Para compilar el proyecto, ejecuta:

```bash
ng build
```

Esto compilara el proyecto y guardara los artefactos en el directorio `dist/`. Por defecto, el build de produccion optimiza la aplicacion para rendimiento y velocidad.

## Ejecutar pruebas unitarias

Para ejecutar pruebas unitarias con el runner [Vitest](https://vitest.dev/), usa el siguiente comando:

```bash
ng test
```

## Ejecutar pruebas end-to-end

Para pruebas end-to-end (e2e), ejecuta:

```bash
ng e2e
```

Angular CLI no incluye un framework de pruebas end-to-end por defecto. Puedes elegir el que mejor se adapte a tus necesidades.

## Validaciones del formulario

El formulario de reporte manual incluye validaciones en tiempo real:

- **Source IP**: IPv4 valida (requerido)
- **Target IP**: IPv4 valida (opcional)
- **Description**: 10-500 caracteres (requerido)
- Campos invalidos se resaltan en rojo con mensajes de error

## Sincronizacion de historial

El historial de alertas se guarda en:
- **localStorage** (cliente): persiste entre recargas de pagina
- **Redis** (servidor): compartido entre todos los clientes conectados

Comandos WebSocket:
- `{ "type": "clear-all" }`: Limpia Redis y notifica a todos los clientes
- `{ "type": "delete-one", "id": "<messageId>" }`: Elimina un item de Redis

## Recursos adicionales

Para mas informacion sobre el uso de Angular CLI, incluyendo referencias detalladas de comandos, visita la pagina [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).
