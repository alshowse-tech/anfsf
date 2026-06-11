// [generated]
import React, { useState } from 'react';
import { User } from '../types/user';

interface UserFormProps {
  onSubmit: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: User | null;
}

export const UserForm: React.FC<UserFormProps> = ({ onSubmit, initialData }) => {
  const [name, setName] = useState(initialData?.name ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: add validation before calling onSubmit
    onSubmit({ name, email });
    if (!initialData) {
      setName('');
      setEmail('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {initialData ? 'Update' : 'Create'} User
        </button>
      </div>
    </form>
  );
};
