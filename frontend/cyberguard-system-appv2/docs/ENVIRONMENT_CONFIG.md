# Configuración de Entorno

## Backend Services

- **Backend API**: http://localhost:3000
- **WebSocket Worker**: ws://localhost:8081
- **RabbitMQ**: 5672 (AMQP), 15672 (Management)
- **Redis**: 6379

## Rutas API

### Auth
- `POST /api/auth/login` - Login

### Threats
- `POST /api/threats` - Reportar amenaza (requiere JWT)

### Health
- `GET /health` - Health check

## Archivos de Configuración

- `src/environments/environment.ts` - Desarrollo
- `src/environments/environment.prod.ts` - Producción
- `.env` - Variables locales (no commitear)

## Uso en Servicios

```typescript
import { environment } from '../environments/environment';

const apiUrl = environment.apiUrl; // http://localhost:3000
const wsUrl = environment.wsUrl;   // ws://localhost:8081
```
