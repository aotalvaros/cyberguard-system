# Docker - CyberGuard Frontend

## Quick Start

```bash
# Build and run
./deploy.sh

# Stop
./stop.sh
```

## Manual Commands

```bash
# Build image
docker build -t cyberguard-frontend:latest .

# Run container
docker run -d \
  --name cyberguard-frontend \
  -p 4200:80 \
  --restart unless-stopped \
  cyberguard-frontend:latest

# Stop container
docker stop cyberguard-frontend
docker rm cyberguard-frontend

# View logs
docker logs -f cyberguard-frontend

# Restart
docker restart cyberguard-frontend
```

## Access

- Frontend: http://localhost:4200

## Backend Services (External)

- Backend API: http://localhost:3000
- WebSocket: ws://localhost:8081
