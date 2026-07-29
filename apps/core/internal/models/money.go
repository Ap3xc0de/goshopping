package models

import (
	"strings"

	"github.com/shopspring/decimal"
)

// Money wraps decimal.Decimal for exact monetary arithmetic.
// Serializes to JSON as a number (49999.99), not as a string ("49999.99").
// Compatible with PostgreSQL DECIMAL(12,2) via pgx (uses TextUnmarshaler/TextMarshaler).
type Money struct {
	decimal.Decimal
}

// NewMoney creates a Money value from a float64.
// Only use this for tests and hardcoded values — prefer NewMoneyFromString for precision.
func NewMoney(value float64) Money {
	return Money{decimal.NewFromFloat(value)}
}

// NewMoneyFromString creates a Money value from a decimal string (e.g. "49999.99").
func NewMoneyFromString(value string) (Money, error) {
	d, err := decimal.NewFromString(value)
	if err != nil {
		return Money{}, err
	}
	return Money{d}, nil
}

// MoneyZero returns Money with value 0.
func MoneyZero() Money {
	return Money{decimal.Zero}
}

// MarshalJSON serializes as a JSON number with 2 decimal places.
// Example: Money{49999.99} → 49999.99  (not "49999.99")
func (m Money) MarshalJSON() ([]byte, error) {
	return []byte(m.StringFixed(2)), nil
}

// UnmarshalJSON accepts both JSON number (59900) and JSON string ("59900") as input.
func (m *Money) UnmarshalJSON(data []byte) error {
	str := strings.Trim(string(data), "\"")
	if str == "" || str == "null" {
		m.Decimal = decimal.Zero
		return nil
	}
	d, err := decimal.NewFromString(str)
	if err != nil {
		return err
	}
	m.Decimal = d
	return nil
}

// Add returns a new Money equal to m + other.
func (m Money) Add(other Money) Money {
	return Money{m.Decimal.Add(other.Decimal)}
}

// Sub returns a new Money equal to m - other.
func (m Money) Sub(other Money) Money {
	return Money{m.Decimal.Sub(other.Decimal)}
}

// Mul returns a new Money equal to m × d.
func (m Money) Mul(d decimal.Decimal) Money {
	return Money{m.Decimal.Mul(d)}
}

// MulInt returns a new Money equal to m × n.
func (m Money) MulInt(n int) Money {
	return Money{m.Decimal.Mul(decimal.NewFromInt(int64(n)))}
}

// Round2 returns a new Money rounded to 2 decimal places (banker's rounding).
func (m Money) Round2() Money {
	return Money{m.Decimal.Round(2)}
}

// IsPositive reports whether m > 0.
func (m Money) IsPositive() bool {
	return m.Decimal.GreaterThan(decimal.Zero)
}

// IsNegative reports whether m < 0.
func (m Money) IsNegative() bool {
	return m.Decimal.LessThan(decimal.Zero)
}
