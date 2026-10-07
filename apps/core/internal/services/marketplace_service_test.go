package services

import "testing"

func TestNormalizeMarketplacePaging(t *testing.T) {
	tests := []struct {
		name              string
		page, perPage     int
		wantPage, wantPer int
	}{
		{"defaults for zero values", 0, 0, 1, 20},
		{"negative values fall back", -3, -1, 1, 20},
		{"valid values kept", 3, 10, 3, 10},
		{"per_page capped at 50", 1, 500, 1, 50},
		{"per_page at cap kept", 2, 50, 2, 50},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotPage, gotPer := normalizeMarketplacePaging(tt.page, tt.perPage)
			if gotPage != tt.wantPage || gotPer != tt.wantPer {
				t.Fatalf("got (%d,%d), want (%d,%d)", gotPage, gotPer, tt.wantPage, tt.wantPer)
			}
		})
	}
}

func TestMarketplaceTotalPages(t *testing.T) {
	tests := []struct {
		total   int64
		perPage int
		want    int
	}{
		{0, 20, 0},
		{1, 20, 1},
		{20, 20, 1},
		{21, 20, 2},
		{101, 50, 3},
	}
	for _, tt := range tests {
		if got := marketplaceTotalPages(tt.total, tt.perPage); got != tt.want {
			t.Errorf("total=%d perPage=%d: got %d, want %d", tt.total, tt.perPage, got, tt.want)
		}
	}
}

func TestEscapeLike(t *testing.T) {
	if got := escapeLike(`50%_off\sale`); got != `50\%\_off\\sale` {
		t.Fatalf("got %q", got)
	}
}
