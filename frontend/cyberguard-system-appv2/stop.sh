#!/bin/bash

# CyberGuard Frontend - Stop Script

set -e

CONTAINER_NAME="cyberguard-frontend"
IMAGE_NAME="cyberguard-frontend"

echo "🛑 Stopping CyberGuard Frontend"
echo "============================="

# Stop container
echo "Stopping container..."
docker stop $CONTAINER_NAME 2>/dev/null || echo "Container not running"

# Remove container
echo "Removing container..."
docker rm $CONTAINER_NAME 2>/dev/null || echo "Container not found"

# Optional: Remove image
read -p "Remove Docker image? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing image..."
    docker rmi $IMAGE_NAME:latest 2>/dev/null || echo "Image not found"
fi

echo ""
echo "✅ Frontend stopped successfully"
