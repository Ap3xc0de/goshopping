#!/bin/bash
set -euo pipefail

echo "╔══════════════════════════════════════════╗"
echo "║  Go Shopping — Deploy DEV Environment    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infra/environments/dev"

# ── 1. Verificar prerrequisitos ──
echo "[1/5] Verificando prerrequisitos..."
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform no instalado. Instalar: https://developer.hashicorp.com/terraform/install"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI no instalado. Instalar: https://aws.amazon.com/cli/"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker no instalado."; exit 1; }

aws sts get-caller-identity > /dev/null 2>&1 || { echo "❌ AWS no configurado. Ejecuta: aws configure"; exit 1; }
echo "  ✅ Terraform, AWS CLI, Docker — OK"
echo "  ✅ AWS Identity: $(aws sts get-caller-identity --query 'Account' --output text)"

# ── 2. Crear bundle del código ──
echo "[2/5] Creando bundle del código..."
cd "$PROJECT_ROOT"

# Incluye apps, libs, docker y el docker-compose de prod del infra/dev
tar -czf app-bundle.tar.gz \
  --exclude='*/node_modules' \
  --exclude='*/.git' \
  --exclude='*/.next' \
  --exclude='*/dist' \
  --exclude='*/.terraform' \
  --exclude='*.tfstate*' \
  --exclude='app-bundle.tar.gz' \
  apps/ libs/ docker/ Makefile \
  infra/environments/dev/docker-compose.prod.yml

echo "  ✅ Bundle creado ($(du -h app-bundle.tar.gz | cut -f1))"

# ── 3. Terraform init ──
echo "[3/5] Inicializando Terraform..."
cd "$INFRA_DIR"
terraform init -input=false -upgrade

# ── 4. Terraform apply ──
echo "[4/5] Desplegando infraestructura en AWS..."
terraform apply -auto-approve

# ── 5. Mostrar URLs ──
echo ""
echo "[5/5] ¡Deployment completado!"
echo ""
echo "═══════════════════════════════════════════"
terraform output all_urls
echo "═══════════════════════════════════════════"
echo ""
echo "⏳ Los servicios tardan 5-10 minutos en arrancar completamente."
echo "   Los logs están disponibles en el EC2 en: /var/log/user-data.log"
echo ""
echo "   Ejecuta 'make check-dev' para verificar el estado de los servicios."
echo "   Ejecuta 'make destroy-dev' cuando quieras destruir el ambiente."
