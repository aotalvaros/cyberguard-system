# ============================================================================
# CyberGuard Backend Producer - Multi-stage Dockerfile
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

# Instalar todas las dependencias (incluyendo devDependencies)
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
LABEL service="backend-producer"
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

# Copiar código compilado y migraciones
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations

# Cambiar a usuario no-root
USER nodejs

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]