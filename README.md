# Re_Ev_System Backend

Node.js Express backend for the Registration and Assessment System (ລະບົບລົງທະບຽນ ແລະ ປະເມີນຜົນການຮຽນຂອງວິທະຍາໄລສີລິມຸງຄຸນ).

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Security:** Helmet, CORS
- **Logging:** Morgan

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# The .env file is already configured with defaults
# Edit if needed:
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:1420
```

### Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Start production server:**
```bash
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Check server health status

### API Root
- `GET /api` - List all available endpoints

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Assessments
- `GET /api/assessments` - Get all assessments
- `GET /api/assessments/:id` - Get assessment by ID
- `GET /api/assessments/student/:studentId` - Get assessments by student
- `GET /api/assessments/course/:courseId` - Get assessments by course
- `POST /api/assessments` - Create new assessment
- `PUT /api/assessments/:id` - Update assessment
- `DELETE /api/assessments/:id` - Delete assessment

## Project Structure

```
Re_Ev_System_Backend/
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # Server entry point
│   └── routes/
│       ├── health.ts          # Health check route
│       └── api/
│           ├── index.ts       # API router
│           ├── students.ts    # Student endpoints
│           ├── courses.ts     # Course endpoints
│           └── assessments.ts # Assessment endpoints
├── .env                       # Environment variables
├── .gitignore
├── package.json
└── tsconfig.json
```

## API Examples

### Create a Student
```bash
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'
```

### Get All Courses
```bash
curl http://localhost:3000/api/courses
```

### Create an Assessment
```bash
curl -X POST http://localhost:3000/api/assessments \
  -H "Content-Type: application/json" \
  -d '{"studentId":1,"courseId":1,"type":"Midterm","score":85}'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| FRONTEND_URL | CORS allowed origin | http://localhost:1420 |
| JWT_SECRET | Secret for JWT (future use) | your-secret-key-change-in-production |

## Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Authentication & Authorization (JWT)
- [ ] Input validation with express-validator
- [ ] Error handling middleware
- [ ] API documentation with Swagger/OpenAPI
- [ ] Unit and integration tests
- [ ] File upload support
- [ ] Email notifications

## License

ISC
