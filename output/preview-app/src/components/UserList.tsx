// [generated]
import React, { useState } from 'react';
import { User } from '../types/user';
import { DEFAULT_PAGE_SIZE } from '../utils/constants';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onManageRoles: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete, onManageRoles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // TODO: implement search filtering
  // TODO: implement pagination logic

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2 w-full max-w-md"
        />
      </div>
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Name</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Roles</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="py-2 px-4 border-b">{user.name}</td>
              <td className="py-2 px-4 border-b">{user.email}</td>
              <td className="py-2 px-4 border-b">{user.roles.join(', ')}</td>
              <td className="py-2 px-4 border-b">
                <button
                  onClick={() => onEdit(user)}
                  className="bg-blue-500 text-white px-3 py-1 rounded mr-2 hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(user.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded mr-2 hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => onManageRoles(user)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Roles
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* TODO: implement pagination controls */}
      <div className="mt-4 flex justify-center">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          className="px-3 py-1 border rounded mr-2 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-3 py-1">Page {currentPage}</span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          className="px-3 py-1 border rounded ml-2"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default UserList;
