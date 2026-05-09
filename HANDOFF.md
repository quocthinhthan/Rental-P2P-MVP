# Handoff

## Architecture
- Backend: Express API with MongoDB (Mongoose), RabbitMQ (amqplib), JWT auth, Cloudinary uploads. Entry in [backend/server.js](backend/server.js).
- Frontend: React app with Axios API client and auth context in [frontend/src](frontend/src).
- Worker: Node consumer for RabbitMQ notifications and email sending in [notification-worker/worker.js](notification-worker/worker.js).
- Shared config: root .env loaded by backend, frontend scripts, and worker.

## Current Task
- Update .gitignore to keep commits light and avoid local artifacts.
- Provide handoff for next session.

## Completed Work
- Unified environment configuration in root .env and ensured services load it.
- Fixed RabbitMQ connection order by loading dotenv before module imports.
- Frontend launcher scripts enforce port 3000 regardless of backend PORT.
- Full end-to-end flow verified via API: register, login, create item, request rental, confirm, queue, email.
- Wrote local setup documentation in [SETUP_LOCAL.md](SETUP_LOCAL.md) and quick summary in [QUICK_START.md](QUICK_START.md).
- Expanded .gitignore with common Node/React and OS/editor artifacts.

## Pending Issues
- Optional: verify UI flow in browser (register, login, create item, request rental).
- If RabbitMQ manual startup fails, confirm Windows service is running and ports are listening.

## Important Conventions
- Root .env is the single source of truth for all services.
- Load dotenv before importing modules that read env vars.
- RabbitMQ URI is resolved at connection time, not at module load.
- Frontend dev server is forced to port 3000 by scripts.

## Relevant Files
- Backend entry and startup flow: [backend/server.js](backend/server.js)
- RabbitMQ connection module: [backend/config/rabbitmq.js](backend/config/rabbitmq.js)
- Rentals queue publishing: [backend/controllers/rentals.controller.js](backend/controllers/rentals.controller.js)
- Worker email handling: [notification-worker/worker.js](notification-worker/worker.js)
- Frontend launcher scripts: [frontend/scripts/start.js](frontend/scripts/start.js), [frontend/scripts/build.js](frontend/scripts/build.js)
- Shared env config: [.env](.env)
- Local setup guide: [SETUP_LOCAL.md](SETUP_LOCAL.md)
- Quick summary: [QUICK_START.md](QUICK_START.md)

## Next Steps
1. Run all three services and verify UI path on http://localhost:3000.
2. If needed, add a small UI test checklist to [SETUP_LOCAL.md](SETUP_LOCAL.md).
3. Optional: add a sample .env.example and update README to reference it.
