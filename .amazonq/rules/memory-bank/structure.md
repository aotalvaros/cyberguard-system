# CyberGuard System - Project Structure

## Directory Organization

```
cyberguard-system/                    # Monorepo root
├── .amazonq/                         # Amazon Q AI configuration
│   └── rules/                        # Project rules and memory bank
│       ├── memory-bank/              # AI context documentation
│       └── ConsideraciosParaProyecto.md  # Project guidelines
│
├── backend/                          # Backend services
│   ├── producer/                     # API Producer (Port 3000)
│   │   ├── src/
│   │   │   ├── __tests__/           # Jest unit tests
│   │   │   ├── config/              # Configuration modules
│   │   │   │   ├── env.ts           # Environment variables
│   │   │   │   ├── logger.ts        # Winston logger setup
│   │   │   │   └── rabbitmq.ts      # RabbitMQ connection
│   │   │   ├── controllers/         # HTTP request handlers
│   │   │   │   ├── auth.controller.ts    # Authentication endpoints
│   │   │   │   └── threat.controller.ts  # Threat submission endpoints
│   │   │   ├── middlewares/         # Express middlewares
│   │   │   │   ├── auth.middleware.ts       # JWT validation
│   │   │   │   ├── bruteforce.middleware.ts # Rate limiting
│   │   │   │   └── error.middleware.ts      # Error handling
│   │   │   ├── services/            # Business logic layer
│   │   │   │   ├── threat.service.ts    # Threat processing
│   │   │   │   └── threat.store.ts      # Redis persistence
│   │   │   ├── types/               # TypeScript type definitions
│   │   │   │   └── index.ts
│   │   │   └── server.ts            # Express app entry point
│   │   ├── Dockerfile               # Container image definition
│   │   ├── package.json             # Dependencies and scripts
│   │   ├── tsconfig.json            # TypeScript configuration
│   │   └── jest.config.js           # Jest test configuration
│   │
│   └── worker/                       # Message Consumer (Port 8081)
│       ├── src/
│       │   ├── config.ts            # Environment configuration
│       │   ├── handler.ts           # Message processing logic
│       │   ├── index.ts             # Worker entry point
│       │   ├── logger.ts            # Winston logger
│       │   ├── rabbitmq.ts          # Queue consumer setup
│       │   ├── redis.ts             # Redis client
│       │   └── websocket.ts         # WebSocket server
│       ├── Dockerfile               # Container image
│       ├── package.json             # Dependencies
│       └── tsconfig.json            # TypeScript config
│
├── frontend/                         # Angular application (NEW)
│   └── cyberguard-system/
│       ├── src/
│       │   ├── app/                 # Application root
│       │   │   ├── app.config.ts    # App configuration
│       │   │   ├── app.routes.ts    # Routing setup
│       │   │   ├── app.ts           # Root component
│       │   │   └── app.spec.ts      # Component tests
│       │   ├── index.html           # HTML entry point
│       │   ├── main.ts              # Bootstrap file
│       │   └── styles.css           # Global styles
│       ├── angular.json             # Angular CLI config
│       ├── package.json             # Dependencies
│       └── tsconfig.json            # TypeScript config
│
├── old_frontend/                     # Legacy Angular implementation
│   └── cyberguard-system/
│       ├── src/
│       │   ├── app/
│       │   │   ├── components/      # UI components
│       │   │   ├── guards/          # Route guards
│       │   │   ├── services/        # Angular services
│       │   │   └── validators/      # Form validators
│       │   └── environments/        # Environment configs
│       ├── Dockerfile               # Container image
│       ├── nginx.conf               # Production web server
│       └── vitest.config.ts         # Vitest test config
│
├── docs/                             # Project documentation
│   ├── images/                      # Screenshots and diagrams
│   ├── HEXAGONAL_FRONTEND.md       # Frontend architecture guide
│   ├── PLANNED_ATTACK.md           # Security testing scenarios
│   ├── QA_EVIDENCE.md              # Quality assurance reports
│   ├── SECURITY_GUIDELINES.md      # Security best practices
│   └── TOOLS_GUIDE.md              # Development tools guide
│
├── docker-compose.yml               # Multi-container orchestration
├── .env.example                     # Environment template
├── AI_WORKFLOW.md                   # AI-assisted development guide
├── DEBT_REPORT_FRONTEND.md         # Technical debt analysis
├── PROJECT_CONTEXT.md              # Project overview
├── README.md                        # Main documentation
└── package.json                     # Root workspace scripts
```

## Core Components

### 1. Backend Producer (API Gateway)
**Location**: `backend/producer/`  
**Purpose**: HTTP API that receives threat alerts and publishes to RabbitMQ  
**Key Responsibilities**:
- Authenticate users via JWT
- Validate threat payloads with Joi schemas
- Publish messages to RabbitMQ queue
- Provide health check endpoints
- Rate limiting and brute-force protection

**Architecture Pattern**: Hexagonal (Ports & Adapters)
- **Controllers**: HTTP adapters (Express routes)
- **Services**: Business logic (threat processing)
- **Config**: Infrastructure adapters (RabbitMQ, Redis, Logger)

### 2. Backend Worker (Message Consumer)
**Location**: `backend/worker/`  
**Purpose**: Consumes threat messages from RabbitMQ and broadcasts via WebSocket  
**Key Responsibilities**:
- Connect to RabbitMQ and consume messages
- Process threat alerts asynchronously
- Store alerts in Redis for persistence
- Broadcast to WebSocket clients in real-time
- Handle message acknowledgment and retries

**Architecture Pattern**: Event-Driven Consumer
- **Handler**: Message processing logic
- **RabbitMQ**: Queue consumer
- **WebSocket**: Real-time broadcast server
- **Redis**: Persistent storage adapter

### 3. Frontend (Angular SPA)
**Location**: `frontend/cyberguard-system/` (new) and `old_frontend/cyberguard-system/` (legacy)  
**Purpose**: Admin dashboard for monitoring and submitting threats  
**Key Responsibilities**:
- User authentication interface
- Threat submission form with validation
- Real-time alert display via WebSocket
- Alert history management
- Responsive UI with Angular Material (old version)

**Architecture Pattern**: Component-based (Angular Standalone Components in new version)

### 4. Message Broker (RabbitMQ)
**Deployment**: Docker container via docker-compose  
**Purpose**: Asynchronous message queue between producer and worker  
**Configuration**:
- Queue: `threats_queue`
- Exchange: Direct exchange
- Management UI: Port 15672

### 5. Cache/Storage (Redis)
**Deployment**: Docker container via docker-compose  
**Purpose**: Persistent storage for threat alerts and session data  
**Usage**:
- Alert history storage
- Message deduplication
- Session management

## Architectural Patterns

### Event-Driven Architecture (EDA)
```
[Frontend] --HTTP--> [Producer API] --AMQP--> [RabbitMQ] --AMQP--> [Worker] --WS--> [Frontend]
                          |                                            |
                          +-------- Redis (Shared State) -------------+
```

**Flow**:
1. Frontend submits threat via REST API
2. Producer validates and publishes to RabbitMQ
3. Worker consumes message from queue
4. Worker stores in Redis and broadcasts via WebSocket
5. Frontend receives real-time notification

### Hexagonal Architecture (Backend Producer)
```
┌─────────────────────────────────────────┐
│         Application Core                │
│  ┌─────────────────────────────────┐   │
│  │   Business Logic (Services)     │   │
│  │  - ThreatService                │   │
│  │  - ThreatStore                  │   │
│  └─────────────────────────────────┘   │
│              ▲         ▲                │
│              │         │                │
│    ┌─────────┴───┐ ┌──┴──────────┐    │
│    │  Inbound    │ │  Outbound   │    │
│    │   Ports     │ │   Ports     │    │
│    └─────────────┘ └─────────────┘    │
└─────────────────────────────────────────┘
         ▲                    ▲
         │                    │
┌────────┴────────┐  ┌────────┴────────┐
│  HTTP Adapter   │  │ Infrastructure  │
│  (Controllers)  │  │  (RabbitMQ,     │
│  (Middlewares)  │  │   Redis, Logger)│
└─────────────────┘  └─────────────────┘
```

### Design Patterns Applied

1. **Facade Pattern**: Controllers act as facades to business logic
2. **Strategy Pattern**: Different threat processing strategies based on severity
3. **Decorator Pattern**: Middleware chain decorates request handling
4. **Factory Pattern**: Service instantiation and dependency injection
5. **Repository Pattern**: ThreatStore abstracts data persistence
6. **Observer Pattern**: WebSocket clients observe threat events

## Component Relationships

### Dependencies
- **Frontend** → Backend Producer (HTTP REST API)
- **Frontend** → Worker (WebSocket connection)
- **Producer** → RabbitMQ (Message publisher)
- **Producer** → Redis (Session/cache storage)
- **Worker** → RabbitMQ (Message consumer)
- **Worker** → Redis (Alert persistence)
- **Worker** → Frontend (WebSocket broadcast)

### Data Flow
1. **Authentication**: Frontend → Producer → JWT token
2. **Threat Submission**: Frontend → Producer → RabbitMQ → Worker → Redis + WebSocket
3. **Real-Time Updates**: Worker → WebSocket → Frontend
4. **History Retrieval**: Frontend → Worker → Redis

## Deployment Architecture

### Docker Compose Services
- `rabbitmq`: Message broker (ports 5672, 15672)
- `redis`: Cache and storage (port 6379)
- `backend`: Producer API (port 3000)
- `worker`: Consumer + WebSocket (port 8081)
- `frontend`: Angular SPA (port 4200)

### Environment Configuration
- `.env` files for service-specific configuration
- Environment variables for secrets and URLs
- Docker networks for service communication

## Testing Structure

### Backend Producer Tests
- **Location**: `backend/producer/src/__tests__/`
- **Framework**: Jest
- **Coverage**: Controllers, middlewares, services
- **Types**: Unit tests, integration tests

### Frontend Tests
- **Location**: `frontend/cyberguard-system/src/app/*.spec.ts`
- **Framework**: Vitest (new), Jest (old)
- **Coverage**: Components, services, guards
- **Types**: Unit tests, component tests

## Documentation Structure

### Technical Docs (`docs/`)
- Architecture guides (Hexagonal, Event-Driven)
- Security guidelines and checklists
- QA evidence and test reports
- Development tools and workflows

### Project Docs (Root)
- README.md: Main project documentation
- AI_WORKFLOW.md: AI-assisted development strategy
- DEBT_REPORT_FRONTEND.md: Technical debt analysis
- PROJECT_CONTEXT.md: High-level overview
