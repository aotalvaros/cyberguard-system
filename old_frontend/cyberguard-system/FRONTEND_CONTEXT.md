# 🛡️ CyberGuard Frontend - Sistema de Alertas de Ciberseguridad

## 📋 Contexto de Negocio

**CyberGuard Frontend** es la interfaz de usuario para un sistema de monitoreo de amenazas de ciberseguridad. Permite a administradores reportar amenazas y recibir notificaciones en tiempo real.

### Funcionalidades
- Login de administradores
- Reporte de amenazas de seguridad
- Recepción de alertas en tiempo real vía WebSocket
- Historial de amenazas con persistencia local
- Gestión de alertas (eliminar individual o todas)

---

## 🏗️ Arquitectura Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                     CyberGuard Frontend                      │
│                      (Angular 21)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Login      │    │  Dashboard   │    │  WebSocket   │ │
│  │  Component   │───▶│  Component   │◀───│   Client     │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         ▼                    ▼                    ▼         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │    Auth      │    │   Threat     │    │      WS      │ │
│  │   Service    │    │   Service    │    │   Service    │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
└─────────┼────────────────────┼────────────────────┼─────────┘
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │ Backend  │         │ Backend  │        │  Worker  │
    │   API    │         │   API    │        │    WS    │
    │  /login  │         │ /threats │        │  :8081   │
    └──────────┘         └──────────┘        └──────────┘
```

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── services/
│   │   ├── auth.service.ts           # Autenticación y sesiones
│   │   ├── threat.service.ts         # Reporte de amenazas
│   │   └── ws.service.ts             # Cliente WebSocket
│   ├── guards/
│   │   └── admin.guard.ts            # Protección de rutas admin
│   ├── admin/
│   │   ├── admin-dashboard.component.ts
│   │   ├── admin-dashboard.component.html
│   │   └── admin-dashboard.component.css
│   ├── autenticacion/
│   │   ├── autenticacion.component.ts
│   │   ├── autenticacion.component.html
│   │   └── autenticacion.component.css
│   ├── app.routes.ts                 # Rutas de la aplicación
│   └── app.ts                        # Componente raíz
├── environment.ts                     # Variables de entorno
└── main.ts
```

---

## 🔌 Contratos con Backend

### 1. Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```typescript
{
  username: string;  // Requerido
  password: string;  // Requerido
}
```

**Response 200:**
```typescript
{
  token: string;     // JWT token
  user: {
    username: string;
    role: string;    // "admin" | "user"
  }
}
```

**Response 401:**
```typescript
{
  error: string;     // "Invalid credentials"
}
```

**Credenciales por Defecto:**
- Username: `admin`
- Password: `cyberguard2024`

---

### 2. Reporte de Amenazas

**Endpoint:** `POST /api/threats`

**Headers:**
```typescript
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request:**
```typescript
{
  type: "malware" | "intrusion" | "phishing" | "ddos" | "ransomware";  // Requerido
  severity: "low" | "medium" | "high" | "critical";                    // Requerido
  sourceIp: string;        // Requerido - IPv4 válida (ej: "192.168.1.1")
  targetIp?: string;       // Opcional - IPv4 válida
  description: string;     // Requerido - 10-500 caracteres
  metadata?: {             // Opcional
    [key: string]: any;
  }
}
```

**Validaciones:**
- `sourceIp`: Debe ser IPv4 válida (regex: `/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/`)
- `targetIp`: Si se provee, debe ser IPv4 válida
- `description`: Mínimo 10 caracteres, máximo 500

**Response 201:**
```typescript
{
  threatId: string;        // ID único de la amenaza
  status: "queued";
  message: string;
}
```

**Response 400:**
```typescript
{
  error: string;
  details?: {
    [field: string]: string;
  }
}
```

**Response 401:**
```typescript
{
  error: "Unauthorized - Invalid or missing token"
}
```

---

### 3. WebSocket - Notificaciones en Tiempo Real

**URL:** `ws://localhost:8081`

**Conexión:**
- Se conecta automáticamente cuando el usuario es admin
- Reconexión automática cada 2 segundos si se desconecta

**Mensajes del Cliente → Servidor:**

```typescript
// Limpiar todas las alertas
{
  type: "clear-all"
}

// Eliminar alerta específica
{
  type: "delete-one",
  id: string  // ID de la amenaza
}
```

**Mensajes del Servidor → Cliente:**

```typescript
// Nueva amenaza detectada
{
  eventId: string;           // ID único del evento
  type: "threat.detected";
  routingKey: string;
  data: {
    threatId: string;
    type: "malware" | "intrusion" | "phishing" | "ddos" | "ransomware";
    severity: "low" | "medium" | "high" | "critical";
    sourceIp: string;
    targetIp?: string;
    description: string;
    metadata?: any;
  };
  receivedAt: string;        // ISO timestamp
  processedAt: string;       // ISO timestamp
}

// Comando de limpieza
{
  type: "clear-all"
}

// Comando de eliminación
{
  type: "delete-one",
  id: string
}
```

---

## 🔐 Autenticación y Seguridad

### Flujo de Autenticación

1. Usuario ingresa credenciales en `/autenticacion`
2. Frontend envía POST a `/api/auth/login`
3. Backend valida y retorna JWT + datos de usuario
4. Frontend guarda en localStorage:
   - `token`: JWT token
   - `user`: JSON con username y role
5. Frontend redirige a `/dashboard`
6. Guard `adminGuard` protege rutas admin

### Almacenamiento Local

```typescript
// localStorage keys
"token"  → "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
"user"   → '{"username":"admin","role":"admin"}'
"cg_ws_history" → '[{...}, {...}]'  // Historial de alertas
```

### Headers HTTP

```typescript
// Todas las peticiones a /api/threats incluyen:
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

---

## 📦 Servicios del Frontend

### 1. AuthService

**Responsabilidad:** Gestión de autenticación y sesiones

**Métodos:**
```typescript
class AuthService {
  // Observable del usuario actual
  user$: Observable<User | null>;

  // Login
  login(username: string, password: string): Observable<LoginResponse>;

  // Logout
  logout(): void;

  // Obtener usuario actual
  getUser(): User | null;

  // Verificar si es admin
  isAdmin(): boolean;

  // Obtener token
  getToken(): string | null;
}
```

**Comportamiento:**
- Guarda token y user en localStorage
- Emite cambios de usuario vía BehaviorSubject
- Conecta WebSocket si el usuario es admin
- Desconecta WebSocket en logout

---

### 2. ThreatService

**Responsabilidad:** Reporte de amenazas

**Métodos:**
```typescript
class ThreatService {
  // Reportar amenaza
  reportThreat(payload: ThreatRequest): Observable<any>;
}
```

**Comportamiento:**
- Agrega header Authorization con JWT
- Envía POST a `/api/threats`
- Retorna Observable con respuesta

---

### 3. WsService

**Responsabilidad:** Cliente WebSocket y gestión de alertas

**Propiedades:**
```typescript
class WsService {
  // Observable de mensajes (historial completo)
  messages$: Observable<any[]>;

  // Capacidad del historial (200 mensajes)
  private historyCapacity: number = 200;
}
```

**Métodos:**
```typescript
class WsService {
  // Conectar WebSocket
  connect(): void;

  // Desconectar WebSocket
  disconnect(): void;

  // Enviar mensaje al servidor
  send(obj: any): void;

  // Eliminar mensaje por índice
  deleteMessage(index: number): void;

  // Limpiar todas las alertas (local)
  clearAll(): void;

  // Solicitar limpieza al servidor
  requestClearAll(): void;
}
```

**Comportamiento:**
- **Persistencia:** Guarda historial en localStorage (`cg_ws_history`)
- **Deduplicación:** Evita duplicados por `eventId`, `threatId`, o hash
- **Capacidad:** Máximo 200 mensajes (FIFO)
- **Reconexión:** Automática cada 2 segundos si se desconecta
- **Carga inicial:** Lee historial de localStorage al iniciar

**Deduplicación de Mensajes:**
```typescript
// Prioridad de IDs:
1. payload.eventId
2. payload.data.threatId
3. payload.routingKey + payload.receivedAt
4. payload.routing + payload.timestamp
5. Hash del JSON completo
```

---

## 🎨 Componentes

### 1. AutenticacionComponent

**Ruta:** `/autenticacion`

**Funcionalidad:**
- Formulario de login (username, password, remember)
- Validación de campos requeridos
- Manejo de errores (8+ formatos diferentes)
- Timeout de 10 segundos
- Toggle de visibilidad de password
- Redirección a `/dashboard` en éxito

**Formulario:**
```typescript
{
  username: string;    // Requerido
  password: string;    // Requerido
  remember: boolean;   // Opcional (no implementado aún)
}
```

**Estados:**
- `loading`: boolean - Indica si está procesando login
- `error`: string - Mensaje de error
- `success`: string - Mensaje de éxito
- `showPassword`: boolean - Visibilidad del password

---

### 2. AdminDashboardComponent

**Ruta:** `/dashboard` (protegida por `adminGuard`)

**Funcionalidad:**
- Formulario de reporte de amenazas
- Lista de alertas en tiempo real
- Eliminar alerta individual
- Limpiar todas las alertas
- Logout

**Formulario de Amenazas:**
```typescript
{
  type: "intrusion";           // Default
  severity: "medium";          // Default
  sourceIp: string;            // Validación IPv4
  targetIp: string;            // Validación IPv4 opcional
  description: string;         // 10-500 caracteres
}
```

**Validadores Custom:**
- `ipValidator`: Valida IPv4 con regex
- `optionalIpValidator`: Valida IPv4 solo si no está vacío

**Estados:**
- `messages`: any[] - Lista de alertas (máximo 50 visibles)
- `submitting`: boolean - Indica si está enviando amenaza
- `formError`: string - Error del formulario
- `formSuccess`: string - Éxito del formulario

**Metadata Automática:**
```typescript
{
  reportedAtLocal: string;   // Timestamp en zona horaria Bogotá
  reportedAtTz: "America/Bogota"
}
```

---

## 🛡️ Guards

### adminGuard

**Tipo:** Functional Guard (Angular 14+)

**Funcionalidad:**
- Verifica si el usuario es admin
- Permite acceso si `user.role === 'admin'` o `user.role === 'ADMIN'`
- Redirige a `/autenticacion` si no es admin

**Uso:**
```typescript
{
  path: 'dashboard',
  component: AdminDashboardComponent,
  canActivate: [adminGuard]
}
```

---

## 🔄 Flujo Completo de Usuario

### 1. Login
```
Usuario ingresa credenciales
  ↓
AutenticacionComponent.submit()
  ↓
AuthService.login(username, password)
  ↓
POST /api/auth/login
  ↓
Guardar token y user en localStorage
  ↓
Conectar WebSocket (si es admin)
  ↓
Redirigir a /dashboard
```

### 2. Reporte de Amenaza
```
Usuario llena formulario
  ↓
AdminDashboardComponent.submitThreat()
  ↓
Validar formulario (IPs, descripción)
  ↓
ThreatService.reportThreat(payload)
  ↓
POST /api/threats con JWT
  ↓
Mostrar mensaje de éxito/error
  ↓
Resetear formulario
```

### 3. Recepción de Alerta
```
Worker procesa amenaza
  ↓
Worker envía mensaje por WebSocket
  ↓
WsService.onmessage()
  ↓
Deduplicar por ID
  ↓
Agregar a historial (FIFO)
  ↓
Guardar en localStorage
  ↓
Emitir nuevo array vía messages$
  ↓
AdminDashboardComponent recibe actualización
  ↓
Mostrar alerta en UI (máximo 50)
```

---

## 🚀 Instalación y Ejecución

### Desarrollo Local

```bash
cd frontend/cyberguard-system
npm install
npm start
```

**Acceder:** http://localhost:4200

### Build de Producción

```bash
npm run build
```

**Output:** `dist/cyberguard-system/`

---

## 🧪 Testing

### Ejecutar Tests

```bash
npm test                    # Modo watch
npm run test:coverage       # Con cobertura
```

### Cobertura Actual

| Archivo | Cobertura | Tests |
|---------|-----------|-------|
| auth.service.ts | 95%+ | 35+ |
| threat.service.ts | 90%+ | 25+ |
| ws.service.ts | 95%+ | 50+ |
| admin-dashboard.component.ts | 90%+ | 50+ |
| autenticacion.component.ts | 95%+ | 40+ |
| admin.guard.ts | 100% | 6 |

### Archivos de Testing

- `*.spec.ts` - Tests unitarios
- `TESTING_GUIDE.md` - Guía completa de estrategias
- `ANGULAR_JEST_SETUP.md` - Setup de Jest

---

## 🔧 Variables de Entorno

```typescript
// environment.ts
export const environment = {
  production: false,
  baseUrl: 'http://localhost:3000/api/auth',  // URL de autenticación
  apiBase: 'http://localhost:3000/api',       // URL base de API
  wsUrl: 'ws://localhost:8081'                // URL de WebSocket
};
```

**Configuración en Runtime:**
```typescript
// Sobrescribir desde window.__env
(window as any).__env = {
  WORKER_WS_URL: 'ws://custom:9999',
  WORKER_HISTORY_CAPACITY: '100'
};
```

---

## 🐛 Troubleshooting

### No recibo notificaciones WebSocket

**Verificar:**
1. Usuario es admin: `localStorage.getItem('user')` debe tener `role: "admin"`
2. WebSocket conectado: Abrir DevTools → Network → WS
3. Worker corriendo: Backend debe estar enviando mensajes

**Solución:**
```typescript
// Forzar reconexión
this.ws.disconnect();
this.ws.connect();
```

---

### Error 401 en /api/threats

**Verificar:**
1. Token existe: `localStorage.getItem('token')`
2. Token no expirado (24 horas)
3. Header Authorization correcto

**Solución:**
```typescript
// Re-login
this.auth.logout();
this.router.navigate(['/autenticacion']);
```

---

### Alertas duplicadas

**Causa:** Mensajes sin ID único

**Solución:** El sistema deduplica automáticamente, pero verifica:
```typescript
// Cada mensaje debe tener al menos uno de:
- eventId
- data.threatId
- routingKey + receivedAt
```

---

## 📚 Documentación Adicional

- **TESTING_GUIDE.md** - Estrategias de testing (2000+ líneas)
- **ANGULAR_JEST_SETUP.md** - Setup de Jest para Angular
- **NEW_PROJECT_SETUP.md** - Setup para proyecto nuevo

---

## 🎯 Para Agentes de IA

**Contexto Clave:**
- Sistema de alertas de ciberseguridad
- Angular 21 standalone components
- Comunicación con backend vía HTTP + WebSocket
- Persistencia local en localStorage
- Deduplicación de mensajes por ID
- Validación de IPs con regex
- Manejo de 8+ formatos de error HTTP

**Contratos Críticos:**
- Login: POST /api/auth/login
- Amenazas: POST /api/threats (requiere JWT)
- WebSocket: ws://localhost:8081 (solo admin)

**Arquitectura:**
- Services: auth, threat, ws
- Components: autenticacion, admin-dashboard
- Guards: adminGuard (protege rutas admin)

---

**Última actualización:** Febrero 2024
