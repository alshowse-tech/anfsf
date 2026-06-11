// [generated]
import React, { useState, useEffect } from 'react';
import { UserList } from '../components/UserList';
import { UserForm } from '../components/UserForm';
import { User } from '../types/user';
import { getUsers, createUser, updateUser, deleteUser } from '../api/users';

// TODO: implement state management, error handling, loading states
export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    // TODO: fetch users on mount
    // getUsers().then(setUsers).catch(console.error);
  }, []);

  const handleCreate = (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    // TODO: implement create and refresh list
  };

  const handleUpdate = (id: string, data: Partial<User>) => {
    // TODO: implement update and refresh
  };

  const handleDelete = (id: string) => {
    // TODO: implement delete and refresh
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <UserForm
        onSubmit={editingUser ? (data) => handleUpdate(editingUser.id, data) : handleCreate}
        initialData={editingUser}
      />
      <UserList users={users} onEdit={setEditingUser} onDelete={handleDelete} />
    </div>
  );
};
