import { Request, Response } from 'express';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../services/userService';

export function handleGetAllUsers(_req: Request, res: Response): void {
  // TODO: implement error handling
  const users = getAllUsers();
  res.json(users);
}

export function handleGetUserById(req: Request, res: Response): void {
  // TODO: implement error handling
  const user = getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
}

export function handleCreateUser(req: Request, res: Response): void {
  // TODO: implement validation
  const user = createUser(req.body);
  res.status(201).json(user);
}

export function handleUpdateUser(req: Request, res: Response): void {
  // TODO: implement validation
  const user = updateUser(req.params.id, req.body);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
}

export function handleDeleteUser(req: Request, res: Response): void {
  // TODO: implement error handling
  const deleted = deleteUser(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(204).send();
}