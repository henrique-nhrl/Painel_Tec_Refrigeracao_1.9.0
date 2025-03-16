#!/bin/sh
set -e

echo "Iniciando aplicação..."

# Verifica variáveis do banco
if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ]; then
    echo "Configuração do banco encontrada"
    echo "DB_HOST: ${DB_HOST}"
    echo "DB_PORT: ${DB_PORT:-5432}"
    echo "DB_NAME: ${DB_NAME}"
    echo "DB_USER: ${DB_USER}"
    
    # Aguarda o banco estar disponível
    echo "Aguardando banco de dados..."
    timeout=60
    while ! pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
        timeout=$((timeout-1))
        if [ $timeout -eq 0 ]; then
            echo "Timeout aguardando banco de dados"
            break
        fi
        sleep 1
    done
    
    # Executa migrações
    echo "Verificando permissões do script de migração:"
ls -l /scripts/apply-migrations.sh
echo "Aplicando migrações..."
    bash /scripts/apply-migrations.sh || echo "Aviso: Falha ao aplicar migrações"
fi

# Inicia Nginx
echo "Iniciando Nginx..."
exec nginx -g 'daemon off;'
