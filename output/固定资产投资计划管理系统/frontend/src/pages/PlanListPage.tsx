// [generated]
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface InvestmentPlan {
  id: string;
  name: string;
  status: string;
  totalBudget: number;
  startDate: string;
  endDate: string;
  // TODO: add more fields
}

const PlanListPage = () => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: implement plan list fetching from API
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">投资计划列表</h2>
        <Link
          to="/plans/new"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          新建计划
        </Link>
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Link to={`/plans/${plan.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {plan.name}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {plan.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        预算: ¥{plan.totalBudget?.toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        {plan.startDate} ~ {plan.endDate}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {/* TODO: implement pagination */}
    </div>
  );
};

export default PlanListPage;
