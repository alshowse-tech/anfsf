// [generated]
import React, { useState, useEffect } from 'react';
import { fetchInvestmentPlans } from '../services/api';

interface InvestmentPlan {
  id: number;
  name: string;
  status: string;
  // TODO: add other fields
}

const InvestmentPlanList: React.FC = () => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  useEffect(() => {
    fetchInvestmentPlans().then(data => setPlans(data)).catch(console.error);
  }, []);

  return (
    <div className="bg-white rounded shadow p-6">
      <h1 className="text-xl font-bold mb-4">投资计划列表</h1>
      <ul>
        {plans.map(plan => (
          <li key={plan.id} className="border-b py-2">
            {plan.name} - {plan.status}
          </li>
        ))}
      </ul>
      {plans.length === 0 && <p className="text-gray-500">暂无数据</p>}
    </div>
  );
};

export default InvestmentPlanList;