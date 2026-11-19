# Online Quiz and Examination System Repair Notes

This package contains the corrected project used for the Docker deployment setup.

## Fixes applied

1. Fixed `database/schema.sql` syntax: added the missing comma after `difficulty` in the `questions` table.
2. Changed JPA enum-backed database columns (`users.role`, `exams.status`, `attempts.status`) from MySQL `ENUM` to `VARCHAR(255)` so they match `@Enumerated(EnumType.STRING)` validation in Hibernate.
3. Restored the complete React `frontend/src/main.jsx`, including the `Attempt`, `Result`, analytics, question bank, admin, notification, profile, settings pages and the final `createRoot(...).render(<App />)` call.
4. Kept the Docker Compose setup so MySQL initializes `schema.sql` on a fresh volume and the backend waits for a healthy database.

## First run after this repair

Because the old MySQL volume may contain the partially initialized schema, run once:

```bash
docker compose down -v
docker compose up --build -d
docker compose ps
docker compose logs backend --tail=50
```

Expected services:

- db: Up (healthy)
- backend: Up
- frontend: Up, port 8080

Then open:

```text
http://localhost:8080
```

Do not include your `.env` file in the ZIP. Create it from `.env.example` if required.
