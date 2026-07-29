---
sidebar_position: 3
---

# Migraciones

Go Shopping usa **golang-migrate** para gestión de migraciones SQL.

## Estructura de archivos

```
apps/core/migrations/
├── 000001_initial_schema.up.sql      # Crea las 9 tablas
├── 000001_initial_schema.down.sql    # DROP de las 9 tablas
└── 000002_*.up.sql                   # Próximas migraciones (Etapa 2+)
```

## Convenciones de naming

```
{version}_{descripcion}.{up|down}.sql
```

- `version`: 6 dígitos con padding (`000001`, `000002`, etc.)
- `descripcion`: snake_case, imperativo (`create_products_table`, `add_index_orders_status`)
- Siempre crear ambos `.up.sql` y `.down.sql`

## Cómo se ejecutan

Las migraciones se ejecutan automáticamente al iniciar el servidor:

```go
// apps/core/internal/database/database.go
func RunMigrations(pool *pgxpool.Pool) error {
    m, err := migrate.NewWithDatabaseInstance(
        "file://migrations",
        "postgres",
        driver,
    )
    return m.Up()
}
```

En `main.go`:
```go
if err := database.RunMigrations(pool); err != nil && err != migrate.ErrNoChange {
    log.Fatalf("Migration failed: %v", err)
}
```

## Ejecutar migraciones manualmente

```bash
# Instalar la CLI
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Subir todas las migraciones pendientes
migrate -path apps/core/migrations -database "postgresql://goshopping:localdev123@localhost:5434/goshopping?sslmode=disable" up

# Bajar 1 migración
migrate -path apps/core/migrations -database "postgresql://..." down 1

# Ver versión actual
migrate -path apps/core/migrations -database "postgresql://..." version
```

## Reglas importantes

1. **Nunca modificar una migración ya ejecutada** — crea una nueva migración para el cambio.
2. **Siempre escribir el `.down.sql`** — permite revertir en staging antes de producción.
3. **Las migraciones son idempotentes** — usa `IF NOT EXISTS` cuando corresponda.
4. **Commits atómicos** — un commit = una migración + el código que la usa.

## Estado de la migración actual

La migración `000001_initial_schema` crea:

| Tabla | Operaciones en la migración |
|---|---|
| `accounts` | CREATE TABLE + índice email + trigger updated_at |
| `stores` | CREATE TABLE + índice account_id + índice slug + trigger updated_at |
| `store_users` | CREATE TABLE + UNIQUE(store_id, account_id) |
| `products` | CREATE TABLE + índices compuestos + trigger updated_at |
| `customers` | CREATE TABLE + índice store_id + trigger updated_at |
| `orders` | CREATE TABLE + índices + trigger updated_at |
| `order_timeline` | CREATE TABLE + índice order_id |
| `integrations` | CREATE TABLE + UNIQUE(store_id, type) + trigger updated_at |
| `audit_log` | CREATE TABLE + índice created_at DESC |

Ver la migración completa en [apps/core/migrations/000001_initial_schema.up.sql](../../apps/core/migrations/000001_initial_schema.up.sql).
