---
name: ui-designer
description: Use when improving the visual design, layout, spacing, typography, component polish, responsiveness, or user experience of the existing frontend while preserving current business logic, API behavior, data flow, and repository architecture.
---

# UI Designer

## 1. Goal

Improve the existing frontend so screens feel more professional, usable, polished, and visually consistent.

This project is a personal item rental web platform. Most screens and API integrations already work. Focus on visual polish and user experience without changing business logic, API behavior, rental status rules, authorization, validation, or data flow.

Do not redesign the app from scratch unless the user explicitly asks for a full redesign.

## 2. When to Use This Skill

Use this skill for:

- Page layout polish.
- Better spacing, hierarchy, typography, and visual clarity.
- Cleaner cards, forms, tables, badges, alerts, modals, empty states, and loading states.
- Improving admin dashboard, admin tables, filters, action menus, and detail pages.
- Improving rental-specific UX for statuses, next actions, roles, deposits, contracts, pickup, return, and proof images.
- Making an existing screen look more polished while preserving functionality.

Do not use this skill as permission to change business logic, API behavior, or repository architecture.

## 3. Required Style Discovery Checklist

Before editing UI, inspect the current visual system:

- `frontend/package.json`
- Frontend entry files.
- Global CSS files.
- Bootstrap imports and Bootstrap usage.
- Theme or downloaded-template CSS files.
- Existing layout components.
- Navbar, header, sidebar, and footer components.
- Reusable UI components.
- Pages similar to the target page.
- Existing `className` patterns in the current screen.

Identify and preserve the current design language:

- Colors.
- Spacing scale.
- Border radius.
- Shadows.
- Button styles.
- Card styles.
- Table styles.
- Form styles.
- Typography.
- Empty, loading, error, and disabled states.
- Responsive behavior already used by the project.

## 4. Admin UI Guidelines

The admin area is primarily desktop-first and optimized for laptop/PC usage.

For admin pages:

- Prioritize desktop usability, scanning speed, dense information display, and operational efficiency.
- Tables are preferred for large management screens such as products, users, reports, rentals, transactions, and analytics.
- Card/list layouts are acceptable for detail-heavy workflows like disputes.
- Dashboard pages should use KPI cards, charts, tables, filters, and compact summaries.
- Detail pages should use clear sections/cards with strong hierarchy.
- Mobile responsiveness is secondary for admin pages.
- Do not over-optimize admin screens for small mobile layouts if it harms desktop UX.
- Horizontal scrolling on smaller screens is acceptable for admin tables.
- Preserve readability and operational speed over aggressive responsive stacking.
- Avoid turning complex admin tables into oversized mobile card layouts unless explicitly requested.
- Keep admin layouts professional, compact, and data-oriented rather than landing-page-like.

Recommended admin layout direction:

- `/admin/dashboard` → KPI cards + charts + compact tables.
- `/admin/items` → table-first management screen.
- `/admin/users` → table-first management screen.
- `/admin/item-reports` → table-first screen with detail/resolve actions.
- `/admin/rentals` → table-first management screen.
- `/admin/disputes` → card/list layout is acceptable because disputes need more context.
- Detail pages → card/section layout.

## 5. Safe UI Improvement Checklist

- Act like a senior product/UI designer.
- Reuse existing Bootstrap utilities and project CSS classes where possible.
- Prefer small, high-impact improvements over broad rewrites.
- Improve hierarchy with existing cards, sections, badges, alerts, icons, and spacing patterns.
- Keep the current page structure when it already works.
- Add custom CSS only when existing utilities/classes are not enough.
- Keep custom CSS scoped and minimal, following the existing project structure.
- Keep Vietnamese user-facing text natural, concise, and consistent with nearby screens.
- For normal user-facing pages, keep responsive behavior polished.
- For admin pages, prioritize desktop/laptop usability first. Mobile only needs to remain functional.

## 6. Forbidden Changes

Do not change:

- API calls.
- Business logic.
- Rental status logic.
- Role or authorization logic.
- Validation logic.
- Data flow.
- Existing prop, hook, service, or API field names.
- Backend contracts.

Do not:

- Rewrite a page from scratch unless the user explicitly asks.
- Introduce Tailwind unless it is already used in the project.
- Install a new UI library unless the user explicitly allows it.
- Replace the downloaded template style with an unrelated visual direction.
- Rename classes broadly unless required and safe.
- Make admin pages overly spacious or mobile-first if the screen is meant for operational management.
- Convert dense admin tables into card-only layouts unless explicitly requested.

## 7. Bootstrap/Template-Specific Guidance

This frontend was built from a downloaded template and uses Bootstrap, custom CSS, and many existing styles.

- Prefer Bootstrap grid, spacing, flex, display, badge, alert, button, form, modal, table, and card utilities when they match the existing style.
- Reuse template classes before creating new ones.
- Keep custom CSS compatible with Bootstrap specificity.
- Avoid fighting the template with large overrides.
- If new CSS is needed, place it near the current page or component style file and use clear scoped selectors.
- Preserve existing Bootstrap behavior where it already works.
- For admin tables, horizontal overflow is acceptable on small screens.

## 8. Rental Platform UX Guidance

For rental pages, make these states easier to scan and understand:

- Rental status.
- Next available action.
- Whether the current user is renter or owner.
- Payment and deposit state.
- Contract creation and signing state.
- Pickup proof image requirements.
- Return proof image requirements.
- Completion state.
- Disabled actions and why they are unavailable.

Use visual hierarchy rather than long explanations. Prefer badges, concise helper text, grouped sections, alerts, icons if already available, and clear button placement.

## 9. Admin Product/Table UX Guidance

For admin management screens, optimize for fast scanning and actions.

Tables should generally include:

- Search input.
- Status/category filters where relevant.
- Pagination.
- Sortable-looking headers if sorting exists.
- Compact status badges.
- Owner/user information.
- Important counts such as rental count, dispute count, report count, or revenue.
- Clear primary action.
- Secondary actions in an action menu or compact button group.
- Confirmation modal/SweetAlert before destructive or risky actions.

Avoid making table rows too tall. Admin should be able to scan many records quickly.

## 10. Implementation Workflow

1. Read the required style discovery files and nearby components.
2. Summarize the current design language before large UI changes.
3. Identify the smallest UI changes that improve clarity and polish.
4. Edit existing components and CSS using established patterns.
5. Keep business logic and API integration untouched.
6. For admin pages, verify desktop/laptop layout first.
7. For user-facing pages, verify mobile and desktop usability.
8. Run relevant lint/build checks when available and practical.

## 11. Done Criteria

A UI improvement is done when:

- The screen is visually clearer and more polished.
- Existing functionality still works.
- API behavior and business logic are unchanged.
- Styling matches the current Bootstrap/template design language.
- Custom CSS is minimal and scoped.
- Admin pages remain efficient on desktop/laptop.
- Mobile layout remains usable where practical, but admin pages do not need heavy mobile optimization.
- Empty, loading, error, and disabled states still make sense.

## 12. Final Response Format

In the final response:

- Briefly summarize the visual improvements.
- Mention the files changed.
- State that business logic/API behavior was preserved.
- Mention any checks run, or say if checks were not run.