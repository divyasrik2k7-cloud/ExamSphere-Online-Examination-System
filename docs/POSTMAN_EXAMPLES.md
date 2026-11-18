# Postman Examples

GET http://localhost:8080/api/health

GET http://localhost:8080/api/subjects

GET http://localhost:8080/api/questions

GET http://localhost:8080/api/exams

POST http://localhost:8080/api/subjects
Content-Type: application/json

{
  "name": "Computer Networks",
  "description": "Networking fundamentals"
}
