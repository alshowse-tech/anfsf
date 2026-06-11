// [generated]
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User';

// TODO: implement proper data persistence (e.g., database)
const users: User[] = [];

export class UserController {
  getAll = (req: Request, res: Response): void => {
    // TODO: implement pagination, filtering, sorting
    res.json(users);
  };

  getById = (req: Request, res: Response): void => {
    // TODO: implement lookup by id
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  };

  create = (req: Request, res: Response): void => {
    // TODO: validate request body, handle errors
    const { name, email } = req.body;
    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(newUser);
    res.status(201).json(newUser);
  };

  update = (req: Request, res: Response): void => {
    // TODO: implement partial update, validation
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const { name, email } = req.body;
    users[index] = {
      ...users[index],
      name: name ?? users[index].name,
      email: email ?? users[index].email,
      updatedAt: new Date().toISOString(),
    };
    res.json(users[index]);
  };

  delete = (req: Request, res: Response): void => {
    // TODO: implement actual deletion
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    users.splice(index, 1);
    res.status(204).send();
  };
}
