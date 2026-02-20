# 🛡️ CyberGuard Frontend - Contexto para IA

## 🎯 Resumen Ejecutivo

Sistema de alertas de ciberseguridad en tiempo real con Angular 21. Permite login, reporte de amenazas y notificaciones WebSocket.

**Stack:** Angular 21 + RxJS + WebSocket + localStorage  
**Patrón:** Services + Components + Guards

---

## 📡 Contratos Backend

### 1. Login: `POST /api/auth/login`

```typescript
// Request
{ username: string, password: string }

// Response 200
{ token: string, user: { username: string, role: string } }

// Credenciales: admin / cyberguard2024
```

### 2. Amenazas: `POST /api/threats`

```typescript
// Headers
{ "Authorization": "Bearer <token>" }

// Request
{
  type: "malware" | "intrusion" | "phishing" | "ddos" | "ransomware",
  severity: "low" | "medium" | "high" | "critical",
  sourceIp: string,  // IPv4 válida
  targetIp?: string, // IPv4 opcional
  description: string, // 10-500 chars
  metadata?: any
}

// Response 201
{ threatId: string }
```

### 3. WebSocket: `ws://localhost:8081`

```typescript
// Cliente → Servidor
{ type: "clear-all" }
{ type: "delete-one", id: string }

// Servidor → Cliente
{
  eventId: string,
  data: {
    threatId: string,
    type: string,
    severity: string,
    sourceIp: string,
    description: string
  }
}
```

---

## 🔧 Servicios

### AuthService

```typescript
// Login
this.auth.login('admin', 'pass').subscribe(res => {
  // Token guardado automáticamente
  this.router.navigate(['/dashboard']);
});

// Logout
this.auth.logout(); // Limpia localStorage + desconecta WS

// Verificar admin
if (this.auth.isAdmin()) { /* ... */ }

// Obtener token
const token = this.auth.getToken();
```

### ThreatService

```typescript
const payload = {
  type: 'malware',
  severity: 'high',
  sourceIp: '192.168.1.100',
  description: 'Malware detected'
};

this.threatService.reportThreat(payload).subscribe({
  next: res => console.log(res.threatId),
  error: err => console.error(err.error)
});
```

### WsService

```typescript
// Conectar
this.ws.connect();

// Recibir mensajes
this.ws.messages$.subscribe(messages => {
  this.alerts = messages.slice(0, 50);
});

// Eliminar
this.ws.deleteMessage(index);

// Limpiar todo
this.ws.clearAll();

// Desconectar
this.ws.disconnect();
```

---

## 🎨 Componentes

### AutenticacionComponent

```typescript
// Formulario
{ username: string, password: string, remember: boolean }

// Submit
submit() {
  this.auth.login(username, password).subscribe({
    next: () => this.router.navigate(['/dashboard']),
    error: err => this.error = this.extractError(err)
  });
}

// Timeout: 10 segundos
```

### AdminDashboardComponent

```typescript
// Formulario amenazas
{
  type: 'intrusion',
  severity: 'medium',
  sourceIp: string,  // Validación IPv4
  targetIp: string,  // Validación IPv4 opcional
  description: string // 10-500 chars
}

// Validador IP
ipValidator(control): ValidationErrors | null {
  const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  return ipv4.test(control.value) ? null : { ip: true };
}
```

---

## 🛡️ Guards

```typescript
// adminGuard protege /dashboard
if (auth.isAdmin()) return true;
router.navigate(['/autenticacion']);
return false;
```

---

## 💾 localStorage

```typescript
"token"  → JWT string
"user"   → '{"username":"admin","role":"admin"}'
"cg_ws_history" → Array de alertas (max 200)
```

---

## 🔄 Flujos

### Login
```
Usuario → submit() → AuthService.login() → POST /api/auth/login
→ Guardar token/user → Conectar WS → Redirigir /dashboard
```

### Reporte
```
Usuario → submitThreat() → Validar IP → ThreatService.reportThreat()
→ POST /api/threats con JWT → Mostrar éxito/error
```

### Alerta
```
Worker → WebSocket → WsService.onmessage() → Deduplicar
→ Guardar localStorage → Emitir messages$ → UI actualiza
```

---

## 🧪 Testing

```typescript
// Mock AuthService
const mockAuth = { login: jest.fn(), isAdmin: jest.fn() };

// Test componente
await TestBed.configureTestingModule({
  providers: [{ provide: AuthService, useValue: mockAuth }]
});

// Test HTTP
const req = httpMock.expectOne('/api/threats');
req.flush({ threatId: 'test-123' });
```

---

## ⚠️ Reglas Críticas

1. Solo admins acceden a `/dashboard`
2. Historial WS: máximo 200 mensajes
3. Deduplicación por `eventId` → `threatId` → hash
4. IPs: Regex IPv4 estricto
5. Description: 10-500 caracteres
6. Reconexión WS: cada 2 segundos

---

## 🔍 Casos de Uso

**Agregar tipo de amenaza:**
```typescript
type: "malware" | "nuevo_tipo"
```

**Cambiar capacidad historial:**
```typescript
private historyCapacity = 500;
```

**Forzar re-login:**
```typescript
this.auth.logout();
this.router.navigate(['/autenticacion']);
```

---

## 📚 Archivos Clave

- `auth.service.ts` - Autenticación
- `threat.service.ts` - Reportes
- `ws.service.ts` - WebSocket + persistencia
- `admin.guard.ts` - Protección rutas
- `TESTING_GUIDE.md` - Estrategias testing
