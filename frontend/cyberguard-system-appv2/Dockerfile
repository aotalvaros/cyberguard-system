# ============================================================================
# CyberGuard Frontend - Multi-stage Dockerfile
# Optimizado para seguridad y tamaño de imagen
# ============================================================================

# ============================================================================
# STAGE: Builder
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (usar ci para reproducibilidad)
RUN npm ci \
    && npm cache clean --force

# Copiar código fuente
COPY . .

# Build de Angular en modo producción
RUN npm run build -- --configuration production

# ============================================================================
# STAGE: Production
# ============================================================================
FROM nginx:1.25-alpine AS production

# Metadata labels
LABEL maintainer="CyberGuard Team"
LABEL service="frontend"
LABEL version="1.0"

# Instalar dependencias para healthcheck
RUN apk add --no-cache curl \
    && rm -rf /var/cache/apk/*

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar build de Angular
COPY --from=builder /app/dist/cyberguard-system-app/browser /usr/share/nginx/html

# Crear usuario nginx y ajustar permisos
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid

# Cambiar a usuario no-root
USER nginx

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]