#!/bin/bash
# reset-db.sh

echo "⚠️  Isso vai APAGAR todos os dados!"
read -p "Tem certeza? (digite 'sim' para confirmar): " confirm

if [ "$confirm" != "sim" ]; then
  echo "Cancelado."
  exit 0
fi

echo "🔄 Resetando banco..."

# Parar containers
docker-compose down -v

# Iniciar novamente
docker-compose up -d postgres redis

# Aguardar
echo "⏳ Aguardando banco iniciar..."
sleep 5

# Executar migrations
yarn migration:run

echo "✅ Banco resetado com sucesso!"