// [generated]
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import PlanListPage from './pages/PlanListPage';
import PlanDetailPage from './pages/PlanDetailPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="plans" element={<PlanListPage />} />
        <Route path="plans/:id" element={<PlanDetailPage />} />
      </Route>
    </Routes>
  );
}

export default App;
