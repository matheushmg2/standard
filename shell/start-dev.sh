#!/bin/bash
# start-dev.sh - Inicia o ambiente de desenvolvimento completo

set -e  # Para o script se algum comando falhar

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando ambiente de desenvolvimento...${NC}"

# ===== 1. PARAR CONTAINERS ANTIGOS =====
echo -e "${YELLOW}📦 Parando containers antigos...${NC}"
docker-compose down

# ===== 2. INICIAR CONTAINERS =====
echo -e "${YELLOW}🚀 Iniciando containers...${NC}"
docker-compose up -d

# ===== 3. AGUARDAR INICIALIZAÇÃO =====
echo -e "${YELLOW}⏳ Aguardando serviços iniciarem...${NC}"
sleep 5

# ===== 4. TESTAR REDIS =====
echo -e "${YELLOW}🔴 Testando Redis...${NC}"
if docker exec -it auth_redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis está rodando!${NC}"
else
    echo -e "${RED}❌ Redis não está respondendo${NC}"
    exit 1
fi

# ===== 5. TESTAR POSTGRESQL =====
echo -e "${YELLOW}🐘 Testando PostgreSQL...${NC}"
if docker exec -it auth_postgres psql -U postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL está rodando!${NC}"
else
    echo -e "${RED}❌ PostgreSQL não está respondendo${NC}"
    exit 1
fi

# ===== 6. VERIFICAR MIGRAÇÕES =====
echo -e "${YELLOW}📦 Verificando migrations...${NC}"
yarn migration:show

# ===== 7. EXECUTAR MIGRAÇÕES PENDENTES =====
echo -e "${YELLOW}📝 Executando migrations pendentes...${NC}"
yarn migration:run

# ===== 8. INICIAR APLICAÇÃO =====
echo -e "${GREEN}🚀 Iniciando aplicação...${NC}"
echo -e "${GREEN}📊 Acesse a documentação em: http://localhost:4000/api/docs${NC}"
echo ""
yarn start:dev