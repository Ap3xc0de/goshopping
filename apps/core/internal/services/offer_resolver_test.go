package services_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// idFor returns a deterministic UUID for tests that need to control ID
// ordering (tie-break assertions), without relying on random uuid.New().
func idFor(n byte) uuid.UUID {
	var id uuid.UUID
	id[15] = n
	return id
}

func offerFixture(id uuid.UUID, name, discountType string, discountValue float64, scope string, scopeValue *string) models.Offer {
	return models.Offer{
		ID:            id,
		Name:          name,
		DiscountType:  discountType,
		DiscountValue: models.NewMoney(discountValue),
		Scope:         scope,
		ScopeValue:    scopeValue,
		Status:        "active",
	}
}

func TestResolveOffer(t *testing.T) {
	now := time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC)
	past := now.Add(-24 * time.Hour)
	future := now.Add(24 * time.Hour)

	productID := idFor(1)
	otherProductID := idFor(2)
	category := "shoes"
	otherCategory := "hats"
	listPrice := models.NewMoney(100)

	t.Run("no offers resolves to nil", func(t *testing.T) {
		got := services.ResolveOffer(nil, productID, category, listPrice, now)
		assert.Nil(t, got)
	})

	t.Run("only a store offer applies", func(t *testing.T) {
		store := offerFixture(idFor(10), "store-wide", "percentage", 10, "store", nil)
		got := services.ResolveOffer([]models.Offer{store}, productID, category, listPrice, now)
		require.NotNil(t, got)
		assert.Equal(t, "store-wide", got.Name)
	})

	t.Run("only a matching category offer applies", func(t *testing.T) {
		cat := offerFixture(idFor(11), "category-match", "percentage", 10, "category", &category)
		got := services.ResolveOffer([]models.Offer{cat}, productID, category, listPrice, now)
		require.NotNil(t, got)
		assert.Equal(t, "category-match", got.Name)
	})

	t.Run("non-matching category offer is ignored", func(t *testing.T) {
		cat := offerFixture(idFor(12), "category-mismatch", "percentage", 10, "category", &otherCategory)
		got := services.ResolveOffer([]models.Offer{cat}, productID, category, listPrice, now)
		assert.Nil(t, got)
	})

	t.Run("only a matching product offer applies", func(t *testing.T) {
		pid := productID.String()
		prod := offerFixture(idFor(13), "product-match", "percentage", 10, "product", &pid)
		got := services.ResolveOffer([]models.Offer{prod}, productID, category, listPrice, now)
		require.NotNil(t, got)
		assert.Equal(t, "product-match", got.Name)
	})

	t.Run("non-matching product offer is ignored", func(t *testing.T) {
		otherPid := otherProductID.String()
		prod := offerFixture(idFor(14), "product-mismatch", "percentage", 10, "product", &otherPid)
		got := services.ResolveOffer([]models.Offer{prod}, productID, category, listPrice, now)
		assert.Nil(t, got)
	})

	t.Run("product offer wins over category offer even with a smaller discount", func(t *testing.T) {
		pid := productID.String()
		prod := offerFixture(idFor(20), "product-5pct", "percentage", 5, "product", &pid)
		cat := offerFixture(idFor(21), "category-50pct", "percentage", 50, "category", &category)
		got := services.ResolveOffer([]models.Offer{cat, prod}, productID, category, listPrice, now)
		require.NotNil(t, got)
		assert.Equal(t, "product-5pct", got.Name, "product scope must win regardless of discount size")

		effective := services.ApplyOffer(listPrice, got)
		assert.True(t, models.NewMoney(95).Decimal.Equal(effective.Decimal), "want 95, got %s", effective.String())
	})

	t.Run("category offer wins over store offer", func(t *testing.T) {
		cat := offerFixture(idFor(30), "category-offer", "percentage", 10, "category", &category)
		store := offerFixture(idFor(31), "store-offer", "percentage", 50, "store", nil)
		got := services.ResolveOffer([]models.Offer{store, cat}, productID, category, listPrice, now)
		require.NotNil(t, got)
		assert.Equal(t, "category-offer", got.Name)
	})

	t.Run("same specificity picks the larger computed discount", func(t *testing.T) {
		small := offerFixture(idFor(40), "store-10pct", "percentage", 10, "store", nil)
		big := offerFixture(idFor(41), "store-30pct", "percentage", 30, "store", nil)
		got := services.ResolveOffer([]models.Offer{small, big}, productID, category, listPrice, now)
		require.NotNil(t, got)
		assert.Equal(t, "store-30pct", got.Name)
	})

	t.Run("exact tie is resolved deterministically by lowest ID", func(t *testing.T) {
		lower := offerFixture(idFor(1), "lower-id", "percentage", 10, "store", nil)
		higher := offerFixture(idFor(2), "higher-id", "percentage", 10, "store", nil)
		got1 := services.ResolveOffer([]models.Offer{higher, lower}, productID, category, listPrice, now)
		got2 := services.ResolveOffer([]models.Offer{lower, higher}, productID, category, listPrice, now)
		require.NotNil(t, got1)
		require.NotNil(t, got2)
		assert.Equal(t, "lower-id", got1.Name, "order in input slice must not affect the deterministic winner")
		assert.Equal(t, "lower-id", got2.Name)
	})

	t.Run("expired offer (ends_at in the past) does not apply", func(t *testing.T) {
		expired := offerFixture(idFor(50), "expired", "percentage", 10, "store", nil)
		expired.EndsAt = &past
		got := services.ResolveOffer([]models.Offer{expired}, productID, category, listPrice, now)
		assert.Nil(t, got)
	})

	t.Run("not-yet-started offer (starts_at in the future) does not apply", func(t *testing.T) {
		notStarted := offerFixture(idFor(51), "not-started", "percentage", 10, "store", nil)
		notStarted.StartsAt = &future
		got := services.ResolveOffer([]models.Offer{notStarted}, productID, category, listPrice, now)
		assert.Nil(t, got)
	})

	t.Run("inactive offer does not apply", func(t *testing.T) {
		inactive := offerFixture(idFor(52), "inactive", "percentage", 10, "store", nil)
		inactive.Status = "inactive"
		got := services.ResolveOffer([]models.Offer{inactive}, productID, category, listPrice, now)
		assert.Nil(t, got)
	})
}

func TestApplyOffer(t *testing.T) {
	listPrice := models.NewMoney(100)

	t.Run("nil offer returns the list price unchanged", func(t *testing.T) {
		effective := services.ApplyOffer(listPrice, nil)
		assert.True(t, listPrice.Decimal.Equal(effective.Decimal))
	})

	t.Run("percentage discount reduces price proportionally", func(t *testing.T) {
		offer := offerFixture(idFor(1), "10pct", "percentage", 10, "store", nil)
		effective := services.ApplyOffer(listPrice, &offer)
		assert.True(t, models.NewMoney(90).Decimal.Equal(effective.Decimal), "want 90, got %s", effective.String())
	})

	t.Run("fixed discount larger than price floors at 0", func(t *testing.T) {
		offer := offerFixture(idFor(2), "fixed-150", "fixed", 150, "store", nil)
		effective := services.ApplyOffer(listPrice, &offer)
		assert.True(t, models.MoneyZero().Decimal.Equal(effective.Decimal), "want 0, got %s", effective.String())
	})

	t.Run("percentage 100 zeroes out the price", func(t *testing.T) {
		offer := offerFixture(idFor(3), "100pct", "percentage", 100, "store", nil)
		effective := services.ApplyOffer(listPrice, &offer)
		assert.True(t, models.MoneyZero().Decimal.Equal(effective.Decimal), "want 0, got %s", effective.String())
	})
}
