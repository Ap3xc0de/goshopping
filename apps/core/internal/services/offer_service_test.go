package services_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func strPtr(s string) *string { return &s }

func TestOfferService_CreateOffer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	svc := services.NewOfferService(app.DB)
	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	t.Run("creates a valid store-wide offer", func(t *testing.T) {
		offer, err := svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
			Name:          "Store Sale",
			DiscountType:  "percentage",
			DiscountValue: models.NewMoney(10),
		})
		require.NoError(t, err)
		assert.Equal(t, "Store Sale", offer.Name)
		assert.Equal(t, "store", offer.Scope, "scope should default to 'store'")
		assert.Equal(t, "active", offer.Status, "status should default to 'active'")
		assert.Equal(t, storeIDParsed, offer.StoreID)
		assert.NotEqual(t, uuid.Nil, offer.ID)
	})

	t.Run("creates a category-scoped offer with scope_value", func(t *testing.T) {
		offer, err := svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
			Name:          "Shoes Sale",
			DiscountType:  "fixed",
			DiscountValue: models.NewMoney(500),
			Scope:         "category",
			ScopeValue:    strPtr("shoes"),
		})
		require.NoError(t, err)
		require.NotNil(t, offer.ScopeValue)
		assert.Equal(t, "shoes", *offer.ScopeValue)
	})

	t.Run("rejects category scope without scope_value and does not persist", func(t *testing.T) {
		_, err := svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
			Name:          "Bad Offer",
			DiscountType:  "percentage",
			DiscountValue: models.NewMoney(10),
			Scope:         "category",
		})
		require.Error(t, err)
		var verr models.ValidationErrors
		require.ErrorAs(t, err, &verr)

		result, err := svc.ListOffers(context.Background(), storeIDParsed, 1, 50)
		require.NoError(t, err)
		for _, o := range result.Offers {
			assert.NotEqual(t, "Bad Offer", o.Name, "invalid offer must not be persisted")
		}
	})

	t.Run("rejects percentage over 100", func(t *testing.T) {
		_, err := svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
			Name:          "Too Much",
			DiscountType:  "percentage",
			DiscountValue: models.NewMoney(150),
		})
		require.Error(t, err)
	})
}

func TestOfferService_GetOffer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	svc := services.NewOfferService(app.DB)
	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	created, err := svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
		Name:          "Findable",
		DiscountType:  "percentage",
		DiscountValue: models.NewMoney(15),
	})
	require.NoError(t, err)

	t.Run("returns the offer scoped to the store", func(t *testing.T) {
		got, err := svc.GetOffer(context.Background(), storeIDParsed, created.ID)
		require.NoError(t, err)
		assert.Equal(t, created.ID, got.ID)
		assert.Equal(t, "Findable", got.Name)
	})

	t.Run("returns ErrOfferNotFound for unknown id", func(t *testing.T) {
		_, err := svc.GetOffer(context.Background(), storeIDParsed, uuid.New())
		assert.ErrorIs(t, err, services.ErrOfferNotFound)
	})

	t.Run("returns ErrOfferNotFound when offer belongs to a different store", func(t *testing.T) {
		_, _, otherStoreID := app.OwnerAuthHeader(t)
		_, err := svc.GetOffer(context.Background(), uuid.MustParse(otherStoreID), created.ID)
		assert.ErrorIs(t, err, services.ErrOfferNotFound)
	})
}

func TestOfferService_ListOffers(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	svc := services.NewOfferService(app.DB)
	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	t.Run("empty store returns empty list with pagination fields", func(t *testing.T) {
		result, err := svc.ListOffers(context.Background(), storeIDParsed, 1, 20)
		require.NoError(t, err)
		assert.Equal(t, int64(0), result.Total)
		assert.Equal(t, 1, result.Page)
		assert.Equal(t, 20, result.PerPage)
		assert.Empty(t, result.Offers)
	})

	t.Run("lists offers scoped to the store only", func(t *testing.T) {
		_, err := svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
			Name: "Mine", DiscountType: "percentage", DiscountValue: models.NewMoney(10),
		})
		require.NoError(t, err)

		_, _, otherStoreID := app.OwnerAuthHeader(t)
		_, err = svc.CreateOffer(context.Background(), uuid.MustParse(otherStoreID), models.CreateOfferRequest{
			Name: "Not Mine", DiscountType: "percentage", DiscountValue: models.NewMoney(10),
		})
		require.NoError(t, err)

		result, err := svc.ListOffers(context.Background(), storeIDParsed, 1, 20)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total)
		require.Len(t, result.Offers, 1)
		assert.Equal(t, "Mine", result.Offers[0].Name)
	})
}

func TestOfferService_UpdateOffer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	svc := services.NewOfferService(app.DB)
	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	created, err := svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
		Name:          "Original",
		DiscountType:  "percentage",
		DiscountValue: models.NewMoney(10),
	})
	require.NoError(t, err)

	t.Run("partial update changes only provided fields", func(t *testing.T) {
		newName := "Updated"
		updated, err := svc.UpdateOffer(context.Background(), storeIDParsed, created.ID, models.UpdateOfferRequest{
			Name: &newName,
		})
		require.NoError(t, err)
		assert.Equal(t, "Updated", updated.Name)
		assert.Equal(t, "percentage", updated.DiscountType, "untouched fields must be preserved")
	})

	t.Run("returns ErrOfferNotFound for unknown id", func(t *testing.T) {
		newName := "Nope"
		_, err := svc.UpdateOffer(context.Background(), storeIDParsed, uuid.New(), models.UpdateOfferRequest{Name: &newName})
		assert.ErrorIs(t, err, services.ErrOfferNotFound)
	})

	t.Run("rejects update that violates invariants without persisting", func(t *testing.T) {
		badType := "bogus"
		_, err := svc.UpdateOffer(context.Background(), storeIDParsed, created.ID, models.UpdateOfferRequest{
			DiscountType: &badType,
		})
		require.Error(t, err)

		got, err := svc.GetOffer(context.Background(), storeIDParsed, created.ID)
		require.NoError(t, err)
		assert.Equal(t, "percentage", got.DiscountType, "invalid update must not persist")
	})

	t.Run("cannot update another store's offer", func(t *testing.T) {
		_, _, otherStoreID := app.OwnerAuthHeader(t)
		newName := "Hijacked"
		_, err := svc.UpdateOffer(context.Background(), uuid.MustParse(otherStoreID), created.ID, models.UpdateOfferRequest{Name: &newName})
		assert.ErrorIs(t, err, services.ErrOfferNotFound)
	})
}

func TestOfferService_DeleteOffer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	svc := services.NewOfferService(app.DB)
	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	created, err := svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
		Name:          "Doomed",
		DiscountType:  "percentage",
		DiscountValue: models.NewMoney(10),
	})
	require.NoError(t, err)

	t.Run("deletes the offer", func(t *testing.T) {
		require.NoError(t, svc.DeleteOffer(context.Background(), storeIDParsed, created.ID))

		_, err := svc.GetOffer(context.Background(), storeIDParsed, created.ID)
		assert.ErrorIs(t, err, services.ErrOfferNotFound)
	})

	t.Run("deleting again returns ErrOfferNotFound", func(t *testing.T) {
		err := svc.DeleteOffer(context.Background(), storeIDParsed, created.ID)
		assert.ErrorIs(t, err, services.ErrOfferNotFound)
	})
}

func TestOfferService_ListActiveOffers(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	svc := services.NewOfferService(app.DB)
	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	past := time.Now().Add(-24 * time.Hour)
	future := time.Now().Add(24 * time.Hour)

	active, err := svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
		Name: "Active Now", DiscountType: "percentage", DiscountValue: models.NewMoney(10),
	})
	require.NoError(t, err)

	_, err = svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
		Name: "Expired", DiscountType: "percentage", DiscountValue: models.NewMoney(10),
		EndsAt: &past,
	})
	require.NoError(t, err)

	_, err = svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
		Name: "Not Started", DiscountType: "percentage", DiscountValue: models.NewMoney(10),
		StartsAt: &future,
	})
	require.NoError(t, err)

	inactiveStatus := "inactive"
	_, err = svc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
		Name: "Disabled", DiscountType: "percentage", DiscountValue: models.NewMoney(10),
		Status: inactiveStatus,
	})
	require.NoError(t, err)

	t.Run("returns only offers active right now", func(t *testing.T) {
		offers, err := svc.ListActiveOffers(context.Background(), storeIDParsed)
		require.NoError(t, err)
		require.Len(t, offers, 1)
		assert.Equal(t, active.Name, offers[0].Name)
	})

	t.Run("returns empty slice for a store with no offers", func(t *testing.T) {
		_, _, otherStoreID := app.OwnerAuthHeader(t)
		offers, err := svc.ListActiveOffers(context.Background(), uuid.MustParse(otherStoreID))
		require.NoError(t, err)
		assert.Empty(t, offers)
	})
}
