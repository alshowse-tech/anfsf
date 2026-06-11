// [generated]
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalPlans: number;
  activePlans: number;
  totalBudget: number;
  // TODO: add more statistics fields
}

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: implement dashboard data fetching
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">仪表盘</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* TODO: implement stat cards */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {/* TODO: add icon */}
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    总计划数
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats?.totalPlans || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    进行中计划
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats?.activePlans || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    总预算
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ¥{stats?.totalBudget?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* TODO: implement charts and recent activities */}
    </div>
  );
};

export default DashboardPage;
