---
name: dispute-flow
description: Rental P2P MVP dispute and complaint workflow guidance. Use when Codex needs to design, implement, review, or update dispute handling, complaint escalation, admin resolution, escrow/refund behavior, user penalties, or frontend dispute UI for rentals in this repository.
---

# Dispute Flow

Use this skill when working on the Rental P2P MVP dispute/khiếu nại flow. Preserve existing project enums and schemas where possible, and map the business rules below onto the current codebase instead of inventing unrelated states.

## Goals

Design dispute handling to:

- Protect both renter and owner from fraud, damage, no-show, late return, false reports, and payment conflicts.
- Freeze the rental transaction as soon as a dispute is opened.
- Give both sides a mediation window to self-resolve before Admin intervention.
- Escalate to Admin only when needed.
- Let Admin decide the outcome and trigger the correct escrow/refund/payout behavior.
- Apply progressive penalties based on severity and repeat behavior.

## Standard Flow

1. A renter or owner creates a dispute for a rental.
2. The system validates that the reporter belongs to the rental.
3. The system rejects duplicate active disputes for the same rental.
4. The system stores the rental and item states before freezing:
   - `previousRentalStatus`
   - `previousItemStatus`
5. The rental moves to `DISPUTED` or the project-equivalent disputed status.
6. The system freezes sensitive rental, item, signature, and payment actions.
7. Both parties get 48 hours to self-mediate.
8. During mediation, the reporter may withdraw the dispute if it is not resolved.
9. After `mediationEndsAt`, the UI may show `Yeu cau Admin can thiep`.
10. When a user escalates, the dispute moves into an Admin-needed state.
11. Admin reviews the reason, evidence, rental context, and user history.
12. Admin resolves the dispute with `winner`, `adminDecision`, optional penalty, and money-flow outcome.
13. The rental exits `DISPUTED` according to the result. Never leave a resolved rental stuck in `DISPUTED`.

Example state progression:

```text
confirmed -> disputed -> completed
confirmed -> disputed -> cancelled
in_progress -> disputed -> completed
in_progress -> disputed -> previousRentalStatus
```

## User APIs

Implement or preserve these user-facing APIs:

- `POST /api/disputes`
  - Create a dispute.
  - Required core fields: `rentalId`, `reason`.
  - Optional fields: `evidenceImages`.
  - Derive `reporterId` from authenticated user, not request body.

- `PATCH /api/disputes/:id/withdraw`
  - Withdraw an unresolved dispute.
  - Only the reporter may withdraw.
  - Restore rental and item state when appropriate.

- `PATCH /api/disputes/:id/escalate`
  - Proposed API.
  - Allow renter or owner of the rental to request Admin intervention.
  - Only allow after `mediationEndsAt` or at least 48 hours after `createdAt`.
  - Set `escalatedAt`, `escalatedBy`, and a status that Admin queues can filter.

## Admin APIs

Implement or preserve these Admin-facing APIs:

- `GET /api/disputes`
  - List disputes for Admin review.
  - Support filtering by `status`, especially pending/escalated/admin-needed states.
  - Include rental, renter, owner, item, reporter, evidence, and timing context when available.

- `PATCH /api/disputes/:id/resolve`
  - Resolve a pending or escalated dispute.
  - Accept `adminDecision`, `winner`, optional `penalizeUserId`, and `penaltyType`.
  - Derive `resolvedBy` from authenticated Admin.
  - Set `resolvedAt`.

## Business Rules

- Only the renter or owner of the rental may create a dispute.
- Do not allow a new dispute if the rental already has an active dispute in `pending`, `escalated`, or any Admin-needed state.
- When a rental is `DISPUTED`, block user actions that can mutate the transaction, including:
  - pickup
  - complete
  - confirm
  - reject
  - sign, if signing would advance the rental
  - payment actions, refund actions, payout actions, or escrow release actions unless explicitly performed by Admin resolution logic
- Only the reporter may withdraw.
- Only allow withdraw while the dispute is not resolved.
- Only allow escalation after 48 hours from `createdAt` or after `mediationEndsAt`.
- Admin may resolve both pending and escalated disputes, but Admin UI should prioritize escalated disputes.
- Always store enough previous state to avoid losing where the rental and item came from.
- Always make resolution idempotent where possible: repeated resolve requests should not double-refund, double-payout, or double-penalize.

## Dispute Status Semantics

Use existing enums where they already exist. If adding or normalizing statuses, prefer:

- `pending`: Dispute is open and in the self-mediation window.
- `escalated`: A party requested Admin intervention, or mediation time expired and Admin review is needed.
- `resolved`: Admin has made a final decision.
- `withdrawn`: Reporter withdrew the complaint before final resolution.

Keep rental status separate from dispute status:

```text
rental.status = DISPUTED
dispute.status = pending | escalated | resolved | withdrawn
```

## Winner Semantics

`winner` has exactly three business meanings:

- `renter`: Renter wins. Usually refund the renter and cancel or refund the rental.
- `owner`: Owner wins. Usually complete the rental and release payout to owner.
- `none`: No side clearly wins, evidence is insufficient, both sides self-settle, or Admin rejects the complaint without assigning a winner.

Do not infer `winner` only from `penaltyType`. A user can win while still receiving a warning for separate behavior, and `winner = none` can have no penalty.

## Penalty Semantics

`penaltyType` has exactly four business meanings:

- `none`: No penalty.
- `warning`: Warn the user and reduce `trustScore` according to project policy.
- `suspension`: Temporarily suspend the user by setting `suspendedUntil`.
- `ban`: Permanently ban the user by setting `isBanned = true`.

Apply penalties progressively. A suggested escalation path is:

```text
first minor issue -> warning
repeated or serious issue -> suspension
fraud, dangerous abuse, or repeated severe issue -> ban
```

Use `penalizeUserId` to identify the punished user. Validate that the penalized user is related to the dispute unless Admin policy explicitly allows otherwise.

## Resolve Rules

When `winner = renter`:

- Set `paymentStatus = REFUNDED` if payment was captured and refund is valid for the current escrow state.
- Set `rental.status = CANCELLED` or `REFUNDED`, depending on the existing enum.
- Set `item.status = AVAILABLE`.
- Do not release payout to owner.
- Apply penalty to owner only when `penalizeUserId` and `penaltyType` require it.

When `winner = owner`:

- Set `rental.status = COMPLETED`.
- Set `item.status = AVAILABLE`.
- Release payout to owner if the escrow/payment model supports it.
- Do not refund renter unless project-specific payment logic requires a partial settlement.
- Apply penalty to renter only when `penalizeUserId` and `penaltyType` require it.

When `winner = none`:

- Do not process refund or payout by default.
- Do not penalize anyone when `penaltyType = none`.
- Set `rental.status = previousRentalStatus`.
- Set `item.status = previousItemStatus`.
- Ensure the rental is no longer `DISPUTED`.

Example:

```text
previousRentalStatus = in_progress
previousItemStatus = rented
winner = none
=> rental.status = in_progress
=> item.status = rented
=> dispute.status = resolved
```

## Data Model Guidance

The existing `Dispute` collection may be reused for MVP. Prefer extending it before creating new tables or collections.

Existing fields:

- `rentalId`
- `reporterId`
- `reason`
- `evidenceImages`
- `status`
- `adminDecision`

Recommended fields:

- `previousRentalStatus`
- `previousItemStatus`
- `mediationEndsAt`
- `escalatedAt`
- `escalatedBy`
- `winner`
- `penalizeUserId`
- `penaltyType`
- `resolvedBy`
- `resolvedAt`

Recommended creation defaults:

```text
status = pending
mediationEndsAt = createdAt + 48 hours
winner = null
penaltyType = none
resolvedAt = null
```

## Frontend Rules

When `rental.status === DISPUTED`:

- Show a `Dang tranh chap` badge.
- Disable action buttons that can advance, cancel, sign, complete, confirm, reject, pickup, pay, refund, or release payout outside the dispute flow.
- Show dispute reason and evidence when available.
- Show `Rut khieu nai` only to the reporter while `dispute.status = pending`.
- Show `Yeu cau Admin can thiep` only after `mediationEndsAt`.
- Show clear pending/escalated/resolved state labels without implying Admin has ruled before resolution.

Admin resolution form should include:

- `adminDecision`
- `winner`
- `penalizeUserId`
- `penaltyType`

## Implementation Notes

- Use database transactions or equivalent guarded updates when freezing rental state, resolving payments, and applying penalties.
- Avoid status string drift. Reuse project constants/enums for `DISPUTED`, `CANCELLED`, `COMPLETED`, `REFUNDED`, and payment statuses.
- Keep money movement centralized in payment/escrow services if such services exist.
- Treat evidence images as supporting material, not proof by themselves.
- Log Admin decisions with `resolvedBy` and `resolvedAt` for auditability.
- Do not let withdraw, escalate, and resolve race each other. Re-check dispute status immediately before mutation.
