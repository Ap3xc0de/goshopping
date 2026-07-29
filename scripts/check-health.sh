#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infra/environments/dev"

if ! terraform -chdir="$INFRA_DIR" output public_ip > /dev/null 2>&1; then
  echo "❌ No hay deployment activo. Ejecuta: make deploy-dev"
  exit 1
fi

IP=$(terraform -chdir="$INFRA_DIR" output -raw public_ip 2>/dev/null)

if [ -z "$IP" ]; then
  echo "❌ No hay deployment activo. Ejecuta: make deploy-dev"
  exit 1
fi

echo "Verificando servicios en $IP..."
echo ""

check_service() {
  local name=$1
  local url=$2
  if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
    echo "  ✅ $name — OK ($url)"
  else
    echo "  ❌ $name — No responde ($url)"
  fi
}

check_service "Core API"    "http://$IP:3000/health"
check_service "AI Engine"   "http://$IP:3002/health"
check_service "SuperAdmin"  "http://$IP:3003"
check_service "Admin Panel" "http://$IP:3010"
check_service "Storefront"  "http://$IP:3004"

echo ""
echo "Nota: Si los servicios no responden, los logs están en el EC2:"
echo "  $(terraform -chdir="$INFRA_DIR" output -raw ssh_command 2>/dev/null || echo 'SSH no configurado')"
echo "  sudo tail -f /var/log/user-data.log"
