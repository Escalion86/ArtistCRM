# Unlinked Transactions Design

Date: 2026-06-19.
Project: ArtistCRM.

## Goal

Allow activity-related transactions that are not linked to an event and may also have no client. Examples include props, fuel, materials, and other operating costs. These transactions must still affect monthly profit in the month of the transaction date.

## Data Model

Transactions keep the existing collection and fields. `eventId` and `clientId` become optional references with `null` as the empty value.

Rules:

- A transaction may be linked to both event and client.
- A transaction may be linked only to a client.
- A transaction may be linked to neither event nor client.
- When an event is selected, the server keeps the existing event validation and uses the event client when available.
- Amount, type, category, date, comment, and payment method keep their current behavior.

## API

`POST /api/transactions` accepts missing or empty `eventId` and `clientId`.

If `eventId` is present:

- validate the event belongs to the tenant;
- reject draft events as before;
- use the event client when available;
- validate the final client if one exists.

If `eventId` is absent:

- store `eventId: null`;
- store `clientId: null` unless a valid client was selected;
- validate the selected client when present.

`PUT /api/transactions/:id` supports clearing `eventId` and `clientId` by sending an empty value or `null`. It applies the same validation rules as create.

## Transactions UI

The transaction modal keeps the existing relation pickers but no longer requires event or client. Users can create a transaction with no relation. Selected event and selected client can be cleared.

The transactions page adds a second toggle group next to the existing income/expense filter:

- linked: transactions with an event or client;
- unlinked: transactions without both event and client.

The toggle uses the same interaction pattern as the existing income/expense filter and never leaves both options disabled.

Transaction cards show neutral fallback text for missing relations:

- `Без клиента`;
- `Без мероприятия`.

## Statistics

Statistics include unlinked transactions in the selected year by `transaction.date`.

Filtering behavior:

- Linked transactions continue to follow their linked event filters.
- Unlinked transactions are included only when no town filter is selected, because they have no event address.
- Unlinked transactions affect totals, category summaries, the monthly chart, CSV export, and month details.
- In month details, unlinked transactions are listed in "Транзакции месяца" and are not assigned to any event.

Monthly profit calculation:

- income increases the month profit;
- expense decreases the month profit;
- the transaction month comes from `transaction.date`.

## Tests

Add or update focused tests for:

- statistics chart includes unlinked transactions by transaction date;
- month details include unlinked transactions by transaction date;
- API create/update allows transactions with no event and no client.

