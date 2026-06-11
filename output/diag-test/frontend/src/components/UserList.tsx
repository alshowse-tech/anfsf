// [generated]
import React from 'react';
import { User } from '../types/user';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

export const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete }) => {
  // TODO: implement table/list display with Tailwind classes
  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold mb-2">Users</h2>
      <table className="min-w-full bg-white shadow-md rounded">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Name</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr><td colSpan={3} className="text-center py-4 text-gray-500">No users found.</td></tr>
          )}
          {users.map(user => (
            <tr key={user.id}>
              <td className="py-2 px-4 border-b">{user.name}</td>
              <td className="py-2 px-4 border-b">{user.email}</td>
              <td className="py-2 px-4 border-b">
                <button
                  onClick={() => onEdit(user)}
                  className="text-blue-500 hover:underline mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(user.id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
