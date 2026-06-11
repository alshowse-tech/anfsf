// [generated]
import React, { useEffect, useState } from 'react';
import { fetchAnnualPlans } from '../services/api';
import type { AnnualPlan } from '../types';

export default function PlanList() {
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: implement data fetching with year filtering
    fetchAnnualPlans().then(setPlans).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8">加载中...</div>;

  // TODO: implement CRUD operations, approval workflow, pagination
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">年度投资计划</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          新增计划
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">年份</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">总预算</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-6 py-4 whitespace-nowrap">{plan.year}</td>
                <td className="px-6 py-4 whitespace-nowrap">{plan.totalBudget}</td>
                <td className="px-6 py-4 whitespace-nowrap">{plan.status}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-blue-600 hover:underline">查看</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
