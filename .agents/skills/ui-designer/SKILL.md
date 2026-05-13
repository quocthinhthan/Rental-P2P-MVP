---
name: ui-designer
description: Use when improving the visual design, layout, spacing, typography, component polish, responsiveness, or user experience of the existing frontend while preserving current business logic, API behavior, data flow, and repository architecture.
---

# UI Designer

## 1. Goal

Improve the existing frontend so screens feel more professional, usable, responsive, and visually consistent.

This project is a personal item rental web platform. Most screens and API integrations already work. Focus on visual polish and user experience without changing business logic, API behavior, rental status rules, authorization, validation, or data flow.

## 2. When to Use This Skill

Use this skill for:

- Page layout polish.
- Better spacing, hierarchy, typography, and responsiveness.
- Cleaner cards, forms, tables, badges, alerts, modals, and empty states.
- Improving rental-specific UX for statuses, next actions, roles, deposits, contracts, pickup, return, and proof images.
- Making an existing screen look more polished while preserving functionality.

Do not use this skill as permission to redesign the app from scratch.

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
- Form styles.
- Typography.
- Empty, loading, and error states.
- Responsive grid behavior.

## 4. Safe UI Improvement Checklist

- Act like a senior product/UI designer.
- Reuse existing Bootstrap utilities and project CSS classes where possible.
- Prefer small, high-impact improvements over broad rewrites.
- Improve hierarchy with existing cards, sections, badges, alerts, icons, and spacing patterns.
- Keep the current page structure when it already works.
- Add custom CSS only when existing utilities/classes are not enough.
- Keep custom CSS scoped and minimal, following the existing project structure.
- Keep Vietnamese user-facing text natural, concise, and consistent with nearby screens.
- Test important responsive states after layout changes.

## 5. Forbidden Changes

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

## 6. Bootstrap/Template-Specific Guidance

This frontend was built from a downloaded template and uses Bootstrap, custom CSS, and many existing styles.

- Prefer Bootstrap grid, spacing, flex, display, badge, alert, button, form, modal, and card utilities when they match the existing style.
- Reuse template classes before creating new ones.
- Keep custom CSS compatible with Bootstrap specificity.
- Avoid fighting the template with large overrides.
- If new CSS is needed, place it near the current page or component style file and use clear scoped selectors.
- Preserve responsive behavior from Bootstrap containers, rows, columns, and breakpoints.

## 7. Rental Platform UX Guidance

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

## 8. Implementation Workflow

1. Read the required style discovery files and nearby components.
2. Summarize the current design language before large UI changes.
3. Identify the smallest UI changes that improve clarity and polish.
4. Edit existing components and CSS using established patterns.
5. Keep business logic and API integration untouched.
6. Verify responsive behavior and important UI states.
7. Run relevant lint/build checks when available and practical.

## 9. Done Criteria

A UI improvement is done when:

- The screen is visually clearer and more polished.
- Existing functionality still works.
- API behavior and business logic are unchanged.
- Styling matches the current Bootstrap/template design language.
- Custom CSS is minimal and scoped.
- Responsive layout remains usable on mobile and desktop.
- Empty, loading, error, and disabled states still make sense.

## 10. Final Response Format

In the final response:

- Briefly summarize the visual improvements.
- Mention the files changed.
- State that business logic/API behavior was preserved.
- Mention any checks run, or say if checks were not run.
