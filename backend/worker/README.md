# Worker - CyberGuard System

Este worker consume eventos desde RabbitMQ, guarda un historial corto en Redis y reenvia actualizaciones por WebSocket a los clientes.

Caracteristicas:
- Consume el exchange `cyberguard.events` (topic)
- Emite mensajes a clientes WebSocket
- Persiste historial reciente en Redis para replay al reconectar
- Soporta comandos `clear-all` y `delete-one` via WebSocket
- Logica de reconexion a RabbitMQ

Stack: Node.js + TypeScript + RabbitMQ (amqplib) + Redis + ws

## Entorno

Crea `.env` en `backend/worker`:

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_URL=redis://localhost:6379
WORKER_WS_PORT=8081
WORKER_EXCHANGE=cyberguard.events
WORKER_TOPIC=#
```

## Ejecutar

```bash
cd backend/worker
npm install
npm run start
```

Servidor WebSocket:
```
ws://localhost:8081
```

## Comandos WebSocket

Los clientes pueden solicitar limpieza del historial compartido:

- **Clear all**
	```json
	{ "type": "clear-all" }
	```
	Limpia el historial en Redis y emite `{ "type": "clear-all" }` a todos los clientes.

- **Delete one**
	```json
	{ "type": "delete-one", "id": "<messageId>" }
	```
	Elimina un item especifico en Redis y emite `{ "type": "delete-one", "id": "<messageId>" }`.
