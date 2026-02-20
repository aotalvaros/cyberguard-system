#!/bin/bash

# CyberGuard Frontend - Deploy Script

set -e

echo "🚀 CyberGuard Frontend Deployment"
echo "================================="

IMAGE_NAME="cyberguard-frontend"
CONTAINER_NAME="cyberguard-frontend"
PORT="4200"

# Build image
echo "📦 Building Docker image..."
docker build -t $IMAGE_NAME:latest .

# Stop and remove existing container
echo "🛑 Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run container
echo "🚀 Starting container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:80 \
  --restart unless-stopped \
  $IMAGE_NAME:latest

# Show status
echo ""
echo "✅ Deployment completed!"
echo ""
echo "Frontend: http://localhost:$PORT"
echo ""
echo "Commands:"
echo "  - View logs: docker logs -f $CONTAINER_NAME"
echo "  - Stop: docker stop $CONTAINER_NAME"
echo "  - Restart: docker restart $CONTAINER_NAME"
echo ""
