# Online Quiz and Examination System

React + Vite frontend, Spring Boot 3 / Java 17 backend, and MySQL database.

## This revision

- Login and registration remain on the existing JWT/BCrypt authentication implementation. Existing login/demo setup was left untouched.
- The Create/Edit Test window contains the complete question builder. Questions are saved as part of that test; the workflow does not require a separate Question Bank.
- Authenticated teachers/admins can create, edit, publish, unpublish, list, and delete tests through the Spring Boot API. Test and question records are persisted in MySQL using the `exams` and `exam_questions` relationships.
- Student published-test listing is retrieved from the backend. Correct answers are omitted from student-facing published-test responses.
- New installations start without seeded sample exams, questions, notifications, or sample student records in the frontend.

## Run with Docker

1. Copy `.env.example` to `.env`.
2. Set strong values for the environment variables in `.env`; `APP_JWT_SECRET` must be at least 32 characters. Keep `.env` private.
3. Run `docker compose up --build`.
4. Open `http://localhost:8080`.

## Run locally

Import `database/schema.sql` into MySQL. Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `APP_JWT_SECRET` (32+ characters), and `APP_BOOTSTRAP_KEY` in the backend environment.

```bash
cd backend
mvn spring-boot:run
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

## API

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET /api/exams` (teacher/admin)
- `POST /api/exams` (teacher/admin)
- `PUT /api/exams/{id}` (owner/admin)
- `PATCH /api/exams/{id}/publish` (owner/admin)
- `PATCH /api/exams/{id}/unpublish` (owner/admin)
- `DELETE /api/exams/{id}` (owner/admin)
- `GET /api/exams/published` (student; answer keys omitted)

See `IMPLEMENTATION_STATUS.md` for the verified scope and remaining work. This revision is not yet a production-complete examination platform: attempt persistence/server grading, backend user management, analytics, and assignment enforcement still require implementation and end-to-end verification.
