# Ignored / Out-of-Scope Directories

The repository contains a `mobile/` directory for the Flutter mobile app.

This directory is owned by another teammate and is OUT OF SCOPE for this agent.
This project do not use docker to run (ignore docker files)
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
- Item violation reporting: A user can only report a specific item once. Item reports require at least a 10-character description and support up to 3 evidence images (each <= 5MB, format: .jpg, .jpeg, .png, .webp, .gif).
- Admin report adjustments: Once a report is resolved, the original owner penalties/actions (e.g. warnings, trust score deductions) are preserved to keep penalty history consistent. Any subsequent adjustments from the admin reports page only toggle the product's active status (AVAILABLE vs DELISTED) by calling `updateAdminItemStatus` instead of modifying the report action.


## Important APIs

Verify the exact implementation before using or modifying these endpoints:

- `PATCH /api/rentals/{id}/confirm`
- `POST /api/upload`
- `POST /api/rentals/{id}/sign-contract`
- `PATCH /api/rentals/{id}/pickup`
- `PATCH /api/rentals/{id}/complete`
- `POST /api/items/{id}/report` (Submit product violation report)
- `GET /api/admin/item-reports` (Admin get violation reports list)
- `PATCH /api/admin/item-reports/{reportId}/resolve` (Admin resolve violation report)

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
- TrustScore is a 0-100 reliability/risk score, not review stars. Keep review aggregates in `averageRating` and `totalReviews`, derive `trustLevel` from `trustScore`, and use `backend/services/trustScore.service.js` for recalculation.
- Do not directly add/subtract `trustScore` in controllers. Persist source events such as public reviews, completed rentals, resolved disputes, item report actions, eKYC changes, or admin account status changes, then call `recalculateUserTrustScore`.
- Public user summaries should avoid sensitive fields. `GET /api/users/:id/profile` returns safe profile, trust/rating fields, public reviews, and public owner items.

## Description Formatting & Security

- **WYSIWYG Formatting:** Item descriptions use the premium **CKEditor 5** (Classic Build) editor inside `PostItemPage.js` to enable rich and professional formatting, coupled with a Live Preview rendering system to verify layouts before posting.
- **XSS Sanitization:** Formatted descriptions are safely rendered using the zero-dependency `sanitizeDescription` utility in `frontend/src/utils/sanitize.js`. This function escapes all input HTML tags for absolute security, and then restores safe formatting tags (like `<b>`, `<strong>`, `<i>`, `<em>`, `<h2>`, `<h3>`, `<h4>`, `<br>`, `<p>`, `<u>`, `<ul>`, `<ol>`, and `<li>`), which are beautifully structured with proper margin and bullet styles in `ItemDetailPage.css`.
- **Review Breakdown Dashboards:** The reviews tab on details page displays dynamic visual dashboards that compute 1-to-5 star breakdowns based on the user's transaction history reviews. Ensure review cards use standard typography tokens for responsive and beautiful mobile and desktop rendering.
- **Smart Availability & Busy Schedule:** Product details page (`ItemDetailPage.js`) dynamically computes Today's availability status based on local timezone-safe `item.bookedDates` normalization (AVAILABLE "Còn trống", AVAILABLE_TODAY "Còn trống hôm nay", or RENTED "Đang được thuê"). It also displays a premium "Lịch bận sắp tới" (Upcoming Schedule) list widget for both renters (first 3 entries with '+ more' label) and owners (full entries list) to aid rental planning.


## Safe Change Checklist

Before changing rental-related frontend behavior:

1. Find the relevant backend route.
2. Read the controller/service logic.
3. Verify allowed roles and status requirements.
4. Verify required payload fields and upload format.
5. Inspect existing frontend API and UI patterns.
6. Make the smallest compatible change.
7. Run the most relevant available checks.

## Agent Self-Update Rule

Agents should keep this file useful as persistent project context.

After completing a task, the agent should review whether the work introduced important long-term context that future agents need to know.

Update this file only when the change affects future development, such as:

- new backend APIs, routes, models, enums, or permissions
- new frontend pages, major components, admin sections, or route structure
- important business rules or status transitions
- important integration details, request payloads, response shapes, or auth behavior
- project conventions that future agents should follow
- known pitfalls, constraints, or out-of-scope areas

Do NOT update this file for:

- small bug fixes
- visual tweaks
- copy/text changes
- one-off implementation details
- temporary debugging notes
- files changed list
- commit summaries
- noisy changelog entries

When updating this file:

- keep entries concise and stable
- prefer updating existing sections over appending duplicate notes
- do not include speculation
- do not document unfinished work as completed
- do not touch the `mobile/` directory notes unless the user explicitly changes that scope
- preserve the existing structure and wording as much as possible

If a task adds meaningful new APIs or flows, update the relevant section in this file before reporting completion.

Account Admin:
- Email: thanquocthinh112@gmail.com
- Password: 123456
Account User (renter and owner):
- Email: thinhskyduck@gmail.com
- Password: 123456
