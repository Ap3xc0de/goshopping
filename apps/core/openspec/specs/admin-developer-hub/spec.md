# admin-developer-hub Specification

## Purpose

El panel admin deja de exponer el editor de branding ("Crear Tienda" y el editor de "Mi Tienda"). En su lugar, `Mi Tienda` (ruta `/dashboard/my-store`) se convierte en el hub de integración con la API pública: slug, URL base, gestión de API keys y ejemplo de conexión.

## Requirements

### Requirement: Remove Create Store Module

El sistema SHALL eliminar por completo el módulo "Crear Tienda" del panel admin.

#### Scenario: No sidebar link

- GIVEN un vendedor autenticado en el panel
- WHEN se renderiza el sidebar
- THEN no existe el enlace "Crear Tienda"

#### Scenario: Route gone

- GIVEN la URL `/dashboard/create-store`
- WHEN se intenta acceder
- THEN no existe una página correspondiente

### Requirement: Mi Tienda shows connector info

La página `Mi Tienda` MUST mostrar el `slug` de la tienda, la URL base de la API y la referencia de endpoints `/api/v1/:slug/*`.

#### Scenario: Slug visible

- GIVEN un vendedor con tienda cuyo slug es `mi-tienda-abc`
- WHEN abre `/dashboard/my-store`
- THEN ve el slug `mi-tienda-abc`

#### Scenario: API base URL visible

- GIVEN la variable `NEXT_PUBLIC_API_URL` configurada
- WHEN abre `/dashboard/my-store`
- THEN ve la URL base de la API y la ruta `/api/v1/{slug}`

### Requirement: API key management UI

La página MUST permitir listar, crear (mostrando el plaintext exactamente una vez) y revocar API keys usando `GET/POST /stores/:storeId/api-keys` y `DELETE /stores/:storeId/api-keys/:keyId`.

#### Scenario: List existing keys

- GIVEN una tienda con claves existentes
- WHEN abre la página
- THEN ve las claves enmascaradas (sin `key_hash` ni `plaintext`)

#### Scenario: Create key shows plaintext once

- GIVEN el vendedor crea una clave con nombre
- WHEN la creación es exitosa
- THEN se muestra el `plaintext` en un aviso de "mostrar una sola vez"
- AND la clave listada queda enmascarada después

#### Scenario: Revoke key

- GIVEN una clave listada
- WHEN el vendedor la revoca
- THEN desaparece de la lista

### Requirement: No branding editor

La página `Mi Tienda` MUST NOT contener el editor de colores/tipografías/radio ni la vista previa de branding.

#### Scenario: Branding UI absent

- GIVEN un vendedor autenticado
- WHEN abre `/dashboard/my-store`
- THEN no hay campos de color, tipografía ni `MiTiendaPreview`
