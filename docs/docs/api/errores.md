---
sidebar_position: 3
---

# Manejo de Errores

## Formato de error

Todos los errores siguen el mismo formato:

```json
{
  "error": "Descripción del error para el cliente"
}
```

Algunos errores incluyen detalles adicionales:

```json
{
  "error": "Validation failed",
  "details": {
    "email": "invalid format",
    "password": "minimum 8 characters required"
  }
}
```

## Códigos HTTP

| Código | Cuándo |
|---|---|
| `200 OK` | GET, PATCH, PUT exitoso |
| `201 Created` | POST exitoso (recurso creado) |
| `204 No Content` | DELETE exitoso |
| `400 Bad Request` | Cuerpo inválido o campos faltantes |
| `401 Unauthorized` | Token ausente, inválido o expirado |
| `403 Forbidden` | Token válido pero sin permisos para esta operación |
| `404 Not Found` | Recurso no encontrado |
| `409 Conflict` | Conflicto (ej: email ya registrado) |
| `422 Unprocessable Entity` | Validación de negocio fallida |
| `500 Internal Server Error` | Error inesperado del servidor |

## Errores comunes

### 401 Unauthorized

```json
{ "error": "Missing or invalid Authorization header" }
{ "error": "Token has expired" }
{ "error": "Invalid token signature" }
```

**Acción**: el cliente debe redirigir al login o llamar a `/auth/refresh`.

### 403 Forbidden

```json
{ "error": "Access denied to this store" }
{ "error": "Insufficient permissions for this operation" }
```

**Acción**: el usuario no tiene acceso a este recurso. No reintentar.

### 404 Not Found

```json
{ "error": "Product not found" }
{ "error": "Order not found" }
```

**Acción**: el recurso no existe o fue eliminado (soft deleted).

### 409 Conflict

```json
{ "error": "Email already registered" }
{ "error": "SKU already exists in this store" }
```

**Acción**: mostrar mensaje al usuario para corregir.

### 500 Internal Server Error

```json
{ "error": "Internal server error" }
```

**Nota**: el mensaje de error interno NUNCA se expone al cliente. Los detalles van a los logs del servidor. El cliente siempre recibe el mensaje genérico.

## En desarrollo local

Cuando `APP_ENV=development`, el servidor incluye el stack trace en la respuesta:

```json
{
  "error": "Internal server error",
  "debug": "pq: duplicate key value violates unique constraint...",
  "stack": "goroutine 1 [running]:\n..."
}
```

En producción (`APP_ENV=production`), el `debug` y `stack` no se incluyen.
