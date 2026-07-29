package models

import (
	"time"

	"github.com/google/uuid"
)

// OrderTimeline records status transitions for an order.
type OrderTimeline struct {
	ID            uuid.UUID  `json:"id"`
	OrderID       uuid.UUID  `json:"order_id"`
	Status        string     `json:"status"`
	ChangedBy     *uuid.UUID `json:"changed_by"`
	ChangedByName string     `json:"changed_by_name"`
	Notes         string     `json:"note"`
	CreatedAt     time.Time  `json:"created_at"`
}
