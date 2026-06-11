import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: implement user management endpoints
// GET /users - list all users
// POST /users - create a new user
// GET /users/:id - get user by id
// PUT /users/:id - update user
// DELETE /users/:id - delete user

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;