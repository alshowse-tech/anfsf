import { User, CreateUserRequest, UpdateUserRequest } from '../types';

// TODO: implement in-memory or database storage
const users: User[] = [];

export function getAllUsers(): User[] {
  // TODO: implement
  return users;
}

export function getUserById(id: string): User | undefined {
  // TODO: implement
  return users.find(user => user.id === id);
}

export function createUser(request: CreateUserRequest): User {
  // TODO: implement
  const user: User = {
    id: Math.random().toString(36).substr(2, 9),
    name: request.name,
    email: request.email,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  users.push(user);
  return user;
}

export function updateUser(id: string, request: UpdateUserRequest): User | undefined {
  // TODO: implement
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) return undefined;
  users[userIndex] = { ...users[userIndex], ...request, updatedAt: new Date() };
  return users[userIndex];
}

export function deleteUser(id: string): boolean {
  // TODO: implement
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) return false;
  users.splice(userIndex, 1);
  return true;
}