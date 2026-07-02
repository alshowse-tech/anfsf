import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/client';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.ok) {
        setSuccess(true);
        // Auto-login after registration
        const loginResult = await login(username.trim(), password);
        if (loginResult.status === 'ok') {
          setTimeout(() => navigate('/'), 500);
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed');
      }
    } catch (e) {
      setError('Registration failed: ' + String(e));
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-2">Registration Successful</h1>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Register a new ANFSF account</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              placeholder="Choose a username" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              placeholder="Repeat password" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center mt-4">
          <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800">
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
