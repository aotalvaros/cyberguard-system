# 🔒 Security Guidelines - CyberGuard System

## Checklist de Seguridad Obligatorio

Todo código debe pasar esta validación antes de merge.

---

## 1. Secrets Management

### ❌ NUNCA
```javascript
const dbUrl = 'postgresql://admin:password123@localhost:5432/db';
const apiKey = 'sk-1234567890abcdef';
```

### ✅ SIEMPRE
```javascript
// ⚠️ HUMAN CHECK:
// Validar que todas las credenciales vengan de variables de entorno
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;

if (!dbUrl || !apiKey) {
  throw new Error('Missing required environment variables');
}
```

**Validación QA**:
- [ ] No hay credenciales hardcodeadas
- [ ] Archivo `.env` en `.gitignore`
- [ ] Variables validadas al inicio de la app

---

## 2. Input Validation

### ❌ NUNCA
```javascript
app.post('/threats', (req, res) => {
  const threat = req.body;
  db.save(threat); // Sin validación
});
```

### ✅ SIEMPRE
```javascript
import Joi from 'joi';

const schema = Joi.object({
  type: Joi.string().valid('malware', 'intrusion').required(),
  sourceIp: Joi.string().ip().required(),
  description: Joi.string().max(500).required()
});

app.post('/threats', (req, res) => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }
  // Procesar value validado
});
```

**Validación QA**:
- [ ] Todos los endpoints validan inputs
- [ ] Límites de tamaño definidos
- [ ] Tipos de datos verificados

---

## 3. SQL Injection Prevention

### ❌ NUNCA
```javascript
const query = `SELECT * FROM threats WHERE id = '${req.params.id}'`;
db.query(query);
```

### ✅ SIEMPRE
```javascript
// Usar ORM (Prisma) o prepared statements
const threat = await prisma.threat.findUnique({
  where: { id: req.params.id }
});
```

**Validación QA**:
- [ ] No hay concatenación de strings en queries
- [ ] Usar ORM o prepared statements

---

## 4. XSS Prevention

### ❌ NUNCA
```javascript
res.send(`<h1>Welcome ${req.query.name}</h1>`);
```

### ✅ SIEMPRE
```javascript
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(req.query.name);
res.json({ message: `Welcome ${sanitized}` });
```

**Validación QA**:
- [ ] Inputs sanitizados antes de renderizar
- [ ] Headers de seguridad configurados (CSP)

---

## 5. Authentication & Authorization

### JWT Configuration
```javascript
// ⚠️ HUMAN CHECK:
// La IA sugirió tokens sin expiración.
// Implementamos expiración corta + refresh tokens.
const accessToken = jwt.sign(payload, secret, { 
  expiresIn: '15m',
  algorithm: 'HS256'
});

const refreshToken = jwt.sign(payload, refreshSecret, {
  expiresIn: '7d'
});
```

**Validación QA**:
- [ ] Tokens con expiración
- [ ] Refresh token implementado
- [ ] Secret en variable de entorno
- [ ] Middleware de auth en rutas protegidas

---

## 6. Error Handling

### ❌ NUNCA
```javascript
try {
  await processData();
} catch (error) {
  res.status(500).json({ error: error.stack });
}
```

### ✅ SIEMPRE
```javascript
try {
  await processData();
} catch (error) {
  logger.error('Processing failed', { error: error.message });
  res.status(500).json({ error: 'Internal server error' });
}
```

**Validación QA**:
- [ ] No se exponen stack traces
- [ ] Errores logueados internamente
- [ ] Mensajes genéricos al cliente

---

## 7. Rate Limiting & Brute Force Protection

### Express Rate Limiter
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requests
  message: 'Too many requests',
  skip: (req) => req.user?.isAdmin === true
});

app.use('/api/', limiter);
```

### Brute Force Protection (Ver `backend/src/middlewares/bruteforce.middleware.ts`)
```javascript
// ⚠️ HUMAN CHECK:
// Middleware específico para ataques de fuerza bruta en login
import { bruteForceLimiter } from './middlewares/bruteforce.middleware';

app.post('/auth/login', bruteForceLimiter, authController.login);
```

**Validación QA**:
- [ ] Rate limiting en endpoints públicos
- [ ] Límites apropiados por endpoint
- [ ] Middleware de fuerza bruta aplicado en `/auth/login`
- [ ] Exponential backoff implementado

---

## 8. CORS Configuration

```javascript
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

**Validación QA**:
- [ ] CORS configurado (no usar `*`)
- [ ] Origins permitidos en variable de entorno

---

## 9. Logging Seguro

### ❌ NUNCA
```javascript
logger.info('User login', { email, password });
```

### ✅ SIEMPRE
```javascript
logger.info('User login', { 
  email: maskEmail(email),
  userId: user.id 
});
```

**Validación QA**:
- [ ] No se loguean passwords
- [ ] Datos sensibles enmascarados
- [ ] Logs estructurados (JSON)

---

## 10. Password Hashing

### ❌ NUNCA
```javascript
const user = {
  email: req.body.email,
  password: req.body.password // Sin hashear
};
```

### ✅ SIEMPRE
```javascript
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(req.body.password, 10);
const user = {
  email: req.body.email,
  password: hashedPassword
};

// Al autenticar:
const isPasswordValid = await bcrypt.compare(inputPassword, user.password);
```

**Validación QA**:
- [ ] Contraseñas hasheadas con bcrypt (rounds: 10+)
- [ ] Nunca almacenar contraseñas en texto plano
- [ ] Comparación usando `bcrypt.compare()`

---

## 11. RabbitMQ Security (Event-Driven)

### Configuración Segura (Ver `backend/src/config/rabbitmq.ts`)
```javascript
// ⚠️ HUMAN CHECK:
// Credenciales deben venir de variables de entorno
const connection = await amqp.connect({
  hostname: process.env.RABBITMQ_HOST,
  port: parseInt(process.env.RABBITMQ_PORT),
  username: process.env.RABBITMQ_USER,
  password: process.env.RABBITMQ_PASSWORD,
  vhost: process.env.RABBITMQ_VHOST || '/'
});
```

### Publicación de Mensajes Seguros (Ver `backend/src/services/threat.service.ts`)
```javascript
const message = {
  threatId: threat.id,
  severity: threat.severity,
  timestamp: new Date().toISOString()
};

// Validar antes de enviar
if (!message.threatId || !message.severity) {
  throw new Error('Invalid threat message payload');
}

await channel.publish('threats', '', JSON.stringify(message), {
  persistent: true, // Sobrevive reinicio de RabbitMQ
  contentType: 'application/json'
});
```

**Validación QA**:
- [ ] Credenciales RabbitMQ en variables de entorno
- [ ] Mensajes persistentes en exchanges críticos
- [ ] Validación de payloads antes de publicar
- [ ] Dead Letter Queues implementadas para fallos

---

## 12. Audit Logging

### ✅ Eventos a Registrar (Ver `backend/src/config/logger.ts`)
```javascript
import logger from '../config/logger';

// Acciones críticas de seguridad
logger.info('Auth event', {
  action: 'LOGIN_ATTEMPT',
  userId: user.id,
  email: maskEmail(user.email),
  ip: req.ip,
  success: true,
  timestamp: new Date().toISOString()
});

logger.warn('Security event', {
  action: 'BRUTE_FORCE_DETECTED',
  ip: req.ip,
  attempts: failedAttempts,
  timestamp: new Date().toISOString()
});
```

**Eventos Obligatorios:**
- [ ] Intentos de login (exitosos y fallidos)
- [ ] Detección de fuerza bruta
- [ ] Creación/modificación de amenazas
- [ ] Errores de validación
- [ ] Cambios en permisos
- [ ] Acceso a datos sensibles

**Validación QA**:
- [ ] Logs estructurados en JSON
- [ ] Timestamps en UTC
- [ ] Sin datos sensibles (passwords, tokens)
- [ ] Logs separados por nivel (INFO, WARN, ERROR)

---

## 13. Dependencies & Vulnerability Scanning

```bash
npm audit
npm audit fix
npm install npm-check-updates -g
ncu --upgrade
```

**Validación QA**:
- [ ] Sin vulnerabilidades críticas/altas
- [ ] Dependencias actualizadas
- [ ] Usar `package-lock.json`
- [ ] Revisar changelogs antes de actualizar

---

## Checklist Pre-Merge

**OBLIGATORIO antes de merge a develop:**

**Secrets & Credenciales:**
- [ ] Secrets en variables de entorno
- [ ] `.env.example` documentado
- [ ] No hay credenciales en histórico de git

**Validación de Inputs:**
- [ ] Inputs validados con Joi/Zod
- [ ] Límites de tamaño definidos
- [ ] Tipos de datos verificados
- [ ] XSS prevenido (sanitización)

**Seguridad de Datos:**
- [ ] Sin SQL injection (usar ORM/Prisma)
- [ ] Contraseñas hasheadas con bcrypt
- [ ] JWT con expiración (15-30 min)
- [ ] Tokens refresh implementados

**Manejo de Errores:**
- [ ] Errores no exponen detalles internos
- [ ] Stack traces no se loguean al cliente
- [ ] Mensajes genéricos al usuario

**Rate Limiting & Protección:**
- [ ] Rate limiting configurado
- [ ] Protección de fuerza bruta en login
- [ ] CORS restrictivo (no usar `*`)

**Logging & Auditoría:**
- [ ] Logs sin datos sensibles
- [ ] Eventos críticos registrados
- [ ] Logs estructurados (JSON)

**RabbitMQ (si aplica):**
- [ ] Credenciales en variables de entorno
- [ ] Mensajes persistentes
- [ ] Dead Letter Queues configuradas

**Dependencias:**
- [ ] `npm audit` sin issues críticos
- [ ] Dependencies actualizadas
- [ ] `package-lock.json` comprometido

**Comentarios Centinela:**
- [ ] Mínimo 5 comentarios `// ⚠️ HUMAN CHECK:` por servicio
- [ ] Justificación de decisiones de seguridad

---

## Archivos Clave del Proyecto

- 🔐 `backend/src/middlewares/auth.middleware.ts` - Validación JWT
- 🚫 `backend/src/middlewares/bruteforce.middleware.ts` - Protección de fuerza bruta
- 🛡️ `backend/src/controllers/auth.controller.ts` - Lógica de autenticación
- 🐰 `backend/src/config/rabbitmq.ts` - Conexión segura a RabbitMQ
- 📝 `backend/src/config/logger.ts` - Logging estructurado
- 🧪 `backend/src/__tests__/auth.middleware.test.ts` - Tests de seguridad
- 📋 `docs/SECURITY_GUIDELINES.md` - Este documento
- 🤖 `AI_WORKFLOW.md` - Marco de desarrollo con IA

---

**Última actualización**: 10 de Febrero de 2026  
**Responsable**: Equipo CyberGuard  
**Próxima revisión**: Marzo 2026
