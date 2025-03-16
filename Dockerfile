# Build stage
FROM node:20 AS builder
WORKDIR /app

# Copy package files and configs
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY index.html ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build-time environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src
#COPY public ./public
COPY supabase/migrations ./supabase/migrations

# Build production assets
RUN npm run build

# Runtime stage
FROM nginx:alpine3.18

# Install runtime dependencies
RUN apk add --no-cache postgresql-client bash nodejs npm curl

# Create necessary directories with correct permissions
RUN mkdir -p /scripts /app/supabase/migrations /var/run/nginx /var/cache/nginx && \
    chown -R nginx:nginx /scripts /app/supabase/migrations /var/run/nginx /var/cache/nginx /var/log/nginx && \
    chmod -R 755 /scripts /app/supabase/migrations /var/run/nginx /var/cache/nginx

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html

# Copy migrations from builder
COPY --from=builder /app/supabase/migrations /app/supabase/migrations

# Copy scripts
COPY scripts/apply-migrations.sh /scripts/apply-migrations.sh
COPY scripts/entrypoint.sh /app/entrypoint.sh
RUN apk add --no-cache dos2unix && \
    chmod a+rx /app/entrypoint.sh /scripts/apply-migrations.sh && \
    dos2unix /scripts/apply-migrations.sh && \
    chown nginx:nginx /app/entrypoint.sh /scripts/apply-migrations.sh && \
    echo "Verificando permissões dos scripts:" && \
    ls -l /app/entrypoint.sh /scripts/apply-migrations.sh && \
    find /scripts -type f -exec ls -l {} \;

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
RUN chown nginx:nginx /etc/nginx/nginx.conf

# Switch to nginx user
USER nginx

# Expose port 80
EXPOSE 80

# Entrypoint
CMD ["/bin/sh", "-c", "/app/entrypoint.sh"]
