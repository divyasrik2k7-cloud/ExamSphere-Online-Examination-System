# Deployment

This repository is configured for local Docker Compose demonstration. Copy `.env.example` to `.env`, generate strong unique values, then run `docker compose up --build`.

Do not deploy with example/default credentials. Use HTTPS, a managed MySQL instance, secret-manager-backed `DB_PASSWORD`, `APP_JWT_SECRET`, and `APP_BOOTSTRAP_KEY`, and restrict CORS to the exact production frontend origin before public deployment. Rotate or remove the staff bootstrap key after provisioning initial staff accounts.

The current question bank/test-builder and attempt/result workflows are not yet fully persisted by the backend. A public production launch requires those APIs, student assignment records, server-side answer evaluation, audit logging, rate limiting, password reset, automated tests, and deployment verification.
