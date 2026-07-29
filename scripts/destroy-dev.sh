#!/bin/bash
set -euo pipefail

echo "╔══════════════════════════════════════════╗"
echo "║  Go Shopping — Destruir DEV Environment  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "⚠️  Esto destruirá TODOS los recursos de dev en AWS."
echo "   No se puede deshacer."
echo ""
read -p "¿Estás seguro? (escribe 'yes' para confirmar): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cancelado."
  exit 0
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infra/environments/dev"

echo ""
echo "Destruyendo recursos en AWS..."
cd "$INFRA_DIR"
terraform destroy -auto-approve

# Limpiar bundle local
rm -f "$PROJECT_ROOT/app-bundle.tar.gz"

echo ""
echo "✅ Ambiente DEV destruido completamente."
echo "   No quedan recursos en AWS generando costos."
