# ADR-008: Monetary Values Use `shopspring/decimal` Instead of `float64`

**Status**: Accepted  
**Date**: 2025-07  
**Deciders**: Go Shopping Engineering

---

## Context

All monetary fields in the Core API (`price`, `cost`, `subtotal`, `tax`, `total`) were typed as
`float64`. IEEE 754 floating-point arithmetic is unsuitable for financial calculations because it
cannot represent many decimal fractions exactly.

Example of the failure mode:

```
0.1 + 0.2 = 0.30000000000000004   // float64 arithmetic
0.1 + 0.2 = 0.3                   // decimal arithmetic
```

In practice this shows up when:
- Accumulating line totals across multiple items
- Applying percentage-based taxes (IVA 19%)
- Comparing stored values against computed values in tests

The PostgreSQL schema already uses `DECIMAL(12,2)` for all monetary columns, so the database
representation was already correct; the problem lived only in the Go application layer.

---

## Decision

We introduce a **`Money` wrapper type** in `internal/models/money.go` that embeds
`github.com/shopspring/decimal.Decimal` and provides:

- `MarshalJSON` / `UnmarshalJSON` — serializes as a **JSON number** (`49999.99`), not a string
- Arithmetic helpers (`Add`, `Sub`, `Mul`, `MulInt`, `Round2`)
- Predicate helpers (`IsPositive`, `IsNegative`)
- pgx compatibility **for free** via the promoted `encoding.TextMarshaler` / `TextUnmarshaler`
  that `decimal.Decimal` already implements

### Files changed

| File | Change |
|------|--------|
| `internal/models/money.go` | **NEW** — `Money` type |
| `internal/models/product.go` | `Price`, `Cost` → `Money` in all structs |
| `internal/models/order.go` | `Subtotal`, `Tax`, `Total`, `OrderItem.Price`, `OrderItem.Total` → `Money` |
| `internal/services/product_service.go` | validations + BulkImport price parsing → decimal |
| `internal/services/order_service.go` | `IVARate` constant, `CreateOrder` arithmetic → Money |
| `internal/handlers/public.go` | `PublicProduct.Price` → `Money` |
| `internal/testutil/fixtures.go` | `CreateTestOrder` subtotal/tax/total → Money |

### IVA calculation rule

```go
var IVARate = decimal.NewFromFloat(0.19)

tax   = subtotal.Mul(IVARate).Round2()   // banker's rounding after multiply
total = subtotal.Add(tax)
```

### pgx compatibility

`decimal.Decimal` implements `encoding.TextMarshaler` (→ `"49999.99"`) and `TextUnmarshaler`
(← `[]byte("49999.99")`). pgx v5 uses the text protocol for `NUMERIC`/`DECIMAL` columns, so
these interfaces are automatically called during `Exec` (parameters) and `Scan` (results).
**No custom `Scan` or driver value method is needed.**

### JSON representation

`Money.MarshalJSON` emits `m.StringFixed(2)` directly as a raw number literal (not a quoted
string). This means JSON consumers (browser, integration tests) receive:

```json
{ "price": 15000.00 }   ✓
```

not:

```json
{ "price": "15000.00" }   ✗
```

Existing tests that assert `assert.Equal(t, float64(15000), data["price"])` continue to pass
because `json.Unmarshal` decodes unquoted `15000.00` as `float64(15000)`.

---

## Consequences

### Positive
- Exact decimal arithmetic for all financial calculations
- No floating-point rounding errors in IVA, totals, or line items
- PostgreSQL DECIMAL columns and Go types are semantically aligned
- Clean JSON API — monetary values come out as numbers, not strings

### Negative
- `shopspring/decimal` adds a dependency (~360 lines of code; BSD-2-Clause)
- Dashboard analytics fields (`TotalRevenue`, `RevenueToday`, etc.) remain `float64` because
  they are read-only aggregates used for display — no arithmetic is performed on them in Go

### Neutral
- No database migration required (columns were already `DECIMAL(12,2)`)
- Existing test assertions required no changes

---

## Alternatives Considered

| Alternative | Rejected because |
|-------------|-----------------|
| Keep `float64` | Rounding errors in tax and multi-item totals |
| Store cents as `int64` | Requires division everywhere; no natural decimal string ↔ DB mapping |
| Use `big.Rat` from stdlib | Verbose API; no pgx text protocol support; no JSON helpers |
