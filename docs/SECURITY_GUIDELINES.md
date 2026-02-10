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

## 7. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requests
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

**Validación QA**:
- [ ] Rate limiting en endpoints públicos
- [ ] Límites apropiados por endpoint

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

## 10. Dependencies

```bash
npm audit
npm audit fix
```

**Validación QA**:
- [ ] Sin vulnerabilidades críticas/altas
- [ ] Dependencias actualizadas
- [ ] Usar `package-lock.json`

---

## Checklist Pre-Merge

- [ ] Secrets en variables de entorno
- [ ] Inputs validados con Joi/Zod
- [ ] Sin SQL injection (usar ORM)
- [ ] XSS prevenido (sanitización)
- [ ] JWT con expiración
- [ ] Errores no exponen detalles
- [ ] Rate limiting configurado
- [ ] CORS restrictivo
- [ ] Logs sin datos sensibles
- [ ] `npm audit` sin issues críticos
- [ ] Mínimo 5 comentarios `// ⚠️ HUMAN CHECK:`

---

**Última actualización**: [Fecha]
