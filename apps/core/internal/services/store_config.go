package services

import (
	"encoding/json"

	"github.com/goshopping/core/internal/models"
)

// DefaultCurrency is the currency assumed when a store's config does not set
// one (store-currency REQ: USD is the only currency, default when omitted).
const DefaultCurrency = "USD"

// ResolveStoreCurrency parses a store's raw config JSONB and returns its
// currency, defaulting to DefaultCurrency when the config is empty, absent,
// malformed, or does not set currency. Pure function — no DB access.
func ResolveStoreCurrency(configJSON []byte) string {
	if len(configJSON) == 0 {
		return DefaultCurrency
	}
	var cfg models.StoreConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return DefaultCurrency
	}
	if cfg.Currency == "" {
		return DefaultCurrency
	}
	return cfg.Currency
}
