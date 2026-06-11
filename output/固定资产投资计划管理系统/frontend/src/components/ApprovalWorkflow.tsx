// [generated]
import React, { useState, useEffect } from 'react';
import { fetchApprovals } from '../services/api';

interface Approval {
  id: number;
  type: string;
  status: string;
}

const ApprovalWorkflow: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  useEffect(() => {
    fetchApprovals().then(data => setApprovals(data)).catch(console.error);
  }, []);

  return (
    <div className="bg-white rounded shadow p-6">
      <h1 className="text-xl font-bold mb-4">审批流程</h1>
      <ul>
        {approvals.map(a => (
          <li key={a.id} className="border-b py-2">{a.type} - {a.status}</li>
        ))}
      </ul>
    </div>
  );
};

export default ApprovalWorkflow;