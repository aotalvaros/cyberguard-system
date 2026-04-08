# CyberGuard System - Explicación del Proyecto para Principiantes

## Tabla de Contenidos
1. [Contexto de la Aplicación](#contexto-de-la-aplicación)
   - [¿Qué problema resuelve?](#qué-problema-resuelve)
   - [¿Quiénes lo usan?](#quiénes-lo-usan)
   - [Arquitectura del Sistema Completo](#arquitectura-del-sistema-completo)
   - [Flujo de una Amenaza](#flujo-de-una-amenaza)
2. [¿Qué es este proyecto?](#qué-es-este-proyecto)
3. [Conceptos básicos antes de empezar](#conceptos-básicos-antes-de-empezar)
4. [Arquitectura del Frontend](#arquitectura-del-frontend)
5. [Patrones de diseño utilizados](#patrones-de-diseño-utilizados)
   - [Patrones Creacionales](#patrones-creacionales)
   - [Patrones Estructurales](#patrones-estructurales)
   - [Patrones de Comportamiento](#patrones-de-comportamiento)
6. [Buenas prácticas implementadas](#buenas-prácticas-implementadas)
7. [Contratos y APIs](#contratos-y-apis)
8. [Estructura de carpetas explicada](#estructura-de-carpetas-explicada)
9. [Glosario de términos](#glosario-de-términos)
10. [Nueva feature: Threat Statistics (Impacto + Diagramas)](#nueva-feature-threat-statistics-impacto--diagramas)

---

## Contexto de la Aplicación

### ¿Qué problema resuelve?

En el mundo actual, las empresas enfrentan **miles de amenazas cibernéticas** cada día: virus, hackers, intentos de robo de datos, etc. Los equipos de seguridad necesitan:

1. **Centralizar** todos los reportes de amenazas en un solo lugar
2. **Notificar inmediatamente** cuando ocurre algo sospechoso
3. **Mantener un historial** de todo lo que ha pasado
4. **Responder rápidamente** ante incidentes

**CyberGuard System** es la solución a estos problemas.

### ¿Quiénes lo usan?

| Usuario | ¿Qué hace? |
|---------|------------|
| 👨‍💻 **Administrador de Seguridad** | Reporta amenazas detectadas, recibe alertas en tiempo real |
| 🖥️ **Sistema Automatizado** | Procesa amenazas y distribuye notificaciones |
| 👥 **Equipo de TI** | Monitorea el dashboard para responder ante incidentes |

### Arquitectura del Sistema Completo

Este frontend es **UNA PARTE** de un sistema más grande. Aquí tienes el panorama completo:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CYBERGUARD SYSTEM - COMPLETO                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              TÚ ESTÁS AQUÍ
                                    ↓
┌─────────────┐      ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  FRONTEND   │─────▶│   BACKEND   │─────▶│  RABBITMQ    │─────▶│   WORKER    │
│  (Angular)  │      │  (Node.js)  │      │  (Mensajería)│      │ (Procesador)│
│             │◀─────│             │      │              │      │             │
│ - Login     │      │ - API REST  │      │ - Cola de    │      │ - Consume   │
│ - Dashboard │      │ - JWT Auth  │      │   mensajes   │      │   mensajes  │
│ - Reportes  │      │ - Validación│      │ - Persistente│      │ - Notifica  │
└─────────────┘      └─────────────┘      └──────────────┘      └─────────────┘
       │                    │                                            │
       │                    ▼                                            ▼
       │             ┌─────────────┐                            ┌─────────────┐
       │             │    REDIS    │                            │  WEBSOCKET  │
       │             │  (Caché)    │                            │  (Puerto    │
       │             │             │                            │    8081)    │
       │             └─────────────┘                            └─────────────┘
       │                                                                 │
       └─────────────────────────────────────────────────────────────────┘
                            ← Notificaciones en Tiempo Real ←
```

#### Explicación de cada componente:

| Componente | Puerto | Tecnología | ¿Qué hace? |
|------------|--------|------------|------------|
| **Frontend** | 4200 | Angular 21 | La pantalla que ves. Login, dashboard, formularios |
| **Backend** | 3000 | Node.js + Express | El "cerebro" que procesa peticiones y valida datos |
| **RabbitMQ** | 5672 | Message Broker | Una "cola de espera" para mensajes |
| **Worker** | - | Node.js | Lee la cola y procesa amenazas |
| **WebSocket** | 8081 | Socket | Envía notificaciones en tiempo real |
| **Redis** | 6379 | Caché | Guarda sesiones y datos temporales |

### Flujo de una Amenaza

Cuando reportas una amenaza, esto es lo que pasa "detrás de cámaras":

```
PASO 1: Usuario reporta amenaza
┌────────────────────────────────────────┐
│  👤 Admin llena formulario:            │
│  ┌────────────────────────────────┐   │
│  │ Tipo: Malware                  │   │
│  │ Severidad: Alta                │   │
│  │ IP: 192.168.1.100              │   │
│  │ Descripción: Virus detectado   │   │
│  │ [Enviar]                       │   │
│  └────────────────────────────────┘   │
└────────────────────────────────────────┘
                    │
                    ▼
PASO 2: Frontend envía al Backend
┌────────────────────────────────────────┐
│  📤 POST /api/threats                  │
│  Headers: { Authorization: "Bearer..." }│
│  Body: { type, severity, ip, desc }    │
└────────────────────────────────────────┘
                    │
                    ▼
PASO 3: Backend valida y encola
┌────────────────────────────────────────┐
│  ✅ Valida JWT (¿es admin?)            │
│  ✅ Valida datos (¿IP correcta?)       │
│  📨 Publica en RabbitMQ                │
│  📋 Responde: { threatId: "xyz123" }   │
└────────────────────────────────────────┘
                    │
                    ▼
PASO 4: Worker procesa
┌────────────────────────────────────────┐
│  🔄 Consume mensaje de la cola         │
│  🔍 Procesa y enriquece datos          │
│  📡 Envía por WebSocket a todos        │
└────────────────────────────────────────┘
                    │
                    ▼
PASO 5: Frontend recibe en tiempo real
┌────────────────────────────────────────┐
│  🔔 WebSocket recibe mensaje           │
│  💾 Guarda en localStorage             │
│  🎨 Actualiza UI automáticamente       │
│  ┌────────────────────────────────┐   │
│  │ 🚨 Nueva Alerta: Malware       │   │
│  │    Severidad: Alta             │   │
│  │    IP: 192.168.1.100           │   │
│  └────────────────────────────────┘   │
└────────────────────────────────────────┘
```

### Tipos de Amenazas que maneja

| Tipo | Icono | Descripción | Severidad típica |
|------|-------|-------------|------------------|
| **Malware** | 🦠 | Software malicioso (virus, troyanos) | Media - Alta |
| **Intrusion** | 🚪 | Acceso no autorizado al sistema | Alta |
| **Phishing** | 🎣 | Intentos de robo de credenciales por email | Baja - Media |
| **DDoS** | 💥 | Ataque de denegación de servicio | Alta - Crítica |
| **Ransomware** | 💰 | Secuestro de datos pidiendo rescate | Crítica |

### Niveles de Severidad

```
┌─────────────────────────────────────────────────────────────────┐
│                    NIVELES DE SEVERIDAD                         │
├────────────┬────────────────────────────────────────────────────┤
│   🟢 LOW   │ Amenaza menor, no requiere acción inmediata        │
├────────────┼────────────────────────────────────────────────────┤
│ 🟡 MEDIUM  │ Requiere atención pronto, pero no urgente          │
├────────────┼────────────────────────────────────────────────────┤
│  🟠 HIGH   │ Amenaza seria, requiere acción rápida              │
├────────────┼────────────────────────────────────────────────────┤
│ 🔴 CRITICAL│ ¡Emergencia! Requiere acción INMEDIATA             │
└────────────┴────────────────────────────────────────────────────┘
```

---

## ¿Qué es este proyecto?

**CyberGuard System Frontend** es la interfaz web del sistema de seguridad que permite:
- 🔐 **Iniciar sesión** con usuario y contraseña (admin / cyberguard2024)
- ⚠️ **Reportar amenazas** (malware, phishing, DDoS, ransomware, intrusiones)
- 📊 **Ver alertas en tiempo real** cuando ocurren amenazas
- 👀 **Monitorear** el sistema de seguridad desde un dashboard centralizado
- 🗑️ **Gestionar alertas** (eliminar individual o limpiar todas)

Imagínalo como el **"centro de comando"** para vigilar la seguridad de una empresa.

---

## Conceptos básicos antes de empezar

### ¿Qué es TypeScript?
TypeScript es como JavaScript (el lenguaje de las páginas web) pero con "superpoderes". La diferencia principal es que TypeScript te obliga a decir qué tipo de dato vas a usar.

```typescript
// En JavaScript normal puedes hacer esto (y puede causar errores):
let edad = 25;
edad = "veinticinco"; // ¡Problema! Cambiaste de número a texto

// En TypeScript te protege:
let edad: number = 25;
edad = "veinticinco"; // ❌ Error! TypeScript te avisa que está mal
```

### ¿Qué es Angular?
Angular es una "caja de herramientas" para construir aplicaciones web. Piensa en ello como un kit de LEGO que viene con piezas prediseñadas para armar sitios web complejos.

### ¿Qué es un Componente?
Un componente es una pieza de la interfaz. Por ejemplo:
- El formulario de login es un componente
- El panel de alertas es otro componente
- Cada botón podría ser un componente

### ¿Qué es un Servicio?
Un servicio es código que hace "trabajo de fondo". No muestra nada en pantalla, pero hace cosas como:
- Conectarse con el servidor
- Guardar datos
- Procesar información

---

## Arquitectura del Frontend

### ¿Qué arquitectura usa? **Arquitectura Hexagonal**

Imagina una cebolla con capas. Cada capa tiene su trabajo específico:

```
┌─────────────────────────────────────────────────────────┐
│                  📱 PRESENTACIÓN                         │
│  (Lo que el usuario ve y toca)                          │
│  - Pantalla de login                                    │
│  - Panel de alertas                                     │
│  - Formularios                                          │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                 🎯 APLICACIÓN                            │
│  (Las acciones que puede hacer el usuario)              │
│  - Iniciar sesión                                       │
│  - Cerrar sesión                                        │
│  - Reportar amenaza                                     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                  💎 DOMINIO                              │
│  (Las reglas del negocio)                               │
│  - ¿Qué es un usuario?                                  │
│  - ¿Qué es una amenaza?                                 │
│  - ¿Cómo se valida una amenaza?                         │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│               🔧 INFRAESTRUCTURA                         │
│  (Las conexiones con el mundo exterior)                 │
│  - Conexión con el servidor (API)                       │
│  - Guardar en el navegador (LocalStorage)               │
│  - Conexión en tiempo real (WebSocket)                  │
└─────────────────────────────────────────────────────────┘
```

### ¿Por qué usar esta arquitectura?
1. **Organización**: Cada cosa en su lugar
2. **Mantenimiento**: Si algo falla, sabes dónde buscar
3. **Pruebas**: Es fácil probar cada parte por separado
4. **Flexibilidad**: Puedes cambiar una capa sin afectar las otras

---

## Patrones de diseño utilizados

Los **patrones de diseño** son soluciones probadas a problemas comunes. Es como tener recetas de cocina que ya sabes que funcionan.

Se dividen en tres categorías:

---

### Patrones Creacionales
*"Cómo crear objetos de manera inteligente"*

#### 1. Factory Pattern (Patrón Fábrica)
**¿Qué hace?** Crea objetos sin que tú tengas que saber todos los detalles de cómo se crean.

**Analogía del mundo real**: Piensa en una panadería. Tú pides "un croissant" y la panadería sabe cómo hacerlo. No necesitas saber la receta, la temperatura del horno, o el tiempo de horneado.

**En el proyecto** (`threat-validation.factory.ts`):
```typescript
// La "fábrica" de validadores de amenazas
@Injectable({ providedIn: 'root' })
export class ThreatValidationFactory {
  // Método que "fabrica" el validador correcto según el tipo de amenaza
  createValidator(type: ThreatType): ThreatValidationStrategy {
    switch (type) {
      case ThreatType.MALWARE:
        return new MalwareValidationStrategy();  // ← Crea validador de malware
      case ThreatType.PHISHING:
        return new PhishingValidationStrategy(); // ← Crea validador de phishing
      case ThreatType.DDOS:
        return new DdosValidationStrategy();     // ← Crea validador de DDoS
      case ThreatType.RANSOMWARE:
        return new RansomwareValidationStrategy(); // ← Crea validador de ransomware
      default:
        return new DefaultValidationStrategy();  // ← Validador genérico
    }
  }
}
```

**¿Por qué es útil?**
- No necesitas saber cómo crear cada tipo de validador
- Si agregas un nuevo tipo de amenaza, solo modificas la fábrica
- El código que usa la fábrica no cambia

#### 2. Singleton Pattern (Patrón Único)
**¿Qué hace?** Garantiza que solo exista UNA instancia de algo en toda la aplicación.

**Analogía del mundo real**: Hay un solo presidente en un país. No pueden existir dos presidentes al mismo tiempo.

**En el proyecto** (servicios con `providedIn: 'root'`):
```typescript
// Esto garantiza que solo haya UN AuthService en toda la aplicación
@Injectable({ providedIn: 'root' })  // ← "providedIn: 'root'" = Singleton
export class AuthService {
  // ...
}
```

**¿Por qué es útil?**
- El token de autenticación es el mismo en toda la app
- No hay conflictos con múltiples copias de datos
- Ahorra memoria

---

### Patrones Estructurales
*"Cómo organizar y conectar objetos"*

#### 1. Facade Pattern (Patrón Fachada)
**¿Qué hace?** Proporciona una interfaz simple para algo complejo detrás.

**Analogía del mundo real**: Un control remoto de TV. Tiene botones simples (encender, subir volumen), pero internamente la TV hace cosas muy complejas. El control es la "fachada".

**En el proyecto** (`auth.service.ts`):
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Detrás hay varios casos de uso, pero la "fachada" los simplifica
  private loginUseCase = inject(LoginUseCase);
  private logoutUseCase = inject(LogoutUseCase);
  private getCurrentUserUseCase = inject(GetCurrentUserUseCase);
  private wsService = inject(WebSocketService);

  // Métodos SIMPLES que esconden la complejidad
  login(username: string, password: string) {
    // Internamente: ejecuta caso de uso + conecta websocket
    return this.loginUseCase.execute({ username, password }).pipe(
      tap(() => this.wsService.connect())
    );
  }

  logout(): void {
    // Internamente: desconecta websocket + ejecuta caso de uso
    this.wsService.disconnect();
    this.logoutUseCase.execute();
  }

  getCurrentUser(): User | null {
    return this.getCurrentUserUseCase.execute();
  }
}
```

**¿Por qué es útil?**
- Los componentes no necesitan saber de casos de uso, websockets, etc.
- Solo llaman a `authService.login()` y listo
- Si cambias la lógica interna, los componentes no se afectan

#### 2. Adapter Pattern (Patrón Adaptador)
**¿Qué hace?** Convierte la interfaz de algo para que sea compatible con lo que necesitas.

**Analogía del mundo real**: Un adaptador de enchufe universal. Tu cargador tiene un enchufe español, pero estás en USA. El adaptador hace que funcione.

**En el proyecto** (`local-storage.adapter.ts`):
```typescript
@Injectable({ providedIn: 'root' })
export class LocalStorageAdapter {
  // "Adapta" el localStorage del navegador a métodos más simples
  
  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  get(key: string): string | null {
    return localStorage.getItem(key);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
```

**¿Por qué es útil?**
- Si mañana cambias de `localStorage` a `sessionStorage` o una base de datos, solo cambias el adaptador
- El resto del código sigue funcionando igual
- Facilita las pruebas (puedes crear un adaptador "falso" para tests)

#### 3. Repository Pattern (Patrón Repositorio)
**¿Qué hace?** Separa la lógica de negocio del acceso a datos.

**Analogía del mundo real**: Un bibliotecario. Tú le pides "el libro de Harry Potter" y él lo busca. No necesitas saber si está en el estante A o B, o en qué formato.

**En el proyecto** (`auth.repository.ts` y `auth-repository.impl.ts`):

```typescript
// 1. CONTRATO - Lo que debe poder hacer cualquier repositorio de auth
//    (auth.repository.ts - en la capa de dominio)
export abstract class AuthRepository {
  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract saveToken(token: string): void;
  abstract getToken(): string | null;
  abstract saveUser(user: User): void;
  abstract getUser(): User | null;
  abstract clearAuth(): void;
  abstract isAuthenticated(): boolean;
}

// 2. IMPLEMENTACIÓN - Cómo realmente se hacen esas cosas
//    (auth-repository.impl.ts - en la capa de infraestructura)
@Injectable({ providedIn: 'root' })
export class AuthRepositoryImpl extends AuthRepository {
  private http = inject(HttpClient);      // ← Conexión con el servidor
  private storage = inject(LocalStorageAdapter); // ← Almacenamiento

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // Llama al servidor real
    return this.http.post<AuthResponse>(`${API_URL}/login`, credentials);
  }

  saveToken(token: string): void {
    this.storage.set('token', token);  // ← Guarda en localStorage
  }
  
  // ... otros métodos
}
```

**¿Por qué es útil?**
- Puedes tener una implementación "real" y otra "falsa" para tests
- Si cambias de servidor, solo modificas el repositorio
- La lógica de negocio no sabe ni le importa de dónde vienen los datos

---

### Patrones de Comportamiento
*"Cómo los objetos se comunican entre sí"*

#### 1. Observer Pattern (Patrón Observador)
**¿Qué hace?** Permite que objetos "escuchen" cambios en otros objetos y reaccionen automáticamente.

**Analogía del mundo real**: Una suscripción a un periódico. Te suscribes y cuando hay noticias nuevas, te llegan automáticamente. No tienes que ir a buscarlas.

**En el proyecto** (`websocket-repository.impl.ts`):
```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketRepositoryImpl extends WebSocketRepository {
  // BehaviorSubject = "notificador" que guarda el último valor
  private messages$ = new BehaviorSubject<AlertMessage[]>([]);

  // Los componentes se "suscriben" a esto
  getMessages$(): Observable<AlertMessage[]> {
    return this.messages$.asObservable();
  }

  // Cuando llega un mensaje nuevo, NOTIFICA a todos los suscriptores
  private addMessage(alert: AlertMessage): void {
    const current = this.messages$.value;
    const updated = [alert, ...current];
    this.messages$.next(updated);  // ← ¡Notificación automática!
  }
}
```

**En un componente** (cómo se usa):
```typescript
// El componente de alertas se "suscribe" a los mensajes
this.wsService.getMessages$().subscribe(messages => {
  // Cada vez que hay mensajes nuevos, esto se ejecuta automáticamente
  this.alertas = messages;
});
```

**¿Por qué es útil?**
- Las alertas se actualizan EN TIEMPO REAL
- No tienes que preguntar "¿hay algo nuevo?" cada segundo
- Los datos fluyen automáticamente a donde se necesitan

#### 2. Strategy Pattern (Patrón Estrategia)
**¿Qué hace?** Permite cambiar el comportamiento de algo sin cambiar su código principal.

**Analogía del mundo real**: Una app de GPS. Puedes elegir "ruta más corta", "evitar peajes", o "ruta panorámica". El GPS es el mismo, pero la ESTRATEGIA de cálculo cambia.

**En el proyecto** (`threat-validation.strategy.ts`):
```typescript
// INTERFAZ - Todas las estrategias deben tener un método "validate"
export interface ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult;
}

// ESTRATEGIA 1: Validación para Malware
export class MalwareValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];
    
    // Regla específica para malware
    if (threat.severity === 'low') {
      errors.push('Malware threats should be at least medium severity');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

// ESTRATEGIA 2: Validación para Ransomware
export class RansomwareValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];
    
    // Regla específica para ransomware
    if (threat.severity !== 'critical') {
      errors.push('Ransomware should always be critical severity');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

// ESTRATEGIA 3: Validación para DDoS
export class DdosValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];
    
    if (threat.severity !== 'critical' && threat.severity !== 'high') {
      errors.push('DDoS attacks should be high or critical severity');
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

**¿Por qué es útil?**
- Cada tipo de amenaza tiene sus propias reglas
- Fácil agregar nuevos tipos de amenaza
- El código que valida no necesita muchos `if-else`

#### 3. Use Case Pattern (Patrón de Caso de Uso)
**¿Qué hace?** Encapsula UNA acción específica del usuario en un solo lugar.

**Analogía del mundo real**: Una receta de cocina. Cada receta es para UN platillo específico con sus pasos claros.

**En el proyecto** (`login.use-case.ts`):
```typescript
@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private authRepository = inject(AuthRepository);

  // UN método que hace UNA cosa: iniciar sesión
  execute(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.authRepository.login(credentials).pipe(
      tap((response) => {
        // Paso 1: Guardar el token
        this.authRepository.saveToken(response.token);
        // Paso 2: Guardar info del usuario
        this.authRepository.saveUser(response.user);
      })
    );
  }
}
```

**¿Por qué es útil?**
- Cada acción está en un lugar específico
- Fácil de probar (un caso de uso = un test)
- La lógica de negocio no está mezclada con la interfaz

---

## Buenas prácticas implementadas

### 1. Principios SOLID

#### S - Single Responsibility (Responsabilidad Única)
*"Cada cosa hace UNA sola cosa"*

```
✅ LoginUseCase → Solo maneja login
✅ LogoutUseCase → Solo maneja logout  
✅ AlertsComponent → Solo muestra alertas
```

#### O - Open/Closed (Abierto/Cerrado)
*"Abierto para extender, cerrado para modificar"*

```
✅ Puedes agregar nuevas estrategias de validación
   sin modificar las existentes
✅ Puedes agregar nuevos repositorios
   sin cambiar los casos de uso
```

#### L - Liskov Substitution (Sustitución de Liskov)
*"Cualquier implementación funciona igual"*

```
✅ Puedes reemplazar AuthRepositoryImpl por MockAuthRepository
   y todo sigue funcionando (útil para tests)
```

#### I - Interface Segregation (Segregación de Interfaces)
*"Interfaces pequeñas y específicas"*

```
✅ AuthRepository → Solo métodos de autenticación
✅ ThreatRepository → Solo métodos de amenazas
✅ WebSocketRepository → Solo métodos de WebSocket
```

#### D - Dependency Inversion (Inversión de Dependencias)
*"Depende de abstracciones, no de implementaciones"*

```typescript
// En app.config.ts - las dependencias se inyectan
providers: [
  { provide: AuthRepository, useClass: AuthRepositoryImpl },
  { provide: ThreatRepository, useClass: ThreatRepositoryImpl },
  { provide: WebSocketRepository, useClass: WebSocketRepositoryImpl }
]
```

### 2. Separación de Capas

```
📁 core/
├── 📁 application/    → Casos de uso (qué puede hacer el usuario)
├── 📁 domain/         → Modelos y contratos (qué existe y cómo es)
└── 📁 infrastructure/ → Implementaciones reales (cómo se hace)

📁 presentation/       → Lo que el usuario ve (componentes)
```

### 3. Modelos de Dominio Bien Definidos

```typescript
// Usuario con tipos claros
export interface User {
  username: string;
  role: string;
}

// Amenaza con tipos específicos
export interface ThreatRequest {
  type: ThreatType;      // enum: MALWARE, PHISHING, etc.
  severity: ThreatSeverity; // enum: LOW, MEDIUM, HIGH, CRITICAL
  sourceIp: string;
  description: string;
}
```

### 4. Uso de Enums para Valores Fijos

```typescript
// En lugar de strings mágicos ("high", "low"), usamos enums
export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ThreatType {
  MALWARE = 'malware',
  INTRUSION = 'intrusion',
  PHISHING = 'phishing',
  DDOS = 'ddos',
  RANSOMWARE = 'ransomware'
}
```

### 5. Guards para Protección de Rutas

```typescript
// Solo admins pueden acceder al dashboard
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;  // ✅ Puede pasar
  }

  router.navigate(['/autenticacion']); // 🚫 Redirige al login
  return false;
};
```

### 6. Lazy Loading (Carga Perezosa)

```typescript
// Los componentes se cargan SOLO cuando se necesitan
{
  path: 'dashboard',
  loadComponent: () => import('../presentation/components/dashboard/dashboard.component')
    .then(m => m.DashboardComponent),
}
```

### 7. Variables de Entorno

```typescript
// environment.ts (desarrollo)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:8081'
};

// environment.prod.ts (producción)
export const environment = {
  production: true,
  apiUrl: 'https://api.cyberguard.com',
  wsUrl: 'wss://ws.cyberguard.com'
};
```

### 8. Testing con Mocks

```typescript
// En los tests, puedes usar "repositorios falsos"
const mockAuthRepository = {
  login: vi.fn().mockReturnValue(of({ token: 'fake', user: { username: 'test' } })),
  saveToken: vi.fn(),
  saveUser: vi.fn()
};
```

---

## Contratos y APIs

Esta sección explica cómo el frontend se comunica con el backend.

### 1. API de Autenticación

**Ruta:** `POST /api/auth/login`

```typescript
// Lo que el frontend ENVÍA:
{
  "username": "admin",
  "password": "cyberguard2024"
}

// Lo que el backend RESPONDE (éxito):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",  // Token JWT para autenticarse
  "user": {
    "username": "admin",
    "role": "admin"
  }
}

// Lo que el backend RESPONDE (error):
{
  "error": "Invalid credentials"
}
```

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `cyberguard2024`

### 2. API de Reporte de Amenazas

**Ruta:** `POST /api/threats`

```typescript
// Headers requeridos:
{
  "Authorization": "Bearer <tu-token-jwt>",
  "Content-Type": "application/json"
}

// Lo que el frontend ENVÍA:
{
  "type": "malware",       // Tipo de amenaza
  "severity": "high",       // Severidad
  "sourceIp": "192.168.1.100", // IP origen (obligatorio)
  "targetIp": "10.0.0.50",  // IP destino (opcional)
  "description": "Malware detectado intentando robar datos",
  "metadata": {             // Datos extra (opcional)
    "detectionMethod": "antivirus",
    "affectedFiles": 15
  }
}

// Lo que el backend RESPONDE (éxito):
{
  "threatId": "threat-1234567890",
  "status": "queued",
  "message": "Threat report received and queued for processing"
}
```

**Validaciones:**
| Campo | Regla |
|-------|-------|
| `type` | Debe ser: `malware`, `intrusion`, `phishing`, `ddos`, o `ransomware` |
| `severity` | Debe ser: `low`, `medium`, `high`, o `critical` |
| `sourceIp` | Debe ser una IP válida (ej: 192.168.1.1) |
| `description` | Entre 10 y 500 caracteres |

### 3. WebSocket (Tiempo Real)

**URL de conexión:** `ws://localhost:8081`

#### Mensajes que el CLIENTE puede enviar:

```typescript
// Limpiar TODAS las alertas
{ "type": "clear-all" }

// Eliminar UNA alerta específica
{ "type": "delete-one", "id": "threat-1234567890" }
```

#### Mensajes que el SERVIDOR envía:

```typescript
// Nueva amenaza detectada
{
  "eventId": "evt-1234567890",      // ID único del evento
  "type": "threat.detected",
  "data": {
    "threatId": "threat-1234567890",
    "type": "malware",
    "severity": "high",
    "sourceIp": "192.168.1.100",
    "description": "Malware detectado"
  },
  "receivedAt": "2024-02-15T15:30:45.123Z"
}
```

### 4. Seguridad de las APIs

| Medida | Descripción |
|--------|-------------|
| **JWT** | Token que expira en 24 horas |
| **Rate Limiting** | Máximo 100 peticiones cada 15 minutos |
| **Validación** | Todos los datos se validan con Joi |
| **CORS** | Solo acepta peticiones de orígenes autorizados |
| **Helmet** | Headers de seguridad configurados |

### 5. Variables de Entorno

```typescript
// Desarrollo (environment.ts)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',   // Backend API
  wsUrl: 'ws://localhost:8081'        // WebSocket
};

// Producción (environment.prod.ts)
export const environment = {
  production: true,
  apiUrl: 'https://api.cyberguard.com',
  wsUrl: 'wss://ws.cyberguard.com'
};
```

### 6. Persistencia Local

El frontend guarda datos en el navegador:

| Key | Qué guarda | Límite |
|-----|------------|--------|
| `token` | Token JWT | - |
| `user` | Info del usuario (JSON) | - |
| `cg_ws_history` | Historial de alertas | 200 mensajes |

---

## Estructura de carpetas explicada

```
src/
├── app/                    ← Configuración de la aplicación
│   ├── app.config.ts       ← Dónde se configuran los servicios
│   ├── app.routes.ts       ← Definición de rutas/páginas
│   └── app.ts              ← Componente principal
│
├── core/                   ← El "cerebro" de la aplicación
│   ├── application/        ← Acciones del usuario
│   │   └── use-cases/      ← LoginUseCase, LogoutUseCase, etc.
│   │
│   ├── domain/             ← Las "reglas del juego"
│   │   ├── models/         ← User, Threat, Alert, etc.
│   │   ├── ports/          ← Contratos (AuthRepository, etc.)
│   │   └── services/       ← Lógica de negocio pura
│   │
│   └── infrastructure/     ← Conexiones con el exterior
│       ├── adapters/       ← LocalStorageAdapter
│       └── services/       ← AuthRepositoryImpl, WebSocketService
│
├── presentation/           ← Lo que el usuario ve
│   ├── components/         ← Pantallas
│   │   ├── alerts/         ← Componente de alertas
│   │   ├── autenticacion/  ← Pantalla de login
│   │   ├── dashboard/      ← Panel principal
│   │   └── report-threat/  ← Formulario de amenazas
│   │
│   └── guards/             ← Protección de rutas
│       └── admin.guard.ts  ← ¿Puede entrar al dashboard?
│
├── shared/                 ← Código reutilizable
│   ├── factories/          ← Fábricas de objetos
│   ├── strategies/         ← Estrategias de validación
│   └── validators/         ← Validadores comunes
│
└── environments/           ← Configuración por ambiente
    ├── environment.ts      ← Desarrollo
    └── environment.prod.ts ← Producción
```

---

## Glosario de términos

| Término | Significado Simple |
|---------|-------------------|
| **Component** | Una pieza de la pantalla (botón, formulario, lista) |
| **Service** | Código que hace trabajo de fondo sin mostrar nada |
| **Injectable** | Algo que Angular puede "inyectar" donde se necesite |
| **Observable** | Un "flujo de datos" que puede cambiar con el tiempo |
| **BehaviorSubject** | Un Observable que recuerda el último valor |
| **Subscribe** | "Suscribirse" para recibir actualizaciones |
| **Interface** | Un "contrato" que define qué debe tener algo |
| **Abstract class** | Una clase incompleta que otras deben completar |
| **Enum** | Un conjunto de valores fijos (como LOW, MEDIUM, HIGH) |
| **Guard** | Un "guardia" que decide si puedes entrar a una página |
| **UseCase** | Una acción específica (login, logout, reportar amenaza) |
| **Repository** | Un "almacén" de datos |
| **Factory** | Una "fábrica" que crea objetos |
| **Adapter** | Un "traductor" entre sistemas diferentes |
| **Strategy** | Un algoritmo intercambiable |
| **Singleton** | Algo que solo puede existir una vez |
| **Facade** | Una "fachada" simple que esconde complejidad |
| **inject()** | Obtener un servicio ya creado por Angular |
| **tap()** | Hacer algo "de paso" sin modificar los datos |
| **pipe()** | Encadenar operaciones sobre datos |

---

## Resumen visual de patrones

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATRONES CREACIONALES                        │
│  "Cómo crear objetos"                                           │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │    Factory      │    │    Singleton    │                    │
│  │   (Fábrica)     │    │    (Único)      │                    │
│  │                 │    │                 │                    │
│  │ ThreatValidation│    │  @Injectable    │                    │
│  │    Factory      │    │ providedIn:root │                    │
│  └─────────────────┘    └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   PATRONES ESTRUCTURALES                        │
│  "Cómo organizar objetos"                                       │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │    Facade     │  │   Adapter     │  │  Repository   │       │
│  │   (Fachada)   │  │  (Adaptador)  │  │ (Repositorio) │       │
│  │               │  │               │  │               │       │
│  │  AuthService  │  │ LocalStorage  │  │   AuthRepo    │       │
│  │               │  │   Adapter     │  │   Impl        │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 PATRONES DE COMPORTAMIENTO                      │
│  "Cómo se comunican los objetos"                                │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │   Observer    │  │   Strategy    │  │   Use Case    │       │
│  │ (Observador)  │  │ (Estrategia)  │  │ (Caso de Uso) │       │
│  │               │  │               │  │               │       │
│  │ BehaviorSubj  │  │   Threat      │  │  LoginUseCase │       │
│  │  messages$    │  │  Validation   │  │  LogoutUseCase│       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Nueva feature: Threat Statistics (Impacto + Diagramas)

Para la nueva feature de estadísticas (`GET /api/statistics`) se documentó el impacto completo para diagramado:

- Impacto por componentes (Frontend/Backend)
- Patrones de diseño involucrados
- Comunicación con módulos existentes
- Secuencia end-to-end para diagrama de secuencia
- Insumos C4 (Context, Container, Component)

Documento de referencia:
- [`/docs/architecture/ARCHITECTURAL_IMPACT_ANALYTICS.md`](../../../../docs/architecture/ARCHITECTURAL_IMPACT_ANALYTICS.md)
- **Diagramas draw.io actualizados**:
  - `docs/diagrams/sequence-threat-statistics.drawio.xml` (flujo de perfil + notificación omnicanal)
  - `docs/diagrams/c4-threat-statistics.drawio.xml` (C4 más legible con separación Frontend/Backend y nuevos componentes dentro de su contenedor)

---

## Conclusión

### Resumen del Contexto

**CyberGuard System** es un sistema de ciberseguridad empresarial que permite:
- 🔐 Autenticación segura con JWT
- ⚠️ Reporte centralizado de amenazas (malware, phishing, DDoS, ransomware, intrusiones)
- 📡 Notificaciones en tiempo real vía WebSocket
- 📊 Monitoreo continuo desde un dashboard unificado

### Stack Tecnológico

```
┌────────────────────────────────────────────────────────────────┐
│                    TECNOLOGÍAS UTILIZADAS                       │
├────────────────────────────────────────────────────────────────┤
│  Frontend:    Angular 21 + TypeScript + RxJS                   │
│  Backend:     Node.js + Express + Joi                          │
│  Mensajería:  RabbitMQ                                         │
│  Cache:       Redis                                            │
│  Tiempo Real: WebSocket                                        │
│  Testing:     Vitest                                           │
└────────────────────────────────────────────────────────────────┘
```

### Valor del Proyecto

Este proyecto es un excelente ejemplo de cómo construir una aplicación frontend **profesional y escalable** usando:

1. **Contexto de Negocio Claro**: Sistema de ciberseguridad con casos de uso reales
2. **Arquitectura Hexagonal**: Separación clara entre capas (presentación, aplicación, dominio, infraestructura)
3. **Patrones de Diseño Probados**: Factory, Singleton, Facade, Adapter, Repository, Observer, Strategy
4. **Principios SOLID**: Código mantenible y extensible
5. **TypeScript**: Seguridad de tipos que previene errores
6. **Angular Moderno**: Componentes standalone, señales, inyección de dependencias
7. **Integración con Backend**: APIs REST y WebSocket bien definidas
8. **Testing**: Pruebas unitarias con mocks

### ¿Por qué esta arquitectura?

Aunque puede parecer compleja al principio, esta estructura permite que:
- ✅ Equipos grandes trabajen sin conflictos
- ✅ El código sea fácil de entender y mantener
- ✅ Las pruebas sean simples de escribir
- ✅ Los cambios en una capa no afecten a otras
- ✅ Se pueda escalar el proyecto sin reescribir todo

---

*Documento generado para ayudar a entender el contexto, arquitectura y patrones del proyecto CyberGuard System*
