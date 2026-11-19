# External Review — Setup and Demonstration

## Before the demonstration

1. Configure `.env` from `.env.example` with unique database, JWT and bootstrap secrets.
2. Run `docker compose up --build` and wait for MySQL and the backend to become healthy.
3. Open `http://localhost:8080`.
4. Register a student account through Sign up.
5. Provision a Teacher account through `/api/auth/register-staff` using the private `APP_BOOTSTRAP_KEY` (instructions in README.md).
6. Sign in as the teacher.

## Demonstrate Create Test

1. Open **Create and Manage Tests**.
2. Enter a title and choose/type a subject.
3. Select existing questions for that subject, or add questions in the same form.
4. For each new MCQ, enter the question, four options, correct option and marks.
5. Set duration and assign to all students or selected student email addresses.
6. Save as draft, review the test, then publish it.
7. Sign in as a student and show the published assessment if it is assigned to that student's email.

## Be accurate about the implementation

Authentication is backed by MySQL, uses BCrypt password hashing, and issues signed JWTs. The current React question bank/test builder still saves to the browser's localStorage rather than the MySQL API. Therefore tests and questions created in one browser are not yet shared with another device/account. Attempt submission and analytics are also not fully server-backed. Present those as prototype workflows, not production-grade functionality.
