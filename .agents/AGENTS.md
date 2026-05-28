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

## Current Project Map

Backend and frontend are the main working areas. Keep `mobile/` out of searches and edits unless the user explicitly asks for mobile work.

### Backend

- Runtime: Node.js, Express, CommonJS, Mongoose, Socket.IO, RabbitMQ, Cloudinary, Swagger UI.
- Main entry point: `backend/server.js`. This file loads env, connects MongoDB, tries RabbitMQ, configures Socket.IO chat auth, mounts REST routes, and exposes `/api-docs`.
- `backend/app.js` is an older/exportable Express app shape. Check whether a task actually uses it before editing it; the npm entry currently points to `server.js`.
- `backend/routes/`: URL definitions and route-level middleware. Add or verify endpoints here first.
- `backend/controllers/`: REST business logic for auth, items, rentals, disputes, admin, views, users, and reviews.
- `backend/models/`: Mongoose schemas for `User`, `Item`, `Rental`, `Contract`, `Dispute`, `Message`, `Review`, `ItemReport`, and `AuditLog`.
- `backend/enums/`: backend source of truth for item, rental/payment, and dispute status constants.
- `backend/middleware/auth.middleware.js`: shared auth/permission middleware: `protect`, `admin`, `checkVerified`.
- `backend/services/`: shared domain logic such as chat authorization and trust score recalculation.
- `backend/config/`: MongoDB, RabbitMQ, and Cloudinary configuration.
- `backend/scripts/`: migration/backfill/maintenance scripts. Most require a valid `MONGO_URI`.
- `backend/constants/` and `backend/utils/`: reusable messages and helpers.

Mounted backend API groups in `server.js`:

- `/api/auth`: register, login, logout, current user, profile, eKYC, forgot/reset password.
- `/api/items`: item search/list, categories, bestsellers, create/update/delete, price suggestion, item report, owner blocked-dates management.
- `/api/rentals`: rental request, VNPay URL/return, confirm/reject, contract, signing, pickup (with checklist), approve-pickup, completion (with checklist), approve-return, rental messages.
- `/api/views`: BFF-style read endpoints for item detail (includes blockedDates + isFavorited) and the current user's rentals.
- `/api/admin`: dashboard, user moderation, item moderation, featured/status updates, item reports.
- `/api/upload`: Cloudinary image upload/delete.
- `/api/users`: public profile, favorites (wishlist) management.
- `/api/reviews`: create review, list user reviews, and list item reviews.
- `/api/disputes`: create, list for admin, withdraw, escalate, resolve.

### Frontend

- Runtime: React CRA, React Router, axios, Socket.IO client, i18next, Leaflet, SweetAlert2, CKEditor.
- Main entry point: `frontend/src/index.js`. It wraps the app with `BrowserRouter`, `LoadingProvider`, and `AuthProvider`.
- Routes live in `frontend/src/App.js`. Public pages are direct routes; authenticated pages are nested under `<ProtectedRoute />`.
- `frontend/src/services/api.js`: central axios instance, auth token interceptor, global loading hooks, and exported API client functions. Prefer adding API wrappers here instead of calling axios directly from pages.
- `frontend/src/services/chatSocket.js`: rental chat Socket.IO client. It reads the same stored token as the API client.
- `frontend/src/contexts/AuthContext.js`: auth state, token storage, `/auth/me` bootstrap, login/logout/updateUser helpers.
- `frontend/src/contexts/LoadingContext.js`: global spinner state used by the axios interceptor.
- `frontend/src/pages/`: page-level screens for home/shop/item detail/auth/account/rentals/admin/disputes/VNPay return.
- `frontend/src/components/`: reusable UI grouped by domain:
  - `Layout`: header/footer.
  - `Auth`: protected route.
  - `Common`: spinner and location picker.
  - `Items`: item card/list/report modal.
  - `Rentals`: contract, signature, handover (`HandoverModal.jsx` — bidirectional review/edit/approve), chat panels, dispute (`DisputeModal.jsx` — image upload, reason dropdown).
  - `Admin`: admin nav/hero/dispute resolution form.
  - `Trust`: trust badge.
- `frontend/src/constants/`: frontend enum/status UI mapping. Keep these aligned with backend enums when statuses change.
- `frontend/src/styles/`, `App.css`, and `index.css`: page/component CSS. Prefer extending the nearest existing style file.
- `frontend/src/locales/vi.json` and `frontend/src/config/i18n.js`: Vietnamese localization setup.
- `frontend/public/`: template/static assets, Bootstrap files, legacy JS/CSS libs, and demo images. Avoid broad cleanup here unless the task targets static assets.

### Local Scripts

- Usual local startup: from the repository root, run `.\start-all.ps1` to start the whole project.
- Backend only: from `backend/`, use `npm run dev` for nodemon or `npm start` for `node server.js`.
- Frontend only: from `frontend/`, use `npm start`; the custom script sets `PORT` from `FRONTEND_PORT` or defaults to `3000`.
- Backend test script is still the default failing placeholder. Frontend uses `react-scripts test`.

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
2. Renter pays a deposit through the mock VNPay flow (SweetAlert confirmation popup shown before redirect).
3. Owner confirms the rental.
4. Backend automatically creates an electronic contract.
5. Renter and owner both sign the contract. When fully signed, the `notification-worker` generates a PDF (excluding the handover annex) and emails it to both parties.
6. One party records pickup with `PATCH /api/rentals/{id}/pickup` (stores `pickupReport`, does NOT advance status).
7. The other party reviews the pickup report in `HandoverModal` and confirms with `PATCH /api/rentals/{id}/approve-pickup` — status advances to `in_progress`.
8. One party records return with `PATCH /api/rentals/{id}/complete` (stores `returnReport`, does NOT advance status).
9. The other party reviews and confirms with `PATCH /api/rentals/{id}/approve-return` — status advances to `completed`.
10. Upon successful completion confirmation, the `notification-worker` generates and emails both parties the finalized contract PDF featuring the completed **Phụ lục Bàn giao & Hoàn trả** (Handover & Return Annex).

Rentals can be cancelled before handover. If escrow was already paid, cancellation/rejection marks `paymentStatus` as `refunded`; after pickup, users should use the dispute flow instead of cancellation.


## Business Rules

- Pickup is allowed only after the contract is fully signed.
- Pickup requires `pickupImages`. Both pickup and complete optionally accept `condition`, `accessories`, `notes` (and `damages` for complete) to populate `pickupReport`/`returnReport`. Saving pickup/complete does NOT advance rental status — it waits for the counterpart to call `approve-pickup`/`approve-return`.
- `approve-pickup` and `approve-return` can optionally accept edited report fields (`condition`, `accessories`, `notes`, `damages`, `pickupImages`/`returnImages`) to let the reviewer override the original entry before confirming. Advancing rental status only happens on these approve calls.
- Completion requires `returnImages`.
- Booking availability is date-range based. `Item.status = rented` is not a global lock for all future rentals; new rental/payment/confirmation checks must reject only overlapping active bookings.
- Blocking rental statuses for booking overlap are `pending_confirmation`, `confirmed`, `in_progress`, and `disputed`.
- Item `blockedDates` are also excluded from search results when date-range filters are applied. They do NOT affect the rental status machine — they only block new bookings.
- Owner can only add a `blockedDate` that does not overlap with any existing active rental on that item.
- Backend authorization rules decide which user can perform each action.
- Frontend should display and submit data according to backend state, not local assumptions.
- Rental statuses must be verified from backend implementation before conditional UI or API changes.
- Item violation reporting: A user can only report a specific item once. Item reports require at least a 10-character description and support up to 3 evidence images (each <= 5MB, format: .jpg, .jpeg, .png, .webp, .gif).
- Admin report adjustments: Once a report is resolved, the original owner penalties/actions (e.g. warnings, trust score deductions) are preserved to keep penalty history consistent. Any subsequent adjustments from the admin reports page only toggle the product's active status (AVAILABLE vs DELISTED) by calling `updateAdminItemStatus` instead of modifying the report action.
- Favorites (wishlist): `User.favorites` is an array of Item ObjectIds, capped at 100, managed via `$addToSet`/`$pull`. `getItemDetailView` returns `isFavorited: Boolean` when the caller is authenticated (decoded from Bearer token without requiring `protect` middleware on the route, so unauthenticated calls still work).
- Bank account: `User.bankAccount` subdocument stores `{ bankName, accountNumber, accountHolder }` for automated deposit refund. Enforced **Frontend-only**: renter must fill bank details before booking (checked in `ItemDetailPage.js`); owner must fill bank details before creating/updating an item listing (checked in `PostItemPage.js`). No backend validation.
- Disputes can only be created while the rental is in `confirmed` status (before handover is approved). Once handover is approved (`in_progress` or `completed`), the dispute button is hidden on the frontend. The backend still enforces its own rules independently.
- After a rental ends (`cancelled`, `rejected`, `completed`) the renter sees a **"Thuê lại sản phẩm"** button that navigates directly to the item detail page.


## Important APIs

Verify the exact implementation before using or modifying these endpoints:

- `PATCH /api/rentals/{id}/confirm`
- `PATCH /api/rentals/{id}/cancel`
- `POST /api/upload`
- `POST /api/rentals/{id}/sign-contract`
- `PATCH /api/rentals/{id}/pickup` — body: `{ pickupImages, condition?, accessories?, notes? }` — saves `pickupReport`, status stays `confirmed`
- `PATCH /api/rentals/{id}/approve-pickup` — counterpart only; optional body: `{ pickupImages?, condition?, accessories?, notes? }` — advances status to `in_progress`
- `PATCH /api/rentals/{id}/complete` — body: `{ returnImages, condition?, accessories?, notes?, damages? }` — saves `returnReport`, status stays `in_progress`
- `PATCH /api/rentals/{id}/approve-return` — counterpart only; optional body: `{ returnImages?, condition?, accessories?, notes?, damages? }` — advances status to `completed`
- `POST /api/items/{id}/report` (Submit product violation report)
- `GET /api/admin/item-reports` (Admin get violation reports list)
- `PATCH /api/admin/item-reports/{reportId}/resolve` (Admin resolve violation report)
- `POST /api/items/{id}/blocked-dates` — owner only; body: `{ startDate, endDate, reason? }`
- `DELETE /api/items/{id}/blocked-dates/{blockId}` — owner only
- `GET /api/users/me/favorites` — authenticated; returns array of item summaries
- `POST /api/users/me/favorites/{itemId}` — authenticated; idempotent, max 100
- `DELETE /api/users/me/favorites/{itemId}` — authenticated; idempotent
- `GET /api/reviews/items/{itemId}` — public; returns product-specific averageRating, totalReviews, and reviews list

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
- **Bidirectional Handover Flow:** `HandoverModal.jsx` serves both the recorder (fills form + images) and the reviewer (sees pre-populated read-only data, can toggle edit mode to correct details/swap images, then confirm). Both parties share the same action button label (`Xác nhận giao đồ` / `Hoàn tất thuê / Trả đồ`). The modal dispatches `approvePickup`/`approveReturn` with optional override payload when reviewer edits.
- **PDF Contract Email:** `notification-worker` listens for `contract_fully_signed` (emails initial PDF without annex) and `contract_completed` (emails final PDF with detailed pickup + return reports annex) queue events. The PDF is built using `pdfkit` featuring side-by-side signature images and is sent to both parties via the existing `transporter`.
- **Bank Account Enforcement (Frontend Only):** Renters are blocked from booking if `user.bankAccount` is incomplete (`ItemDetailPage.js`). Owners are blocked from creating/updating listings if `user.bankAccount` is incomplete (`PostItemPage.js`). No backend validation exists — this is a frontend-only gate.


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
