// [generated]
import React, { useState, useEffect } from 'react';
import { User, CreateUserPayload, UpdateUserPayload } from '../types/user';

interface UserFormProps {
  user?: User | null;
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    } else {
      setName('');
      setEmail('');
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = user
      ? { name: name.trim(), email: email.trim() } as UpdateUserPayload
      : { name: name.trim(), email: email.trim() } as CreateUserPayload;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">{user ? 'Edit User' : 'Create User'}</h2>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded w-full px-3 py-2"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded w-full px-3 py-2"
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-100">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          {user ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
