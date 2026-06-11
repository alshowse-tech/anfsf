// [generated]
import React, { useState } from 'react';
import UserList from '../components/UserList';
import UserForm from '../components/UserForm';
import RoleManagement from '../components/RoleManagement';
import { User, CreateUserPayload, UpdateUserPayload } from '../types/user';
import { useUsers } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';

const UsersPage: React.FC = () => {
  const { users, loading, error, refetch } = useUsers();
  const { roles, userRoles, refetch: refetchRoles } = useRoles();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleManagementUser, setRoleManagementUser] = useState<User | null>(null);

  // TODO: implement actual mutations (create, update, delete, role assign/remove)
  const handleCreate = async (data: CreateUserPayload) => {
    // TODO: call API and refetch
    setShowForm(false);
  };

  const handleUpdate = async (data: UpdateUserPayload) => {
    // TODO: call API and refetch
    setEditingUser(null);
    setShowForm(false);
  };

  const handleDelete = async (userId: string) => {
    // TODO: call API and refetch
  };

  const handleAssignRole = async (roleId: string) => {
    // TODO: call API and refetch
  };

  const handleRemoveRole = async (roleId: string) => {
    // TODO: call API and refetch
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Users</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Add User
        </button>
      </div>

      <UserList
        users={users}
        onEdit={(user) => {
          setEditingUser(user);
          setShowForm(true);
        }}
        onDelete={handleDelete}
        onManageRoles={(user) => setRoleManagementUser(user)}
      />

      {(showForm || editingUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <UserForm
            user={editingUser}
            onSubmit={(data) => {
              if (editingUser) {
                handleUpdate(data as UpdateUserPayload);
              } else {
                handleCreate(data as CreateUserPayload);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingUser(null);
            }}
          />
        </div>
      )}

      {roleManagementUser && (
        <RoleManagement
          user={roleManagementUser}
          allRoles={roles}
          assignedRoleIds={userRoles}
          onAssign={handleAssignRole}
          onRemove={handleRemoveRole}
          onClose={() => setRoleManagementUser(null)}
        />
      )}
    </div>
  );
};

export default UsersPage;
