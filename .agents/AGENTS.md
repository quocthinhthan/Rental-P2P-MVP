# Ignored / Out-of-Scope Directories

The repository contains a `mobile/` directory for the Flutter mobile app.

This directory is owned by another teammate and is OUT OF SCOPE for this agent.

Agents must NOT:
- read files inside `mobile/` unless explicitly instructed
- modify files inside `mobile/`
- refactor, rename, move, delete, or format anything inside `mobile/`
- include `mobile/` in broad code changes, searches, lint fixes, or cleanup tasks

All current work should focus only on the web/backend MVP unless the user explicitly says otherwise.

# Rental P2P MVP - Repository Context

This repository is a web platform for peer-to-peer personal item rentals. Users can act as both renters and owners.

Use this file as persistent project context. The existing frontend UI and API integrations are mostly implemented and working. Do not rewrite large flows, introduce new architecture, or replace established patterns unless the user explicitly asks for that.

## Working Principles

- Preserve the current UI and behavior as much as possible.
- Make the smallest focused change that satisfies the request.
- Reuse existing components, modals, toasts, auth helpers, API client utilities, and styling patterns.
- Inspect existing frontend patterns before adding new code.
- Inspect backend routes, controllers, services, models, and middleware before changing API integration.
- Treat the backend as the source of truth for rental status, authorization, required fields, and payload shape.
- Do not guess API payloads, response fields, status names, or role permissions.
- Avoid creating new architectural layers unless an existing pattern clearly requires it.
- Keep unrelated refactors out of task-specific changes.

## Core Rental Flow

The rental lifecycle is:

1. Renter creates a rental request.
2. Renter pays a deposit through the mock VNPay flow.
3. Owner confirms the rental.
4. Backend automatically creates an electronic contract.
5. Renter and owner both sign the contract.
6. Pickup is recorded with proof images.
7. Return is recorded with proof images.
8. Rental is completed.

## Business Rules

- Pickup is allowed only after the contract is fully signed.
- Pickup requires `pickupImages`.
- Completion requires `returnImages`.
- Backend authorization rules decide which user can perform each action.
- Frontend should display and submit data according to backend state, not local assumptions.
- Rental statuses must be verified from backend implementation before conditional UI or API changes.

## Important APIs

Verify the exact implementation before using or modifying these endpoints:

- `PATCH /api/rentals/{id}/confirm`
- `POST /api/upload`
- `POST /api/rentals/{id}/sign-contract`
- `PATCH /api/rentals/{id}/pickup`
- `PATCH /api/rentals/{id}/complete`

When touching these APIs from the frontend:

- Read the matching backend route first.
- Trace from route to controller and service.
- Confirm request body names, response shape, validation, status transitions, and role checks.
- Check existing frontend API client conventions before adding calls.
- Keep the integration consistent with the current auth/token handling and error/toast behavior.

## Frontend Expectations

- Keep the current screens and layout intact unless the user requests UI redesign.
- Reuse existing components and modal patterns.
- Reuse existing toast and error handling patterns.
- Reuse the current authenticated API client.
- Prefer editing the narrowest existing file over creating new files.
- Do not duplicate rental state logic if an existing helper or page already handles it.
- Do not hardcode status transitions without verifying backend behavior.

## Backend Expectations

- Backend is authoritative for rental status transitions.
- Backend is authoritative for user permissions and ownership checks.
- Backend is authoritative for required proof images.
- Backend contract generation after owner confirmation is expected behavior.
- Before frontend changes, inspect backend implementation for the relevant action.

## Safe Change Checklist

Before changing rental-related frontend behavior:

1. Find the relevant backend route.
2. Read the controller/service logic.
3. Verify allowed roles and status requirements.
4. Verify required payload fields and upload format.
5. Inspect existing frontend API and UI patterns.
6. Make the smallest compatible change.
7. Run the most relevant available checks.

