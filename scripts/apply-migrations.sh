#!/bin/sh
set -e

log() {
    echo "[MIGRATIONS] $1"
}

# Verifica variáveis obrigatórias
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    log "Erro: Variáveis do banco não definidas."
    exit 1
fi

# Cria tabela de controle
log "Verificando schema_migrations..."
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:${DB_PORT:-5432}/$DB_NAME" <<-EOF
    CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
EOF

# Aplica migrações
log "Verificando /app/supabase/migrations..."
for MIGRATION_FILE in /app/supabase/migrations/*.sql; do
    FILENAME=$(basename "$MIGRATION_FILE")
    
    if psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:${DB_PORT:-5432}/$DB_NAME" -tAc "SELECT 1 FROM schema_migrations WHERE filename = '$FILENAME'" | grep -q 1; then
        log "Pulando: $FILENAME"
        continue
    fi

    log "Aplicando: $FILENAME"
    psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:${DB_PORT:-5432}/$DB_NAME" -f "$MIGRATION_FILE"
    psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:${DB_PORT:-5432}/$DB_NAME" -c "INSERT INTO schema_migrations (filename) VALUES ('$FILENAME')"
done

log "Migrações concluídas!"