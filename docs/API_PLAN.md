# API Plan

## Authentication
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

## Users
GET /api/users
GET /api/users/{id}
PATCH /api/users/{id}
DELETE /api/users/{id}

## Subjects
GET /api/subjects
POST /api/subjects
PUT /api/subjects/{id}
DELETE /api/subjects/{id}

## Questions
GET /api/questions
GET /api/questions/{id}
GET /api/questions/subject/{subjectId}
POST /api/questions
PUT /api/questions/{id}
DELETE /api/questions/{id}

## Exams
GET /api/exams
GET /api/exams/published
GET /api/exams/{id}
POST /api/exams
PUT /api/exams/{id}
PATCH /api/exams/{id}/publish
DELETE /api/exams/{id}

## Attempts
POST /api/exams/{id}/attempts
GET /api/attempts/{id}
POST /api/attempts/{id}/answers
POST /api/attempts/{id}/submit
GET /api/attempts/{id}/result

## Analytics
GET /api/analytics/student/{id}
GET /api/analytics/exam/{id}
GET /api/analytics/admin
