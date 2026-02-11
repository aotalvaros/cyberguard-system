# QA Evidence - CyberGuard System

## 1. Alcance y version
- Fecha: 11 de febrero de 2026
- Rama/Commit: develop
- Entorno: local
- Responsable QA: Jhonatan Aparicio

---

## 2. Criterios de aceptacion (Backend + Frontend)

### 2.1 Login
- [ ] POST /api/auth/login devuelve 200 con credenciales validas
- [ ] POST /api/auth/login devuelve 400 con payload invalido
- [ ] POST /api/auth/login devuelve 401 con credenciales incorrectas

**Evidencia**
- SIMULATED: pruebas manuales con curl
- SIMULATED: request 200
```
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"cyberguard2024"}'
```
- SIMULATED: response 200
```json
{
  "token": "<JWT>",
  "user": {"username": "admin", "role": "admin"}
}
```
- SIMULATED: request 400
```
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ad","password":"123"}'
```
- SIMULATED: response 400
```json
{"error":"\"username\" length must be at least 3 characters long"}
```
- SIMULATED: request 401
```
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong-pass"}'
```
- SIMULATED: response 401
```json
{"error":"Invalid password"}
```
- Adjuntos:

  **- Login (UI)**
    ![Evidencia login](images/login.png)

### 2.2 Threats (Manual)
- [ ] POST /api/threats con token valido devuelve 202
- [ ] POST /api/threats sin token devuelve 401
- [ ] Validaciones Joi: type, severity, sourceIp, description

**Evidencia**
- SIMULATED: request 202
```
curl -X POST http://localhost:3000/api/threats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"type":"malware","severity":"high","sourceIp":"192.168.1.10","description":"Test threat payload"}'
```
- SIMULATED: response 202
```json
{
  "message": "Threat reported successfully",
  "threatId": "<UUID>",
  "status": "processing"
}
```
- SIMULATED: request 401
```
curl -X POST http://localhost:3000/api/threats \
  -H "Content-Type: application/json" \
  -d '{"type":"malware","severity":"high","sourceIp":"192.168.1.10","description":"Test threat payload"}'
```
- SIMULATED: response 401
```json
{"error":"Unauthorized"}
```
- SIMULATED: request 400 (validacion Joi)
```
curl -X POST http://localhost:3000/api/threats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"type":"unknown","severity":"high","sourceIp":"not-an-ip","description":"short"}'
```
- SIMULATED: response 400
```json
{"error":"\"type\" must be one of [malware, intrusion, phishing, ddos, ransomware]"}
```
- Adjuntos:

  **- Creacion manual de alerta**
    ![Evidencia threat](images/manual%20_incident_created.png)

### 2.3 WebSocket (Worker)
- [ ] Recibe mensajes desde RabbitMQ
- [ ] Reenvia al dashboard por WebSocket
- [ ] Soporta `clear-all` y `delete-one`

**Evidencia**
- SIMULATED: evento de alerta recibido por WS
```json
{
  "type": "threat",
  "payload": {
    "id": "<UUID>",
    "severity": "high",
    "sourceIp": "192.168.1.10",
    "description": "Threat detected"
  }
}
```
- SIMULATED: evento clear-all
```json
{"type":"clear-all"}
```
- SIMULATED: evento delete-one
```json
{"type":"delete-one","payload":{"id":"<UUID>"}}
```
- Adjuntos:

  **- Dashboard con alerta**
    ![Evidencia dashboard](images/dashboard.png)

### 2.4 Frontend - Autenticacion (UI)
- [ ] Formulario de login valida campos requeridos
- [ ] Login exitoso redirige a dashboard
- [ ] Error de credenciales muestra mensaje amigable

**Evidencia**
- SIMULATED: flujo UI en Angular
- SIMULATED: validacion requerida (campos vacios)
```json
{"uiMessage":"Please fill in all required fields"}
```

- SIMULATED: credenciales invalidas
```json
{"uiMessage":"Invalid credentials"}
```
- Adjuntos: 

    **- Login**
        ![Evidencia login](images/login.png)

    **- Validacion campos vacios**
        ![Evidencia login](images/required_fields.png)

    **- Validacion de crednciales**
        ![Evidencia login](images/invalid_credentials.png)

### 2.5 Frontend - Dashboard (UI)
- [ ] Lista de alertas renderiza nuevas entradas en tiempo real
- [ ] Boton "Limpiar todo" elimina las alertas
- [ ] Boton "Eliminar" borra una alerta especifica

**Evidencia**
- SIMULATED: alerta recibida via WebSocket
```json
{"uiEvent":"alert-received","count":1}
```
- SIMULATED: limpiar todo
```json
{"uiEvent":"clear-all","count":0}
```
- SIMULATED: eliminar una alerta
```json
{"uiEvent":"delete-one","count":0}
```
- Adjuntos:

  **- Crear alerta**
    ![Evidencia crear alerta](images/create_alert.png)

  **- Eliminar todas**
    ![Evidencia limpiar todo](images/delete_all.png)

---

## 3. Checklist de seguridad

Basado en [docs/SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md)

- [ ] Secrets en variables de entorno
- [ ] Inputs validados (Joi)
- [ ] JWT con expiracion
- [ ] Rate limiting activo
- [ ] CORS restrictivo (no `*`)
- [ ] Logs sin datos sensibles
- [ ] No stack traces al cliente
- [ ] RabbitMQ credenciales en env
- [ ] DLQ configurada
- [ ] `npm audit` sin high/critical

**Evidencia**
- SIMULATED: checklist completado y salida de comandos

---

## 4. Pruebas de estres

### 4.1 API Login
Comando:
```
npx autocannon -c 50 -d 30 -p 10 http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -b '{"username":"admin","password":"cyberguard2024"}'
```

**Resultado**
- SIMULATED: RPS: 220
- SIMULATED: Latencia p95: 180ms
- SIMULATED: Errores: 0.2%

### 4.2 API Threats (POST)
Comando:
```
npx autocannon -c 30 -d 30 -p 5 http://localhost:3000/api/threats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -b '{"type":"malware","severity":"high","sourceIp":"192.168.1.10","description":"Load test"}'
```

**Resultado**
- SIMULATED: RPS: 140
- SIMULATED: Latencia p95: 240ms
- SIMULATED: Errores: 0.5%

---

## 5. Bugs simulados y soluciones

1) Exposicion de stack trace
- Hallazgo: Error 500 retornaba `error.stack` al cliente.
- Solucion: Respuesta generica y log seguro.

2) CORS permisivo
- Hallazgo: `origin: '*'` configurado.
- Solucion: `ALLOWED_ORIGINS` en env y lista controlada.

3) JWT sin expiracion
- Hallazgo: token sin `expiresIn`.
- Solucion: expiracion corta + refresh token.

---

## 6. Conclusiones

- Estado: SIMULATED 
- Hallazgos criticos: 0
- Recomendaciones: Ejecutar pruebas reales y adjuntar evidencias.
