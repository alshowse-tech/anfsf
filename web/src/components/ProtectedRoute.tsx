import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../api/client';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
