// [generated]
import axios from 'axios';
import { User } from '../types/user';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const getUsers = async (): Promise<User[]> => {
  // TODO: implement query params, error handling
  const response = await axios.get(`${API_BASE_URL}/users`);
  return response.data;
};

export const createUser = async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
  const response = await axios.post(`${API_BASE_URL}/users`, data);
  return response.data;
};

export const updateUser = async (id: string, data: Partial<User>): Promise<User> => {
  const response = await axios.put(`${API_BASE_URL}/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/users/${id}`);
};
