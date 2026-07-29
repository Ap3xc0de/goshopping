# /stop-lan

Apaga todo el entorno LAN de GoShopping y deja limpia la maquina para finalizar pruebas.

## Objetivo
- Cerrar procesos de desarrollo abiertos por el flujo dev-lan.
- Detener contenedores Docker del entorno local.

## Instrucciones para el agente
1. Ve al root del repositorio.
2. Ejecuta `make stop-lan`.
3. Verifica que ya no respondan estos puertos: 3000, 3001, 3002, 3003, 3004, 3005.
4. Reporta cualquier proceso residual y si fue necesario matar por fallback de puerto.

## Detalle tecnico
- scripts/stop-lan.ps1 usa .dev-lan-state.json para cerrar por PID.
- Si faltan PIDs, aplica fallback por puertos de servicios app.
- Finalmente ejecuta docker compose down del stack local.

## Salida esperada
- Confirmacion de entorno detenido.
- Notas de residuos si hubo alguno.