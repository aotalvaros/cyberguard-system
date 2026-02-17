# CyberGuard System - Technology Stack

## Programming Languages

### Backend
- **TypeScript 5.3.3**: Strongly-typed JavaScript for Node.js services
- **Node.js 20+**: Runtime environment for backend services

### Frontend
- **TypeScript 5.9.2**: Type-safe Angular development
- **HTML5/CSS3**: Markup and styling

## Backend Stack

### Producer API (Port 3000)

**Framework & Core**
- **Express.js 4.18.2**: Web application framework
- **ts-node-dev 2.0.0**: Development server with hot reload

**Security**
- **jsonwebtoken 9.0.2**: JWT authentication
- **helmet 7.1.0**: Security headers middleware
- **cors 2.8.5**: Cross-Origin Resource Sharing
- **express-rate-limit 7.1.5**: Rate limiting/brute-force protection

**Validation & Data**
- **Joi 17.11.0**: Schema validation for request payloads
- **uuid 9.0.1**: Unique identifier generation

**Infrastructure**
- **amqplib 0.10.3**: RabbitMQ client library
- **winston 3.11.0**: Structured logging
- **dotenv 16.3.1**: Environment variable management

**Testing**
- **Jest 30.2.0**: Testing framework
- **ts-jest 29.4.6**: TypeScript preprocessor for Jest
- **supertest 7.2.2**: HTTP assertion library
- **@types/jest 30.0.0**: TypeScript definitions

### Worker (Port 8081)

**Core Dependencies**
- **amqplib 0.10.3**: RabbitMQ message consumer
- **ws**: WebSocket server library
- **redis**: Redis client for data persistence
- **winston**: Logging framework
- **dotenv**: Configuration management

**TypeScript**
- **typescript 5.3.3**: Compiler
- **@types/node 20.10.5**: Node.js type definitions
- **@types/amqplib 0.10.4**: RabbitMQ type definitions

## Frontend Stack

### New Frontend (Angular 21)
- **@angular/core 21.1.0**: Framework core
- **@angular/common 21.1.0**: Common utilities
- **@angular/forms 21.1.0**: Reactive forms
- **@angular/router 21.1.0**: Client-side routing
- **@angular/platform-browser 21.1.0**: Browser platform
- **rxjs 7.8.0**: Reactive programming library

**Build & Development**
- **@angular/cli 21.1.3**: Command-line interface
- **@angular/build 21.1.3**: Build system
- **vitest 4.0.8**: Testing framework
- **jsdom 27.1.0**: DOM implementation for testing

### Old Frontend (Legacy)
- **Angular 17+**: Previous framework version
- **Angular Material**: UI component library
- **Jest**: Testing framework (legacy)

## Infrastructure

### Message Broker
- **RabbitMQ 3.12+**: AMQP message broker
  - Management UI on port 15672
  - AMQP protocol on port 5672
  - Direct exchange pattern
  - Dead Letter Queue support

### Cache & Storage
- **Redis 7-alpine**: In-memory data store
  - Port 6379
  - Used for alert persistence
  - Session storage
  - Message deduplication

### Containerization
- **Docker**: Container runtime
- **Docker Compose**: Multi-container orchestration
- **Dockerfile**: Multi-stage builds for each service

## Build Systems

### Backend Producer
```json
{
  "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "jest --watchAll",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

**TypeScript Configuration**:
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Output directory: `dist/`

### Backend Worker
```json
{
  "start": "ts-node src/index.ts",
  "build": "tsc",
  "dev": "ts-node-dev --respawn src/index.ts"
}
```

### Frontend (New)
```json
{
  "start": "ng serve",
  "build": "ng build",
  "watch": "ng build --watch --configuration development",
  "test": "ng test"
}
```

**Angular Configuration**:
- Standalone components enabled
- Vitest for unit testing
- Development server on port 4200

### Root Workspace
```json
{
  "docker:up": "docker-compose up -d",
  "docker:down": "docker-compose down",
  "docker:logs": "docker-compose logs -f"
}
```

## Development Commands

### Full System (Docker Compose)
```bash
# Start all services
docker-compose up --build

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Backend Producer (Local Development)
```bash
cd backend/producer

# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Backend Worker (Local Development)
```bash
cd backend/worker

# Install dependencies
npm install

# Start worker
npm start

# Development mode
npm run dev

# Build TypeScript
npm run build
```

### Frontend (Local Development)
```bash
cd frontend/cyberguard-system

# Install dependencies
npm install

# Development server (port 4200)
npm start

# Build for production
npm run build

# Run tests
npm test

# Watch mode for tests
npm run watch
```

### Infrastructure Services (Standalone)
```bash
# RabbitMQ
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management

# Redis
docker run -d --name cyberguard-redis \
  -p 6379:6379 \
  redis:7-alpine
```

## Environment Configuration

### Backend Producer (.env)
```bash
PORT=3000
NODE_ENV=development
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1h
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:4200
ADMIN_USERNAME=admin
ADMIN_PASSWORD=cyberguard2024
```

### Backend Worker (.env)
```bash
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_URL=redis://localhost:6379
WS_PORT=8081
NODE_ENV=development
```

### Frontend (environment.ts)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:8081'
};
```

## Testing Frameworks

### Backend Testing (Jest)
- **Configuration**: `jest.config.js`
- **Preset**: ts-jest
- **Environment**: node
- **Coverage**: Enabled with thresholds
- **Test Pattern**: `**/*.test.ts`

### Frontend Testing (Vitest)
- **Configuration**: `vitest.config.ts`
- **Environment**: jsdom
- **Test Pattern**: `**/*.spec.ts`
- **Features**: Fast unit testing, HMR support

## Code Quality Tools

### TypeScript
- Strict type checking enabled
- No implicit any
- Strict null checks
- ES2020 target

### Linting & Formatting
- **Prettier**: Code formatting (frontend)
  - Print width: 100
  - Single quotes
  - Angular HTML parser

## Logging

### Winston Configuration
```typescript
{
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
}
```

## API Documentation

### REST Endpoints (Producer)
- `POST /api/auth/login`: User authentication
- `POST /api/threats`: Submit threat alert (JWT required)
- `GET /health`: Health check endpoint

### WebSocket Events (Worker)
- Connection: `ws://localhost:8081`
- Event: `threat_alert`: Real-time threat broadcast
- Payload: JSON threat object

## Version Requirements

### Minimum Versions
- Node.js: 20.x or higher
- npm: 10.x or higher
- Docker: 20.x or higher
- Docker Compose: 2.x or higher

### Browser Support (Frontend)
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

## Package Managers
- **npm 10.9.4**: Primary package manager (frontend)
- **npm**: Backend services
- **Docker**: Container management
