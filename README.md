# ExamSphere 2.0 — Advanced Online Quiz & Examination System

ExamSphere is an advanced full-stack web application designed as a Software Engineering project.

## Frontend
React + Vite + responsive CSS

## Backend
Java 17 + Spring Boot + Spring Security + JPA

## Database
MySQL

## Pages included
### Public
- Login
- Registration
- Forgot password UI

### Student
- Dashboard
- Examinations
- Exam Instructions
- Live Examination
- Results
- Performance Analytics
- Leaderboard
- Notifications
- Profile
- Settings

### Teacher
- Dashboard
- Question Bank
- Manage Examinations
- Analytics

### Admin
- Dashboard
- User Management
- Question Bank
- Examination Management
- Analytics
- Notifications
- Settings

## Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Run Backend
Set MySQL credentials in:
backend/src/main/resources/application.properties

Then:
```bash
cd backend
mvn spring-boot:run
```

Backend:
http://localhost:8080

## Database
Run:
database/schema.sql

## Notes
The UI is fully navigable and includes demo role switching. The backend exposes REST foundations for authentication, subjects, questions, exams, attempts and analytics. Connect the authentication and persistence workflows for production deployment.
