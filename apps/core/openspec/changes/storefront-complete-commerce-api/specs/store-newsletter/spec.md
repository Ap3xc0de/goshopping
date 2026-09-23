# store-newsletter Specification

## Purpose

Self-contained newsletter capture: a `newsletter_subscribers` table and a public subscribe endpoint. No provider integration in this change. Applies to both route groups.

## Requirements

### Requirement: Subscriber Storage

The system MUST store subscribers in `newsletter_subscribers` (`id`, `store_id` FK → `stores` ON DELETE CASCADE, `email` VARCHAR(255) NOT NULL, `status` CHECK `subscribed|unsubscribed` DEFAULT `subscribed`, `created_at`), store-scoped with UNIQUE(`store_id`, `email`).

#### Scenario: Row created

- GIVEN store S
- WHEN someone subscribes with `owner@example.com`
- THEN a row exists with `email='owner@example.com'`, `status='subscribed'`

### Requirement: Public Subscribe Endpoint

The system MUST expose `POST /newsletter` accepting `{"email": "..."}`. The email SHALL be validated (format) — invalid → 400. MUST NOT raise on a duplicate: an already-subscribed `(store_id, email)` returns 409 (idempotent duplicate) rather than a second row. The system SHOULD rate-limit submissions per IP/email (429 on excess). No email provider SHALL be called in this change.

#### Scenario: New subscriber

- GIVEN email not yet subscribed
- WHEN POST `/newsletter` with `{"email":"new@example.com"}`
- THEN 201 and one row inserted

#### Scenario: Duplicate email

- GIVEN `dup@example.com` already subscribed on store S
- WHEN POST `/newsletter` with the same email
- THEN 409 and the row count is unchanged

#### Scenario: Invalid email

- GIVEN payload `{"email":"not-an-email"}`
- WHEN POST `/newsletter`
- THEN 400 with an error naming the invalid field
