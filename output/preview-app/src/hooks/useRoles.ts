// [generated]
import { useState, useEffect, useCallback } from 'react';
import { Role } from '../types/role';
import { fetchRoles, assignRole, removeRole } from '../services/api';

export function useRoles(userId?: string) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoles();
      setRoles(data);
      if (userId) {
        // TODO: fetch user's roles from user object or separate endpoint
        // For now just stub
        setUserRoles([]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  return { roles, userRoles, loading, error, refetch: loadRoles };
}
