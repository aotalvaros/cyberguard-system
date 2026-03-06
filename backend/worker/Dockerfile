# ============================================================================
# CyberGuard Backend Worker - Multi-stage Dockerfile
# Optimizado para seguridad y tamaño de imagen
# ============================================================================

# ============================================================================
# STAGE: Builder
# ============================================================================
FROM node:20-alpine AS builder

# Instalar dependencias de compilación si son necesarias
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar solo archivos de dependencias primero (cache layer)
COPY package*.json ./

# Instalar todas las dependencias
RUN npm ci --ignore-scripts \
    && npm cache clean --force

# Copiar código fuente
COPY . .

# Build
RUN npm run build

# ============================================================================
# STAGE: Production
# ============================================================================
FROM node:20-alpine AS production

# Metadata labels
LABEL maintainer="CyberGuard Team"
LABEL service="backend-worker"
LABEL version="1.0"

# Instalar dependencias de runtime y seguridad
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar solo producción
RUN npm ci --only=production --ignore-scripts \
    && npm cache clean --force

# Copiar código compilado
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Cambiar a usuario no-root
USER nodejs

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV WORKER_WS_PORT=8081

EXPOSE 8081

# Healthcheck básico (verificar que el proceso está corriendo)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]