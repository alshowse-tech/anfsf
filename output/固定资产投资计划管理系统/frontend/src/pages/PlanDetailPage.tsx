// [generated]
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface InvestmentPlan {
  id: string;
  name: string;
  description: string;
  status: string;
  totalBudget: number;
  startDate: string;
  endDate: string;
  items: PlanItem[];
  // TODO: add more fields
}

interface PlanItem {
  id: string;
  name: string;
  amount: number;
  category: string;
}

const PlanDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<InvestmentPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: implement plan detail fetching
    setLoading(false);
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!plan) {
    return <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900">计划未找到</h3>
      <button
        onClick={() => navigate('/plans')}
        className="mt-4 text-blue-600 hover:text-blue-800"
      >
        返回计划列表
      </button>
    </div>;
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/plans')}
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          &larr; 返回列表
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
          </div>
          <div className="flex space-x-2">
            {/* TODO: implement edit and delete actions */}
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              编辑
            </button>
            <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
              删除
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            计划详情
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">状态</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {plan.status}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">总预算</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                ¥{plan.totalBudget?.toLocaleString()}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">开始日期</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {plan.startDate}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">结束日期</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {plan.endDate}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          计划项目
        </h3>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {plan.items.map((item) => (
              <li key={item.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-600">{item.name}</p>
                  <p className="text-sm text-gray-500">¥{item.amount?.toLocaleString()}</p>
                </div>
                <p className="text-sm text-gray-500">{item.category}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* TODO: implement item add/edit functionality */}
    </div>
  );
};

export default PlanDetailPage;
