#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/user-data.log) 2>&1

echo "════════════════════════════════════════"
echo "  Go Shopping — Dev Environment Setup"
echo "════════════════════════════════════════"

# ── Variables ──
# ${anthropic_api_key} es sustituido por Terraform templatefile
ANTHROPIC_API_KEY="${anthropic_api_key}"
APP_DIR="/opt/goshopping"

# ── 1. Actualizar sistema ──
echo "[1/8] Actualizando sistema..."
apt-get update -y
apt-get upgrade -y

# ── 2. Instalar Docker ──
echo "[2/8] Instalando Docker..."
apt-get install -y ca-certificates curl gnupg awscli
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $$(. /etc/os-release && echo "$$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# ── 3. Instalar Node.js 20 + Go 1.22 ──
echo "[3/8] Instalando Node.js y Go..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g npm@latest

wget -q https://go.dev/dl/go1.22.4.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.22.4.linux-amd64.tar.gz
rm go1.22.4.linux-amd64.tar.gz
echo 'export PATH=$$PATH:/usr/local/go/bin' >> /etc/profile
export PATH=$$PATH:/usr/local/go/bin

# ── 4. Descargar código ──
echo "[4/8] Descargando código..."
mkdir -p $$APP_DIR
cd $$APP_DIR

# Identificar bucket de deploy (tiene prefijo goshopping-dev-deploy-)
DEPLOY_BUCKET=$$(aws s3 ls | grep goshopping-dev-deploy | awk '{print $$3}' | head -1)

if [ -n "$$DEPLOY_BUCKET" ]; then
  echo "Descargando bundle desde s3://$$DEPLOY_BUCKET/app-bundle.tar.gz"
  aws s3 cp "s3://$$DEPLOY_BUCKET/app-bundle.tar.gz" /tmp/app-bundle.tar.gz
  tar -xzf /tmp/app-bundle.tar.gz -C $$APP_DIR
  rm /tmp/app-bundle.tar.gz
  echo "Bundle extraído en $$APP_DIR"
else
  echo "WARN: No se encontró bucket de deploy — bundle no descargado"
fi

# Mover docker-compose.prod.yml al directorio raíz de la app
cp $$APP_DIR/infra/environments/dev/docker-compose.prod.yml $$APP_DIR/ 2>/dev/null || \
  echo "WARN: docker-compose.prod.yml no encontrado en infra/"

# Copiar elasticmq.conf al directorio raíz
cp $$APP_DIR/docker/elasticmq.conf $$APP_DIR/ 2>/dev/null || \
  echo "WARN: elasticmq.conf no encontrado en docker/"

# ── 5. Obtener IP pública ──
echo "[5/8] Obteniendo IP pública..."
# La IP pública puede ser la EIP (asociada por Terraform) o la auto-asignada
PUBLIC_IP=$$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")
echo "IP pública: $$PUBLIC_IP"

# ── 6. Crear archivo .env ──
echo "[6/8] Configurando variables de entorno..."
cat > $$APP_DIR/.env << ENVEOF
# ── Database ──
DB_HOST=postgres
DB_PORT=5432
DB_USER=goshopping
DB_PASSWORD=devpassword2026
DB_NAME=goshopping
DB_SSL_MODE=disable

# ── Redis ──
REDIS_URL=redis://redis:6379

# ── Queue (ElasticMQ) ──
SQS_ENDPOINT=http://elasticmq:9324
SQS_REGION=us-east-1
SQS_ACCESS_KEY=x
SQS_SECRET_KEY=x

# ── S3 / LocalStack ──
AWS_ENDPOINT=http://localstack:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET=goshopping-dev

# ── JWT ──
JWT_SECRET=goshopping-dev-secret-2026-change-in-prod

# ── App ──
APP_ENV=development
PORT=3000

# ── AI Engine ──
ANTHROPIC_API_KEY=$$ANTHROPIC_API_KEY
AI_ENGINE_URL=http://ai-engine:3002

# ── Frontend URLs (build-time via Docker ARG) ──
NEXT_PUBLIC_API_URL=http://$$PUBLIC_IP:3000
NEXT_PUBLIC_AI_ENGINE_URL=http://$$PUBLIC_IP:3002
ENVEOF

# Crear .env.local para los frontends (build time Next.js)
cat > $$APP_DIR/.env.frontend << FRONTEOF
NEXT_PUBLIC_API_URL=http://$$PUBLIC_IP:3000
NEXT_PUBLIC_AI_ENGINE_URL=http://$$PUBLIC_IP:3002
FRONTEOF

cp $$APP_DIR/.env.frontend $$APP_DIR/apps/admin/.env.local 2>/dev/null || true
cp $$APP_DIR/.env.frontend $$APP_DIR/apps/superadmin/.env.local 2>/dev/null || true
cp $$APP_DIR/.env.frontend $$APP_DIR/apps/storefront/.env.local 2>/dev/null || true

# ── 7. Levantar servicios ──
echo "[7/8] Levantando servicios con Docker Compose..."
cd $$APP_DIR

docker compose -f docker-compose.prod.yml up -d --build

# Esperar a que PostgreSQL esté listo
echo "Esperando a PostgreSQL..."
sleep 15
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U goshopping; do
  sleep 2
done
echo "PostgreSQL listo"

# ── 8. Seed de datos de demo ──
echo "[8/8] Cargando datos de demo..."
sleep 10

API="http://localhost:3000"

# Esperar a que el Core API responda
for i in $$(seq 1 30); do
  if curl -sf "$$API/health" > /dev/null 2>&1; then
    echo "Core API respondiendo"
    break
  fi
  echo "Esperando Core API... ($$i/30)"
  sleep 5
done

# Crear SuperAdmin
echo "Creando SuperAdmin..."
ADMIN_RESPONSE=$$(curl -sf -X POST "$$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@goshopping.co","password":"demo123456","name":"Super Admin"}' || echo '{}')

# Elevar a superadmin en DB
docker compose -f docker-compose.prod.yml exec -T postgres psql -U goshopping -c \
  "UPDATE accounts SET role='superadmin' WHERE email='admin@goshopping.co';" 2>/dev/null || true

# Crear vendedor demo
echo "Creando vendedor demo..."
VENDOR_RESPONSE=$$(curl -sf -X POST "$$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"vendedor@demo.co","password":"demo123456","name":"Tienda Demo"}' || echo '{}')

TOKEN=$$(echo "$$VENDOR_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -n "$$TOKEN" ] && [ "$$TOKEN" != "" ]; then
  STORE_ID=$$(echo "$$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stores',[{}])[0].get('store_id',''))" 2>/dev/null || echo "")

  if [ -n "$$STORE_ID" ]; then
    echo "Cargando productos demo (store: $$STORE_ID)..."

    curl -sf -X POST "$$API/stores/$$STORE_ID/products" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $$TOKEN" \
      -d '{"name":"Camiseta Negra Premium","sku":"CAM-001","price":89900,"cost":45000,"stock":50,"min_stock":5,"category":"Camisetas","description":"Camiseta 100% algodón premium"}' || true

    curl -sf -X POST "$$API/stores/$$STORE_ID/products" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $$TOKEN" \
      -d '{"name":"Zapatos Deportivos Pro","sku":"ZAP-001","price":245000,"cost":120000,"stock":30,"min_stock":3,"category":"Zapatos","description":"Running con amortiguación"}' || true

    curl -sf -X POST "$$API/stores/$$STORE_ID/products" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $$TOKEN" \
      -d '{"name":"Bolso Cuero Artesanal","sku":"BOL-001","price":380000,"cost":190000,"stock":15,"min_stock":2,"category":"Accesorios","description":"Cuero genuino hecho a mano"}' || true

    curl -sf -X POST "$$API/stores/$$STORE_ID/products" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $$TOKEN" \
      -d '{"name":"Reloj Minimalista","sku":"REL-001","price":195000,"cost":95000,"stock":20,"min_stock":3,"category":"Accesorios","description":"Acero inoxidable diseño minimal"}' || true

    curl -sf -X POST "$$API/stores/$$STORE_ID/products" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $$TOKEN" \
      -d '{"name":"Gorra Urban Style","sku":"GOR-001","price":59900,"cost":25000,"stock":100,"min_stock":10,"category":"Accesorios","description":"Snapback estilo urbano"}' || true

    curl -sf -X POST "$$API/stores/$$STORE_ID/products" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $$TOKEN" \
      -d '{"name":"Pantalón Jogger","sku":"PAN-001","price":129900,"cost":65000,"stock":40,"min_stock":5,"category":"Pantalones","description":"Jogger slim fit"}' || true

    curl -sf -X POST "$$API/stores/$$STORE_ID/customers" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $$TOKEN" \
      -d '{"name":"María López","email":"maria@test.co","phone":"3101234567"}' || true

    echo "Datos de demo cargados: 6 productos, 1 cliente"
  fi
fi

echo ""
echo "════════════════════════════════════════"
echo "  ✅ Go Shopping DEV — Desplegado"
echo "════════════════════════════════════════"
echo ""
echo "  🔵 SuperAdmin:  http://$$PUBLIC_IP:3003"
echo "     → admin@goshopping.co / demo123456"
echo ""
echo "  🟢 Admin Panel: http://$$PUBLIC_IP:3010"
echo "     → vendedor@demo.co / demo123456"
echo ""
echo "  🟣 Storefront:  http://$$PUBLIC_IP:3004"
echo "     → /preview para design system"
echo ""
echo "  🔴 Core API:    http://$$PUBLIC_IP:3000/health"
echo "  🤖 AI Engine:   http://$$PUBLIC_IP:3002/health"
echo ""
echo "════════════════════════════════════════"
