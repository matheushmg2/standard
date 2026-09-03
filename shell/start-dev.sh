#!/bin/bash
# start-dev.sh

echo "🚀 Iniciando ambiente de desenvolvimento..."

# Parar containers antigos
docker-compose down

# Iniciar containers
docker-compose up -d

# Aguardar inicialização
echo "⏳ Aguardando serviços iniciarem..."
sleep 3

# Testar Redis
echo "🔴 Testando Redis..."
if docker exec -it auth_redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis está rodando!"
else
    echo "❌ Redis não está respondendo"
    exit 1
fi

# Testar PostgreSQL
echo "🐘 Testando PostgreSQL..."
if docker exec -it auth_postgres psql -U postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ PostgreSQL está rodando!"
else
    echo "❌ PostgreSQL não está respondendo"
    exit 1
fi

# Rodar migrations
echo "📦 Executando migrations..."
yarn migration:run

# Iniciar aplicação
echo "🚀 Iniciando aplicação..."
yarn start:dev