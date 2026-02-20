# CyberGuard System - Product Overview

## Purpose
CyberGuard System is a distributed real-time cybersecurity alert platform built with event-driven microservices architecture. It enables security teams to detect, process, and respond to cyber threats through asynchronous message processing and real-time notifications.

## Value Proposition
- **Real-time threat detection**: Instant processing and notification of security incidents
- **Scalable architecture**: Event-driven design with RabbitMQ message broker supports high throughput
- **Distributed processing**: Decoupled producer-consumer pattern enables horizontal scaling
- **Persistent alerting**: Redis-backed storage ensures no alerts are lost
- **Live monitoring**: WebSocket connections provide instant dashboard updates

## Key Features

### 1. Threat Alert Management
- Create and submit security threat alerts with severity levels (Low, Medium, High, Critical)
- Categorize threats by type (Malware, Phishing, DDoS, Data Breach, Unauthorized Access)
- Attach detailed descriptions and affected systems information
- Real-time validation and sanitization of threat data

### 2. Event-Driven Processing
- Asynchronous message queue (RabbitMQ) decouples alert submission from processing
- Producer API publishes threat events to message broker
- Worker consumers process alerts independently and reliably
- Dead Letter Queue (DLQ) handling for failed message processing

### 3. Real-Time Notifications
- WebSocket server broadcasts alerts to connected admin dashboards
- Live message history with configurable capacity limits
- Persistent storage in Redis for message recovery
- Automatic reconnection and session management

### 4. Security & Authentication
- JWT-based authentication for API access
- Role-based access control (Admin/User roles)
- Brute-force protection with rate limiting
- Input validation and sanitization (Joi schemas)
- Helmet.js security headers and CORS configuration

### 5. Monitoring & Observability
- Winston-based structured logging
- Request/response logging with correlation IDs
- Error tracking and debugging capabilities
- RabbitMQ Management UI for queue monitoring

## Target Users

### Primary: Security Operations Center (SOC) Teams
- Monitor incoming security threats in real-time
- Triage and prioritize incidents based on severity
- Track threat patterns and attack vectors
- Coordinate incident response activities

### Secondary: Security Analysts
- Submit detected threats through API or dashboard
- Review historical alert data
- Analyze threat trends and patterns
- Generate security reports

### Tertiary: DevOps/Platform Engineers
- Deploy and maintain the distributed system
- Monitor system health and performance
- Scale components based on load
- Manage infrastructure and configurations

## Use Cases

### UC-1: Real-Time Threat Detection
**Actor**: Security Analyst  
**Flow**: Analyst detects suspicious activity → Submits threat via API → System validates and queues alert → Worker processes and broadcasts → SOC team receives instant notification

### UC-2: High-Volume Alert Processing
**Actor**: Automated Security Tool  
**Flow**: SIEM system detects anomaly → Sends batch of alerts to API → RabbitMQ queues messages → Multiple workers process in parallel → All alerts stored and broadcasted

### UC-3: Dashboard Monitoring
**Actor**: SOC Operator  
**Flow**: Operator logs into dashboard → WebSocket connection established → Real-time alerts appear as they're processed → Operator reviews and takes action

### UC-4: Alert History Review
**Actor**: Security Manager  
**Flow**: Manager opens dashboard → System loads recent alerts from Redis → Manager filters by severity/type → Reviews historical incidents for reporting

### UC-5: System Recovery
**Actor**: System (Automated)  
**Flow**: Worker crashes during processing → RabbitMQ requeues unacknowledged messages → New worker instance picks up message → Alert processing continues without data loss

## Technical Differentiators
- **Hexagonal Architecture**: Clean separation of business logic from infrastructure
- **SOLID Principles**: Maintainable, testable, and extensible codebase
- **Docker-based Deployment**: Containerized services for consistent environments
- **Monorepo Structure**: Unified codebase for frontend, backend, and worker
- **Comprehensive Testing**: Unit tests with Jest/Vitest for quality assurance
