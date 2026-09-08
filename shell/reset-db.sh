#!/bin/bash
# reset-db.sh - Reset completo do banco de dados

set -e  # Para o script se algum comando falhar

echo "⚠️  ATENÇÃO: Isso vai APAGAR TODOS os dados do banco!"
echo "   - Usuários"
echo "   - Sessões"
echo "   - Logs de auditoria"
echo "   - Histórico de senhas"
echo "   - E todas as outras tabelas"
echo ""

read -p "Tem certeza? (digite 's' para confirmar): " confirm

if [ "$confirm" != "s" ]; then
  echo "❌ Operação cancelada."
  exit 0
fi

echo ""
echo "🔄 Resetando banco de dados..."

# 1. Parar containers e remover volumes
echo "📦 Removendo containers e volumes..."
docker compose down -v

# 2. Iniciar containers novamente
echo "🚀 Iniciando containers..."
docker compose up -d postgres redis

# 3. Aguardar banco iniciar
echo "⏳ Aguardando banco de dados iniciar..."
sleep 5

# 4. Executar migrations
echo "📝 Executando migrations..."
yarn migration:run

# 5. Verificar se está tudo ok (SEM o -t)
echo "🔍 Verificando tabelas..."
docker exec -i auth_postgres psql -U postgres -d auth_db -c "\dt"

echo ""
echo "✅ Banco de dados resetado com sucesso!"
echo ""
echo "📊 Tabelas criadas:"
docker exec -i auth_postgres psql -U postgres -d auth_db -c "\dt" | grep -E "(users|sessions|audit_logs|password_history|migrations)"