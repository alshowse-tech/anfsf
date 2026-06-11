// [generated]
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UsersPage from './pages/UsersPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow p-4">
          <h1 className="text-2xl font-bold">User Management Dashboard</h1>
        </header>
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/users" element={<UsersPage />} />
            <Route path="*" element={<Navigate to="/users" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
