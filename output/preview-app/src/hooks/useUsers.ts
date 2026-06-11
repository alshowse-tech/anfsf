// [generated]
import { useState, useEffect, useCallback } from 'react';
import { User, CreateUserPayload, UpdateUserPayload } from '../types/user';
import { fetchUsers, createUser, updateUser, deleteUser } from '../services/api';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // TODO: implement pagination state and functions
  // TODO: implement search filter state and function

  return { users, loading, error, refetch: loadUsers };
}
