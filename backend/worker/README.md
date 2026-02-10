# Worker - CyberGuard System

This worker consumes events from RabbitMQ and forwards them to a WebSocket server where the frontend can listen.

Features:
- Consumes `cyberguard.events` exchange (topic)
- Broadcasts messages to WebSocket clients
- Reconnect logic for RabbitMQ

Stack: Node.js + TypeScript + RabbitMQ (amqplib) + ws
