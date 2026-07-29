# /dev-lan

Levanta todo GoShopping en LAN para pruebas de QA entre dispositivos, reutilizando los comandos y scripts del repo.

## Objetivo
- Dejar stack backend y frontends operativos en local y accesibles desde la red LAN.
- Asegurar despliegue con backend actualizado del workspace actual.

## Instrucciones para el agente
1. Ve al root del repositorio.
2. Ejecuta `make dev-lan`.
3. Si el usuario pide abrir puertos automáticamente o QA no puede acceder, ejecuta:
   `powershell -ExecutionPolicy Bypass -File scripts/dev-all-lan.ps1 -OpenFirewall`
4. Verifica salud HTTP de estos endpoints:
   - `http://localhost:3000/health`
   - `http://localhost:3001/health`
   - `http://localhost:3002/health`
   - `http://localhost:3003`
   - `http://localhost:3004`
   - `http://localhost:3005`
5. Detecta la IP LAN del host y reporta URLs para QA usando esa IP y los mismos puertos.
6. Si algún servicio falla, revisa logs del terminal correspondiente y aplica fix mínimo para dejarlo arriba.

## Garantía de backend actualizado
- `scripts/dev-all-lan.ps1` ejecuta `docker compose ... up -d --build ai-engine` para reconstruir AI Engine en cada arranque.
- Core e Integrations se inician desde código fuente local, por lo que siempre corren la última versión del workspace.

## Salida esperada
- Confirmación de servicios arriba.
- URLs LAN listas para compartir con QA.
- Cualquier requisito pendiente (por ejemplo, ejecutar con permisos de administrador para firewall).