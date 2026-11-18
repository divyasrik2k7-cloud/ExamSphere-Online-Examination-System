# ExamSphere Deployment Guide

## Option A — One-command Docker deployment

Requirements: Docker Desktop with Compose.

1. Copy `.env.example` to `.env` and change both passwords.
2. From the project root run:

```bash
docker compose up --build -d
```

3. Open:

`http://localhost:8080`

The browser reaches the React/Nginx frontend. `/api/*` is reverse-proxied to Spring Boot, and Spring Boot connects to MySQL.

## Stop

```bash
docker compose down
```

## Stop and delete database volume

```bash
docker compose down -v
```

## Option B — Local development

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Backend:
```bash
cd backend
mvn spring-boot:run
```

MySQL:
- create database `examsphere`
- run `database/schema.sql`
- set credentials in `backend/src/main/resources/application.properties`

## Production hosting

The container architecture can be deployed to a VPS, AWS EC2, Azure VM, Render, Railway, or another Docker-compatible host. For public production use, put HTTPS in front of the application and use managed MySQL with backups.

## Security before real public use

- Replace demo authentication with signed JWT access/refresh tokens.
- Store passwords only with BCrypt/Argon2.
- Add role checks to every protected API endpoint.
- Restrict CORS to the production frontend origin.
- Use HTTPS.
- Rotate secrets and never commit `.env`.
- Add rate limiting and audit logging.
- Add database backups.

## Option C — Netlify (frontend only)

The React app is self-contained (demo data, no API calls), so it deploys to Netlify on its own. `netlify.toml` at the repo root already sets base `frontend`, build `npm run build`, publish `dist`.

**Drag-and-drop:** run `cd frontend && npm install && npm run build`, then drop the `frontend/dist` folder on https://app.netlify.com/drop.

**Git deploy:** push the repo to GitHub → Netlify → *Add new site → Import from Git* → pick the repo. No settings need changing.

Demo logins: `student@examsphere.com / student123`, `teacher@examsphere.com / teacher123`, `admin@examsphere.com / admin123`.

The Spring Boot + MySQL backend is not part of the Netlify deploy; host it separately (Render, Railway, etc.) when you connect real APIs.
