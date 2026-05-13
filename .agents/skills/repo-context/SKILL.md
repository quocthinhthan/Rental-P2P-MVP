---
name: repo-context
description: Use when working in this repository before making code changes, especially frontend/backend changes, API integrations, rental flow updates, UI edits, or refactors. Helps Codex inspect existing architecture, preserve working flows, reuse local patterns, and keep diffs minimal.
---

# Repo Context

Before changing code in this repository:

- Inspect the existing frontend and backend structure first.
- Reuse established components, API clients, modals, toasts, auth helpers, services, and styling patterns.
- Avoid rewriting working flows unless the user explicitly asks for a larger redesign.
- Prefer the smallest focused diff that solves the request.
- Preserve the current UI architecture and user experience.
- Read backend routes, controllers, services, models, and middleware before changing frontend API integration.
- Do not guess payloads, field names, statuses, permissions, or validation rules.
- Treat backend behavior as the source of truth for API contracts and authorization.
- Summarize your understanding before large refactors or broad architectural changes.

When uncertain, inspect more existing code before inventing a new pattern.
