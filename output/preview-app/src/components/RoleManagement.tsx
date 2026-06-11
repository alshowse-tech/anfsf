// [generated]
import React, { useState } from 'react';
import { User } from '../types/user';
import { Role } from '../types/role';

interface RoleManagementProps {
  user: User;
  allRoles: Role[];
  assignedRoleIds: string[];
  onAssign: (roleId: string) => void;
  onRemove: (roleId: string) => void;
  onClose: () => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({
  user,
  allRoles,
  assignedRoleIds,
  onAssign,
  onRemove,
  onClose,
}) => {
  // TODO: implement UI to assign/remove roles (e.g., with checkboxes or multi-select)
  const availableRoles = allRoles.filter((r) => !assignedRoleIds.includes(r.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Manage Roles for {user.name}</h2>
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Current Roles</h3>
          <ul>
            {assignedRoleIds.map((roleId) => {
              const role = allRoles.find((r) => r.id === roleId);
              return (
                <li key={roleId} className="flex justify-between items-center mb-1">
                  <span>{role?.name || roleId}</span>
                  <button
                    onClick={() => onRemove(roleId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Available Roles</h3>
          <ul>
            {availableRoles.map((role) => (
              <li key={role.id} className="flex justify-between items-center mb-1">
                <span>{role.name}</span>
                <button
                  onClick={() => onAssign(role.id)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Assign
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
