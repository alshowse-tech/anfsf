# Implementation Tasks

## Backend
- [ ] Implement user data persistence (database connection, CRUD operations) in `backend/src/controllers/userController.ts` and `backend/src/database.ts`.
- [ ] Add request validation (e.g., express-validator) for user creation and update.
- [ ] Implement pagination, filtering, and sorting for GET /users.
- [ ] Add error handling middleware.
- [ ] Write unit tests for controllers.

## Frontend
- [ ] Implement API calls in `frontend/src/api/users.ts`.
- [ ] Add loading states and error handling in `UsersPage.tsx`.
- [ ] Improve form validation (email format, required fields).
- [ ] Add confirmation dialog before user deletion.
- [ ] Style the UI further (use Tailwind classes).
- [ ] Consider using React Query or SWR for data fetching.

## General
- [ ] Define OpenAPI specification (see `contracts.openapi`).
- [ ] Set up database schema (see `contracts.dbSchema`).
- [ ] Configure environment variables for API URL.
- [ ] Set up CI/CD pipeline.
