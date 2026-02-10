# Worker - CyberGuard System

Pendiente de implementación.

Este módulo será el Consumer que:
- Consume eventos de RabbitMQ
- Procesa amenazas detectadas
- Envía notificaciones (email, SMS, Slack)
- Implementa lógica de reintentos con backoff exponencial

Stack: Node.js + TypeScript + RabbitMQ (amqplib)
