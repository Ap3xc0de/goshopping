---
sidebar_position: 6
---

# Endpoint: Auth

## POST /auth/register

Ver [Autenticación → Register](../autenticacion.md#post-authregister).

## POST /auth/login

Ver [Autenticación → Login](../autenticacion.md#post-authlogin).

## POST /auth/refresh

Ver [Autenticación → Refresh](../autenticacion.md#post-authrefresh).

## Notas de seguridad

- Los errores de login usan mensajes genéricos para prevenir enumeración de usuarios
- Los tokens de refresh se invalidan si la cuenta es suspendida
- No hay límite de tasa de login en Etapa 1 (se implementa en Etapa 3 con Redis)
